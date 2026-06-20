package com.softwear.prism;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Time-synced lyrics for the home-screen widget. Fetches LRC from LRCLIB on a
 * background thread (cached per track) and resolves the current line by the
 * media session's playback position.
 */
public class Lyrics {

    private static volatile String key = "";
    private static volatile long[] times = new long[0];
    private static volatile String[] texts = new String[0];

    private static final Pattern TAG =
            Pattern.compile("\\[(\\d{1,2}):(\\d{2})(?:[.:](\\d{1,3}))?\\]");

    /** Fetch lyrics for a track (no-op if already loaded/loading). */
    public static void fetchAsync(final Context ctx, final String title, final String artist,
                                  final long durationMs) {
        if (title == null || title.isEmpty()) return;
        final String k = title + "|" + artist;
        if (k.equals(key)) return;
        key = k;
        times = new long[0];
        texts = new String[0];
        new Thread(() -> {
            try {
                String lrc = fetch(title, artist == null ? "" : artist, durationMs / 1000);
                if (lrc != null) parse(lrc);
            } catch (Exception ignored) {
            }
            PrismWidget.requestUpdate(ctx);
        }).start();
    }

    /** The lyric line that should be showing at this position, or null. */
    public static String currentLine(long posMs) {
        long[] t = times;
        String[] x = texts;
        if (t.length == 0) return null;
        int idx = -1;
        for (int i = 0; i < t.length; i++) {
            if (t[i] <= posMs + 200) idx = i;
            else break;
        }
        return idx >= 0 ? x[idx] : null;
    }

    public static boolean hasLyrics() {
        return times.length > 0;
    }

    // --- internals ----------------------------------------------------------

    private static String fetch(String title, String artist, long durSec) throws Exception {
        String base = "https://lrclib.net/api/get?track_name=" + enc(clean(title))
                + "&artist_name=" + enc(clean(artist))
                + (durSec > 0 ? "&duration=" + durSec : "");
        String body = get(base);
        if (body != null) {
            String s = new JSONObject(body).optString("syncedLyrics", "");
            if (!s.isEmpty()) return s;
        }
        // fuzzy fallback
        String search = get("https://lrclib.net/api/search?q="
                + enc(clean(title) + " " + clean(artist)));
        if (search != null) {
            JSONArray arr = new JSONArray(search);
            for (int i = 0; i < arr.length(); i++) {
                String s = arr.getJSONObject(i).optString("syncedLyrics", "");
                if (!s.isEmpty()) return s;
            }
        }
        return null;
    }

    private static String get(String urlStr) {
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(urlStr).openConnection();
            con.setConnectTimeout(6000);
            con.setReadTimeout(6000);
            con.setRequestProperty("User-Agent", "Prism/1.0 (music wallpaper app)");
            if (con.getResponseCode() != 200) return null;
            StringBuilder sb = new StringBuilder();
            BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"));
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
            r.close();
            return sb.toString();
        } catch (Exception e) {
            return null;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    private static void parse(String lrc) {
        ArrayList<Long> tt = new ArrayList<>();
        ArrayList<String> xx = new ArrayList<>();
        for (String line : lrc.split("\n")) {
            String text = TAG.matcher(line).replaceAll("").trim();
            if (text.isEmpty()) continue;
            Matcher m = TAG.matcher(line);
            while (m.find()) {
                int mn = Integer.parseInt(m.group(1));
                int se = Integer.parseInt(m.group(2));
                int fr = m.group(3) != null
                        ? Integer.parseInt((m.group(3) + "00").substring(0, 3)) : 0;
                tt.add(mn * 60000L + se * 1000L + fr);
                xx.add(text);
            }
        }
        // sort the parallel lists by time
        Integer[] order = new Integer[tt.size()];
        for (int i = 0; i < order.length; i++) order[i] = i;
        java.util.Arrays.sort(order, (a, b) -> Long.compare(tt.get(a), tt.get(b)));
        long[] nt = new long[order.length];
        String[] nx = new String[order.length];
        for (int i = 0; i < order.length; i++) {
            nt[i] = tt.get(order[i]);
            nx[i] = xx.get(order[i]);
        }
        times = nt;
        texts = nx;
    }

    private static String clean(String s) {
        return s == null ? "" : s.replaceAll("\\s*[\\(\\[].*?[\\)\\]]\\s*", " ").trim();
    }

    private static String enc(String s) throws Exception {
        return URLEncoder.encode(s, "UTF-8");
    }
}
