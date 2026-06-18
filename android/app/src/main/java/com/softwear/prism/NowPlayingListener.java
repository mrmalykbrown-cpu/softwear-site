package com.softwear.prism;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
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
        clearCallbacks();
    }

    @Override
    public void onActiveSessionsChanged(List<MediaController> controllers) {
        clearCallbacks();
        if (controllers == null) return;
        for (final MediaController c : controllers) {
            MediaController.Callback cb = new MediaController.Callback() {
                @Override
                public void onMetadataChanged(MediaMetadata metadata) {
                    maybeApply(c);
                }

                @Override
                public void onPlaybackStateChanged(PlaybackState state) {
                    maybeApply(c);
                }
            };
            c.registerCallback(cb);
            callbacks.put(c, cb);
            maybeApply(c);
        }
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
