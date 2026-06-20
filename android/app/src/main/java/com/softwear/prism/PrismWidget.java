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
 * Home-screen App Widget: shows the now-playing album art + title/artist and
 * prev / play-pause / next controls wired to the active media session. Tapping
 * the body opens Prism. Appears in Samsung's widget picker once installed.
 */
public class PrismWidget extends AppWidgetProvider {

    static final String ACTION_PREV = "com.softwear.prism.WIDGET_PREV";
    static final String ACTION_PLAYPAUSE = "com.softwear.prism.WIDGET_PLAYPAUSE";
    static final String ACTION_NEXT = "com.softwear.prism.WIDGET_NEXT";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (ACTION_PREV.equals(a) || ACTION_PLAYPAUSE.equals(a) || ACTION_NEXT.equals(a)) {
            MediaController c = MediaArt.getActiveController(ctx);
            if (c != null) {
                MediaController.TransportControls tc = c.getTransportControls();
                if (ACTION_PREV.equals(a)) tc.skipToPrevious();
                else if (ACTION_NEXT.equals(a)) tc.skipToNext();
                else if (MediaArt.isPlaying(c)) tc.pause();
                else tc.play();
            }
            requestUpdate(ctx);
        }
    }

    /** Refresh every placed widget (called from the listener on track change). */
    static void requestUpdate(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PrismWidget.class));
        for (int id : ids) updateWidget(ctx, mgr, id);
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
                rv.setImageViewBitmap(R.id.widget_art, MediaArt.roundedThumb(art, 160, 26f));
            } else {
                rv.setImageViewResource(R.id.widget_art, R.drawable.ic_widget_art);
            }
        } else {
            rv.setImageViewResource(R.id.widget_art, R.drawable.ic_widget_art);
        }

        rv.setTextViewText(R.id.widget_line, title);
        rv.setTextViewText(R.id.widget_artist, artist);
        rv.setImageViewResource(
                R.id.widget_play, playing ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play);

        rv.setOnClickPendingIntent(R.id.widget_prev, broadcast(ctx, ACTION_PREV, 1));
        rv.setOnClickPendingIntent(R.id.widget_play, broadcast(ctx, ACTION_PLAYPAUSE, 2));
        rv.setOnClickPendingIntent(R.id.widget_next, broadcast(ctx, ACTION_NEXT, 3));

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) {
            PendingIntent openPi = PendingIntent.getActivity(
                    ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            rv.setOnClickPendingIntent(R.id.widget_art, openPi);
            rv.setOnClickPendingIntent(R.id.widget_line, openPi);
            rv.setOnClickPendingIntent(R.id.widget_artist, openPi);
            rv.setOnClickPendingIntent(R.id.widget_wave, openPi);
            rv.setOnClickPendingIntent(R.id.widget_chip_lyrics, openPi);
            rv.setOnClickPendingIntent(R.id.widget_chip_wall, openPi);
            rv.setOnClickPendingIntent(R.id.widget_chip_lib, openPi);
        }

        mgr.updateAppWidget(id, rv);
    }

    private static PendingIntent broadcast(Context ctx, String action, int rc) {
        Intent i = new Intent(ctx, PrismWidget.class).setAction(action);
        return PendingIntent.getBroadcast(
                ctx, rc, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
