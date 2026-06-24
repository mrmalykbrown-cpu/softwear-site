# Prism for Windows (Electron)

The desktop edition of Prism. It reuses the same Next.js UI as the Android app
(album-art wallpaper, real-time synced lyrics, the liquid-glass Now Playing
widget, voice control, day/night themes) and wires it to Windows:

| Feature | Windows API used |
|---|---|
| Now playing (title / artist / art / position) | **SMTC** — `GlobalSystemMediaTransportControlsSessionManager` |
| Play / Pause / Next / Previous / Seek | SMTC `TryTogglePlayPause` / `TrySkipNext` / `TrySkipPrevious` / `TryChangePlaybackPosition` |
| Set desktop wallpaper from the album art | `SystemParametersInfo(SPI_SETDESKWALLPAPER)` |

It works with anything that publishes media info to Windows — **Spotify**, the
**Apple Music** app, browsers (YouTube/▶), Groove, etc. No native node modules
are compiled: the three integrations run through `powershell.exe`, which ships
with every Windows 10/11 install.

## Requirements

- Windows 10 (1809+) or Windows 11
- [Node.js](https://nodejs.org) LTS (18 or newer)

## Run it (development)

```bash
npm install
npm run electron:dev      # builds the web UI, then launches the desktop app
```

`npm run electron` launches without rebuilding (use after a `npm run build`).

## Build an installer (.exe)

```bash
npm run dist:win
```

Output lands in `dist-win/`:

- `Prism Setup <version>.exe` — NSIS installer (desktop shortcut, choose folder)
- `Prism <version>.exe` — portable single-file build

> Building the Windows installer must be done **on Windows** (or a Windows CI
> runner). electron-builder downloads the Windows Electron binaries the first
> time you run `dist:win`.

## How it behaves

- The app window is the full Prism lock-screen UI (frameless; drag the top
  strip, minimize/close at the top-right — closing hides it to the tray).
- A **tray icon** gives quick actions: Show Prism, *Set wallpaper from current
  art*, *Auto-update wallpaper on song change*, and Quit.
- Open **Wallpaper** in the app to set your desktop wallpaper to the current
  cover, or enable **Auto-update** so it follows whatever you're playing.
- Lyrics are fetched from LRCLIB and synced to the SMTC playback position, just
  like on Android.

## Notes / limitations

- Prism sets a **static** desktop wallpaper from the album art (updated on track
  change). A live, animated wallpaper *behind* the desktop icons isn't done here
  — that requires Windows `WorkerW` window injection and is intentionally out of
  scope. The animated art lives in the app window.
- Voice control uses the browser Web Speech API, which generally isn't wired up
  inside Electron, so on Windows treat the voice overlay as a bonus rather than
  a guaranteed feature.
- Files: `electron/main.js` (app + IPC + tray), `electron/preload.js`
  (`window.prism` bridge), `electron/smtc.ps1` / `control.ps1` / `wallpaper.ps1`
  (the Windows integrations).
