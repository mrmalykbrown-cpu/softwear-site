package com.softwear.prism;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.media.session.MediaController;
import android.widget.RemoteViews;

/**
 * Home-screen App Widget mirroring the in-app glass widget: album art,
 * title/artist, a live synced lyric line, an interactive (tap-to-seek) waveform,
 * and prev / play-pause / next wired to the active media session.
 */
public class PrismWidget extends AppWidgetProvider {

    static final String ACTION_PREV = "com.softwear.prism.WIDGET_PREV";
    static final String ACTION_PLAYPAUSE = "com.softwear.prism.WIDGET_PLAYPAUSE";
    static final String ACTION_NEXT = "com.softwear.prism.WIDGET_NEXT";
    static final String ACTION_SEEK = "com.softwear.prism.WIDGET_SEEK";
    static final String EXTRA_FRAC = "frac";

    private static final int[] SEG_IDS = {
            R.id.seg0, R.id.seg1, R.id.seg2, R.id.seg3, R.id.seg4, R.id.seg5,
            R.id.seg6, R.id.seg7, R.id.seg8, R.id.seg9, R.id.seg10, R.id.seg11
    };

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (a == null) return;
        MediaController c = MediaArt.getActiveController(ctx);
        if (c != null) {
            MediaController.TransportControls tc = c.getTransportControls();
            switch (a) {
                case ACTION_PREV:
                    tc.skipToPrevious();
                    break;
                case ACTION_NEXT:
                    tc.skipToNext();
                    break;
                case ACTION_PLAYPAUSE:
                    if (MediaArt.isPlaying(c)) tc.pause();
                    else tc.play();
                    break;
                case ACTION_SEEK:
                    long dur = MediaArt.durationMs(c);
                    float frac = intent.getFloatExtra(EXTRA_FRAC, 0f);
                    if (dur > 0) tc.seekTo((long) (frac * dur));
                    break;
                default:
                    return;
            }
            requestUpdate(ctx);
        }
    }

    /** Full refresh (art, text, controls). */
    static void requestUpdate(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (int id : mgr.getAppWidgetIds(new ComponentName(ctx, PrismWidget.class))) {
            updateWidget(ctx, mgr, id);
        }
    }

    /** Light refresh: only the lyric line + play glyph (for the playback loop). */
    static void tickLyric(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PrismWidget.class));
        if (ids.length == 0) return;
        MediaController c = MediaArt.getActiveController(ctx);
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.prism_widget);
        rv.setTextViewText(R.id.widget_lyric, lyricFor(c));
        rv.setImageViewResource(R.id.widget_play,
                MediaArt.isPlaying(c) ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);
        for (int id : ids) mgr.partiallyUpdateAppWidget(id, rv);
    }

    private static String lyricFor(MediaController c) {
        if (c != null) {
            String l = Lyrics.currentLine(MediaArt.positionMs(c));
            if (l != null) return l;
        }
        return "♪";
    }

    private static void updateWidget(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.prism_widget);

        String title = "Prism";
        String artist = "Tap to open";
        boolean playing = false;

        MediaController c = MediaArt.getActiveController(ctx);
        if (c != null) {
            String t = MediaArt.titleOf(c);
            String ar = MediaArt.artistOf(c);
            if (t != null && !t.isEmpty()) title = t;
            artist = ar != null ? ar : "";
            playing = MediaArt.isPlaying(c);
            Bitmap art = MediaArt.extractArt(c.getMetadata());
            if (art != null) {
                rv.setImageViewBitmap(R.id.widget_art, MediaArt.roundedThumb(art, 160, 24f));
            } else {
                rv.setImageViewResource(R.id.widget_art, R.drawable.ic_widget_art);
            }
        } else {
            rv.setImageViewResource(R.id.widget_art, R.drawable.ic_widget_art);
        }

        rv.setTextViewText(R.id.widget_title, title);
        rv.setTextViewText(R.id.widget_artist, artist);
        rv.setTextViewText(R.id.widget_lyric, lyricFor(c));
        rv.setImageViewResource(R.id.widget_play,
                playing ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);

        rv.setOnClickPendingIntent(R.id.widget_prev, broadcast(ctx, ACTION_PREV, 1, -1));
        rv.setOnClickPendingIntent(R.id.widget_play, broadcast(ctx, ACTION_PLAYPAUSE, 2, -1));
        rv.setOnClickPendingIntent(R.id.widget_next, broadcast(ctx, ACTION_NEXT, 3, -1));

        // interactive waveform: each segment seeks to its position
        for (int i = 0; i < SEG_IDS.length; i++) {
            float frac = (i + 0.5f) / SEG_IDS.length;
            rv.setOnClickPendingIntent(SEG_IDS[i], broadcast(ctx, ACTION_SEEK, 10 + i, frac));
        }

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) {
            PendingIntent openPi = PendingIntent.getActivity(
                    ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            rv.setOnClickPendingIntent(R.id.widget_art, openPi);
            rv.setOnClickPendingIntent(R.id.widget_title, openPi);
            rv.setOnClickPendingIntent(R.id.widget_artist, openPi);
            rv.setOnClickPendingIntent(R.id.widget_lyric, openPi);
        }

        mgr.updateAppWidget(id, rv);
    }

    private static PendingIntent broadcast(Context ctx, String action, int rc, float frac) {
        Intent i = new Intent(ctx, PrismWidget.class).setAction(action);
        if (frac >= 0) i.putExtra(EXTRA_FRAC, frac);
        return PendingIntent.getBroadcast(
                ctx, rc, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
