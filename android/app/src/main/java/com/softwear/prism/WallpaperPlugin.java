package com.softwear.prism;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.session.MediaController;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * JS bridge: read the now-playing cover from Spotify/Apple Music and set it as
 * the device wallpaper (lock / home / both).
 */
@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    @PluginMethod
    public void hasNotificationAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", MediaArt.hasNotificationAccess(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationAccess(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getNowPlaying(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        if (!MediaArt.hasNotificationAccess(ctx)) {
            ret.put("access", false);
            ret.put("playing", false);
            call.resolve(ret);
            return;
        }
        ret.put("access", true);
        MediaController c = MediaArt.getActiveController(ctx);
        if (c == null) {
            ret.put("playing", false);
            call.resolve(ret);
            return;
        }
        Bitmap art = MediaArt.extractArt(c.getMetadata());
        ret.put("playing", true);
        ret.put("app", c.getPackageName());
        ret.put("title", MediaArt.titleOf(c));
        ret.put("artist", MediaArt.artistOf(c));
        ret.put("hasArt", art != null);
        if (art != null) ret.put("art", MediaArt.toDataUri(art, 320));
        call.resolve(ret);
    }

    @PluginMethod
    public void applyWallpaper(PluginCall call) {
        Context ctx = getContext();
        String target = call.getString("target", "both");
        if (!MediaArt.hasNotificationAccess(ctx)) {
            call.reject("NO_ACCESS");
            return;
        }
        MediaController c = MediaArt.getActiveController(ctx);
        Bitmap art = c != null ? MediaArt.extractArt(c.getMetadata()) : null;
        if (art == null) {
            call.reject("NO_ART");
            return;
        }
        try {
            MediaArt.applyWallpaper(ctx, art, target);
            JSObject ret = new JSObject();
            ret.put("applied", true);
            ret.put("target", target);
            ret.put("title", MediaArt.titleOf(c));
            ret.put("app", c.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("APPLY_FAILED", e);
        }
    }

    @PluginMethod
    public void setWallpaperFromBase64(PluginCall call) {
        String data = call.getString("data");
        String target = call.getString("target", "both");
        if (data == null || data.isEmpty()) {
            call.reject("NO_DATA");
            return;
        }
        try {
            int comma = data.indexOf(',');
            if (data.startsWith("data:") && comma >= 0) data = data.substring(comma + 1);
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bmp == null) {
                call.reject("BAD_IMAGE");
                return;
            }
            MediaArt.applyWallpaper(getContext(), bmp, target);
            JSObject ret = new JSObject();
            ret.put("applied", true);
            ret.put("target", target);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("APPLY_FAILED", e);
        }
    }

    @PluginMethod
    public void setAutoApply(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        String target = call.getString("target", "both");
        SharedPreferences sp = getContext().getSharedPreferences("prism", Context.MODE_PRIVATE);
        sp.edit().putBoolean("autoApply", enabled).putString("autoTarget", target).apply();
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("target", target);
        call.resolve(ret);
    }

    @PluginMethod
    public void getAutoApply(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences("prism", Context.MODE_PRIVATE);
        JSObject ret = new JSObject();
        ret.put("enabled", sp.getBoolean("autoApply", false));
        ret.put("target", sp.getString("autoTarget", "both"));
        call.resolve(ret);
    }
}
