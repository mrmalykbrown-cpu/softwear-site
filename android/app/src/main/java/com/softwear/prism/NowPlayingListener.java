package com.softwear.prism;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Notification listener whose real job is to (a) unlock access to other apps'
 * media sessions and (b) auto-apply the wallpaper whenever the playing track
 * changes, when the user has enabled "auto update".
 */
public class NowPlayingListener extends NotificationListenerService
        implements MediaSessionManager.OnActiveSessionsChangedListener {

    private MediaSessionManager msm;
    private final Map<MediaController, MediaController.Callback> callbacks = new HashMap<>();
    private String lastKey = null;

    // Drives the widget's live lyric line while music plays.
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            PrismWidget.tickLyric(NowPlayingListener.this);
            if (MediaArt.isPlaying(MediaArt.getActiveController(NowPlayingListener.this))) {
                handler.postDelayed(this, 1200);
            }
        }
    };

    private void syncLoop() {
        handler.removeCallbacks(tick);
        handler.post(tick);
    }

    private void fetchLyrics(MediaController c) {
        if (c == null) return;
        MediaMetadata md = c.getMetadata();
        if (md == null) return;
        Lyrics.fetchAsync(
                this,
                md.getString(MediaMetadata.METADATA_KEY_TITLE),
                md.getString(MediaMetadata.METADATA_KEY_ARTIST),
                md.getLong(MediaMetadata.METADATA_KEY_DURATION));
    }

    @Override
    public void onListenerConnected() {
        msm = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        if (msm == null) return;
        ComponentName cn = new ComponentName(this, NowPlayingListener.class);
        try {
            msm.addOnActiveSessionsChangedListener(this, cn);
            onActiveSessionsChanged(msm.getActiveSessions(cn));
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onListenerDisconnected() {
        if (msm != null) {
            try {
                msm.removeOnActiveSessionsChangedListener(this);
            } catch (Exception ignored) {
            }
        }
        handler.removeCallbacks(tick);
        clearCallbacks();
    }

    @Override
    public void onActiveSessionsChanged(List<MediaController> controllers) {
        clearCallbacks();
        if (controllers == null) {
            PrismWidget.requestUpdate(this);
            return;
        }
        for (final MediaController c : controllers) {
            MediaController.Callback cb = new MediaController.Callback() {
                @Override
                public void onMetadataChanged(MediaMetadata metadata) {
                    maybeApply(c);
                    fetchLyrics(c);
                    PrismWidget.requestUpdate(NowPlayingListener.this);
                    syncLoop();
                }

                @Override
                public void onPlaybackStateChanged(PlaybackState state) {
                    maybeApply(c);
                    PrismWidget.requestUpdate(NowPlayingListener.this);
                    syncLoop();
                }
            };
            c.registerCallback(cb);
            callbacks.put(c, cb);
            maybeApply(c);
        }
        PrismWidget.requestUpdate(this);
        fetchLyrics(MediaArt.getActiveController(this));
        syncLoop();
    }

    private void maybeApply(MediaController c) {
        SharedPreferences sp = getSharedPreferences("prism", MODE_PRIVATE);
        if (!sp.getBoolean("autoApply", false)) return;

        PlaybackState ps = c.getPlaybackState();
        if (ps == null || ps.getState() != PlaybackState.STATE_PLAYING) return;

        MediaMetadata md = c.getMetadata();
        Bitmap art = MediaArt.extractArt(md);
        if (art == null) return;

        String title = md != null ? md.getString(MediaMetadata.METADATA_KEY_TITLE) : "";
        String key = c.getPackageName() + "|" + title;
        if (key.equals(lastKey)) return; // already applied for this track
        lastKey = key;

        try {
            MediaArt.applyWallpaper(this, art, sp.getString("autoTarget", "both"));
        } catch (Exception ignored) {
        }
    }

    private void clearCallbacks() {
        for (Map.Entry<MediaController, MediaController.Callback> e : callbacks.entrySet()) {
            try {
                e.getKey().unregisterCallback(e.getValue());
            } catch (Exception ignored) {
            }
        }
        callbacks.clear();
    }
}
