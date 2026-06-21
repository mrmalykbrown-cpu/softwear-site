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
 * Home-screen App Widget styled as an Apple-Music-style "Recently Played" card:
 * a coral framed panel with large album art, the track title, a live synced
 * lyric line and a frosted Play / Pause pill wired to the active media session.
 */
public class PrismWidget extends AppWidgetProvider {

    static final String ACTION_PLAYPAUSE = "com.softwear.prism.WIDGET_PLAYPAUSE";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (ACTION_PLAYPAUSE.equals(a)) {
            MediaController c = MediaArt.getActiveController(ctx);
            if (c != null) {
                MediaController.TransportControls tc = c.getTransportControls();
                if (MediaArt.isPlaying(c)) tc.pause();
                else tc.play();
                requestUpdate(ctx);
            }
        }
    }

    /** Full refresh (art, text, play state). */
    static void requestUpdate(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (int id : mgr.getAppWidgetIds(new ComponentName(ctx, PrismWidget.class))) {
            updateWidget(ctx, mgr, id);
        }
    }

    /** Light refresh: lyric line + play pill (for the playback loop). */
    static void tickLyric(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PrismWidget.class));
        if (ids.length == 0) return;
        MediaController c = MediaArt.getActiveController(ctx);
        boolean playing = MediaArt.isPlaying(c);
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.prism_widget);
        rv.setTextViewText(R.id.widget_lyric, lyricFor(c));
        rv.setImageViewResource(R.id.widget_play_icon,
                playing ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);
        rv.setTextViewText(R.id.widget_play_label, playing ? "Pause" : "Play");
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
        boolean playing = false;

        MediaController c = MediaArt.getActiveController(ctx);
        if (c != null) {
            String t = MediaArt.titleOf(c);
            if (t != null && !t.isEmpty()) title = t;
            playing = MediaArt.isPlaying(c);
            Bitmap art = MediaArt.extractArt(c.getMetadata());
            if (art != null) {
                rv.setImageViewBitmap(R.id.widget_art, MediaArt.roundedThumb(art, 300, 40f));
            } else {
                rv.setImageViewResource(R.id.widget_art, R.drawable.ic_widget_art);
            }
        } else {
            rv.setImageViewResource(R.id.widget_art, R.drawable.ic_widget_art);
        }

        rv.setTextViewText(R.id.widget_title, title);
        rv.setTextViewText(R.id.widget_lyric, lyricFor(c));
        rv.setImageViewResource(R.id.widget_play_icon,
                playing ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);
        rv.setTextViewText(R.id.widget_play_label, playing ? "Pause" : "Play");

        rv.setOnClickPendingIntent(R.id.widget_play, broadcast(ctx, ACTION_PLAYPAUSE, 2));

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) {
            PendingIntent openPi = PendingIntent.getActivity(
                    ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            // Tapping the card (anywhere but the Play pill) opens the app.
            rv.setOnClickPendingIntent(R.id.widget_root, openPi);
            rv.setOnClickPendingIntent(R.id.widget_art, openPi);
            rv.setOnClickPendingIntent(R.id.widget_title, openPi);
            rv.setOnClickPendingIntent(R.id.widget_lyric, openPi);
        }

        mgr.updateAppWidget(id, rv);
    }

    private static PendingIntent broadcast(Context ctx, String action, int rc) {
        Intent i = new Intent(ctx, PrismWidget.class).setAction(action);
        return PendingIntent.getBroadcast(
                ctx, rc, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
