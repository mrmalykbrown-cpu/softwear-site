package com.softwear.prism;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Reads the currently playing track's album art from any media app
 * (Spotify, Apple Music, ...) via the system MediaSession, and renders /
 * applies it as a device wallpaper.
 *
 * Requires the app to be granted Notification access, which is what lets
 * Android expose other apps' active media sessions to us.
 */
public class MediaArt {

    /** Is our NotificationListenerService enabled in Settings? */
    public static boolean hasNotificationAccess(Context ctx) {
        String flat = Settings.Secure.getString(
                ctx.getContentResolver(), "enabled_notification_listeners");
        if (flat == null || flat.isEmpty()) return false;
        String pkg = ctx.getPackageName();
        for (String name : flat.split(":")) {
            ComponentName cn = ComponentName.unflattenFromString(name);
            if (cn != null && pkg.equals(cn.getPackageName())) return true;
        }
        return false;
    }

    /** Pick the most relevant media session (prefer one that is playing + has art). */
    public static MediaController getActiveController(Context ctx) {
        try {
            MediaSessionManager msm = (MediaSessionManager)
                    ctx.getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (msm == null) return null;
            ComponentName cn = new ComponentName(ctx, NowPlayingListener.class);
            List<MediaController> controllers = msm.getActiveSessions(cn);
            if (controllers == null || controllers.isEmpty()) return null;

            MediaController playing = null;
            MediaController withArt = null;
            for (MediaController c : controllers) {
                boolean hasArt = extractArt(c.getMetadata()) != null;
                PlaybackState ps = c.getPlaybackState();
                boolean isPlaying = ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
                if (isPlaying && hasArt) return c;
                if (isPlaying && playing == null) playing = c;
                if (hasArt && withArt == null) withArt = c;
            }
            if (playing != null) return playing;
            if (withArt != null) return withArt;
            return controllers.get(0);
        } catch (SecurityException e) {
            return null; // notification access not granted
        } catch (Exception e) {
            return null;
        }
    }

    /** Try every metadata key a player might use for the cover bitmap. */
    public static Bitmap extractArt(MediaMetadata md) {
        if (md == null) return null;
        String[] keys = {
                MediaMetadata.METADATA_KEY_ALBUM_ART,
                MediaMetadata.METADATA_KEY_ART,
                MediaMetadata.METADATA_KEY_DISPLAY_ICON
        };
        for (String k : keys) {
            Bitmap b = md.getBitmap(k);
            if (b != null) return b;
        }
        return null;
    }

    public static String titleOf(MediaController c) {
        MediaMetadata md = c == null ? null : c.getMetadata();
        return md == null ? null : md.getString(MediaMetadata.METADATA_KEY_TITLE);
    }

    public static String artistOf(MediaController c) {
        MediaMetadata md = c == null ? null : c.getMetadata();
        return md == null ? null : md.getString(MediaMetadata.METADATA_KEY_ARTIST);
    }

    public static boolean isPlaying(MediaController c) {
        PlaybackState ps = c == null ? null : c.getPlaybackState();
        return ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
    }

    /** Current playback position in ms, extrapolated for smooth lyric sync. */
    public static long positionMs(MediaController c) {
        PlaybackState ps = c == null ? null : c.getPlaybackState();
        if (ps == null) return 0;
        long pos = ps.getPosition();
        if (ps.getState() == PlaybackState.STATE_PLAYING) {
            long delta = SystemClock.elapsedRealtime() - ps.getLastPositionUpdateTime();
            pos += (long) (delta * ps.getPlaybackSpeed());
        }
        return Math.max(0, pos);
    }

    public static long durationMs(MediaController c) {
        MediaMetadata md = c == null ? null : c.getMetadata();
        return md == null ? 0 : md.getLong(MediaMetadata.METADATA_KEY_DURATION);
    }

    /** Compose a full-screen wallpaper: album art filling the entire screen. */
    public static Bitmap buildWallpaper(Context ctx, Bitmap art) {
        int[] wh = screenSize(ctx);
        int w = wh[0], h = wh[1];
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);

        // Album art fills the whole screen, edge to edge (center-crop cover).
        drawCover(canvas, art, w, h, paint);

        // Subtle top + bottom scrims so status bar / clock stay legible.
        Paint topScrim = new Paint();
        topScrim.setShader(new LinearGradient(0, 0, 0, h * 0.22f,
                Color.argb(90, 0, 0, 0), Color.TRANSPARENT, Shader.TileMode.CLAMP));
        canvas.drawRect(0, 0, w, h * 0.22f, topScrim);

        Paint bottomScrim = new Paint();
        bottomScrim.setShader(new LinearGradient(0, h * 0.6f, 0, h,
                Color.TRANSPARENT, Color.argb(120, 0, 0, 0), Shader.TileMode.CLAMP));
        canvas.drawRect(0, h * 0.6f, w, h, bottomScrim);

        return out;
    }

    /** Square, scaled, rounded thumbnail for the home-screen widget. */
    public static Bitmap roundedThumb(Bitmap art, int size, float radius) {
        Bitmap sq = centerCropSquare(art);
        Bitmap scaled = Bitmap.createScaledBitmap(sq, size, size, true);
        return roundCorners(scaled, radius);
    }

    /** Apply a bitmap as wallpaper. target: "home" | "lock" | "both". */
    public static void applyWallpaper(Context ctx, Bitmap art, String target) throws Exception {
        Bitmap wp = buildWallpaper(ctx, art);
        WallpaperManager wm = WallpaperManager.getInstance(ctx);
        if (Build.VERSION.SDK_INT >= 24) {
            int flags;
            if ("home".equals(target)) flags = WallpaperManager.FLAG_SYSTEM;
            else if ("lock".equals(target)) flags = WallpaperManager.FLAG_LOCK;
            else flags = WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK;
            wm.setBitmap(wp, null, true, flags);
        } else {
            wm.setBitmap(wp);
        }
    }

    /** Small JPEG data-URI for previewing art in the web UI. */
    public static String toDataUri(Bitmap art, int maxDim) {
        int w = art.getWidth(), h = art.getHeight();
        float scale = Math.min(1f, (float) maxDim / Math.max(w, h));
        Bitmap small = Bitmap.createScaledBitmap(
                art, Math.max(1, (int) (w * scale)), Math.max(1, (int) (h * scale)), true);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        small.compress(Bitmap.CompressFormat.JPEG, 85, bos);
        return "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
    }

    // --- helpers ------------------------------------------------------------

    private static int[] screenSize(Context ctx) {
        DisplayMetrics dm = new DisplayMetrics();
        WindowManager wmgr = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
        if (wmgr != null) {
            wmgr.getDefaultDisplay().getRealMetrics(dm);
            if (dm.widthPixels > 0 && dm.heightPixels > 0) {
                return new int[]{dm.widthPixels, dm.heightPixels};
            }
        }
        return new int[]{1080, 2340};
    }

    private static void drawCover(Canvas canvas, Bitmap src, int w, int h, Paint paint) {
        float scale = Math.max((float) w / src.getWidth(), (float) h / src.getHeight());
        float dw = src.getWidth() * scale, dh = src.getHeight() * scale;
        float left = (w - dw) / 2f, top = (h - dh) / 2f;
        canvas.drawBitmap(src, null, new RectF(left, top, left + dw, top + dh), paint);
    }

    private static Bitmap centerCropSquare(Bitmap src) {
        int size = Math.min(src.getWidth(), src.getHeight());
        int x = (src.getWidth() - size) / 2, y = (src.getHeight() - size) / 2;
        return Bitmap.createBitmap(src, x, y, size, size);
    }

    private static Bitmap roundCorners(Bitmap src, float radius) {
        Bitmap out = Bitmap.createBitmap(src.getWidth(), src.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(out);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new BitmapShader(src, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
        c.drawRoundRect(new RectF(0, 0, src.getWidth(), src.getHeight()), radius, radius, p);
        return out;
    }
}
