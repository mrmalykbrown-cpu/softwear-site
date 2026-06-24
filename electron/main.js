// Prism for Windows — Electron main process.
//
// Reuses the Next.js renderer (static export in ./out) as the desktop UI and
// bridges it to Windows via PowerShell:
//   • now playing  -> Windows System Media Transport Controls (SMTC)
//   • wallpaper    -> SystemParametersInfo(SPI_SETDESKWALLPAPER)
//   • media keys   -> SMTC TryTogglePlayPause / SkipNext / SkipPrevious / Seek
//
// No native node modules are required — everything goes through powershell.exe,
// which ships on every Windows 10/11 machine.

const { app, BrowserWindow, ipcMain, Tray, Menu, shell, nativeImage } = require("electron");
const { execFile } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const isPackaged = app.isPackaged;
const APP_DIR = app.getAppPath(); // asar root in production, project dir in dev
const OUT_DIR = path.join(APP_DIR, "out"); // Next static export
const SCRIPT_DIR = __dirname; // electron/

let mainWindow = null;
let tray = null;
let server = null;
let serverPort = 0;

// cached SMTC snapshot so the renderer's frequent polling is cheap (no spawn)
let lastPlayback = { access: false, playing: false, position: 0, duration: 0 };
let pollTimer = null;
let lastArtTitle = ""; // for auto-apply change detection

// ---------------------------------------------------------------- config store
const CONFIG_PATH = path.join(app.getPath("userData"), "prism-config.json");
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { autoApply: false, target: "both" };
  }
}
function writeConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}
let config = readConfig();

// ------------------------------------------------------------- powershell glue
// Run a .ps1 (read from disk so it works inside asar) with a few prepended
// variables, via -EncodedCommand to dodge any path/quoting issues.
function runPs(scriptName, vars = {}) {
  return new Promise((resolve) => {
    let body;
    try {
      body = fs.readFileSync(path.join(SCRIPT_DIR, scriptName), "utf8");
    } catch (e) {
      return resolve({ error: String(e), stdout: "" });
    }
    const header =
      Object.entries(vars)
        .map(([k, v]) => `$${k} = '${String(v).replace(/'/g, "''")}'`)
        .join("\n") + "\n";
    const full = "$ErrorActionPreference='Stop'\n" + header + body;
    const enc = Buffer.from(full, "utf16le").toString("base64");
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc],
      { maxBuffer: 24 * 1024 * 1024, windowsHide: true, timeout: 9000 },
      (error, stdout) => resolve({ error, stdout: stdout || "" })
    );
  });
}

async function fetchPlayback() {
  const { stdout } = await runPs("smtc.ps1");
  const text = (stdout || "").trim();
  if (!text) return { access: false, playing: false, position: 0, duration: 0 };
  try {
    const j = JSON.parse(text);
    return {
      access: true,
      playing: !!j.playing,
      position: Number(j.position) || 0,
      duration: Number(j.duration) || 0,
      app: j.app || undefined,
      title: j.title || null,
      artist: j.artist || null,
      hasArt: !!j.art,
      art: j.art || undefined,
    };
  } catch {
    return { access: false, playing: false, position: 0, duration: 0 };
  }
}

// Write a data: URI (or raw base64) to a temp PNG and return its path.
function dataUriToTempFile(data) {
  const b64 = String(data).replace(/^data:image\/\w+;base64,/, "");
  const file = path.join(os.tmpdir(), `prism-wallpaper-${Date.now()}.png`);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return file;
}

async function setWallpaperFromData(data) {
  if (!data) return { applied: false, target: config.target };
  const file = dataUriToTempFile(data);
  const { error } = await runPs("wallpaper.ps1", { Path: file });
  return { applied: !error, target: config.target };
}

// --------------------------------------------------------------- SMTC polling
function startPolling() {
  if (pollTimer) return;
  const tick = async () => {
    lastPlayback = await fetchPlayback();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("prism:playback", lastPlayback);
    }
    // auto-apply wallpaper on track change
    if (config.autoApply && lastPlayback.art && lastPlayback.title && lastPlayback.title !== lastArtTitle) {
      lastArtTitle = lastPlayback.title;
      setWallpaperFromData(lastPlayback.art);
    }
    pollTimer = setTimeout(tick, 1000);
  };
  tick();
}
function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}

// ------------------------------------------------------------- static server
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain",
};
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/" || urlPath === "") urlPath = "/index.html";
      let file = path.join(OUT_DIR, urlPath);
      if (!file.startsWith(OUT_DIR)) {
        res.statusCode = 403;
        return res.end("forbidden");
      }
      // Next static export: directories and clean URLs -> .html
      const tryFiles = [file];
      if (!path.extname(file)) {
        tryFiles.push(file + ".html", path.join(file, "index.html"));
      }
      const found = tryFiles.find((f) => {
        try {
          return fs.statSync(f).isFile();
        } catch {
          return false;
        }
      });
      if (!found) {
        res.statusCode = 404;
        return res.end("not found");
      }
      res.setHeader("Content-Type", MIME[path.extname(found)] || "application/octet-stream");
      fs.createReadStream(found).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      serverPort = server.address().port;
      resolve(serverPort);
    });
  });
}

// ---------------------------------------------------------------- IPC handlers
function registerIpc() {
  ipcMain.handle("prism:getPlayback", () => lastPlayback);
  ipcMain.handle("prism:getNowPlaying", () => ({
    access: lastPlayback.access,
    playing: lastPlayback.playing,
    app: lastPlayback.app,
    title: lastPlayback.title,
    artist: lastPlayback.artist,
    hasArt: lastPlayback.hasArt,
    art: lastPlayback.art,
  }));
  ipcMain.handle("prism:mediaControl", async (_e, opts) => {
    await runPs("control.ps1", { Action: (opts && opts.action) || "playpause" });
    lastPlayback = await fetchPlayback();
    return;
  });
  ipcMain.handle("prism:seekTo", async (_e, opts) => {
    await runPs("control.ps1", { Action: "seek", Position: (opts && opts.position) || 0 });
    return;
  });
  ipcMain.handle("prism:setWallpaper", async (_e, opts) => setWallpaperFromData(opts && opts.data));
  ipcMain.handle("prism:applyWallpaper", async (_e, opts) => {
    if (opts && opts.target) {
      config.target = opts.target;
      writeConfig(config);
    }
    return setWallpaperFromData(lastPlayback.art);
  });
  ipcMain.handle("prism:getAutoApply", () => ({ enabled: !!config.autoApply, target: config.target || "both" }));
  ipcMain.handle("prism:setAutoApply", (_e, opts) => {
    config.autoApply = !!(opts && opts.enabled);
    if (opts && opts.target) config.target = opts.target;
    writeConfig(config);
    return { enabled: config.autoApply, target: config.target };
  });
  ipcMain.on("prism:win", (_e, cmd) => {
    if (!mainWindow) return;
    if (cmd === "min") mainWindow.minimize();
    else if (cmd === "max") mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    else if (cmd === "close") mainWindow.hide(); // hide to tray
  });
}

// ----------------------------------------------------------------- windows/tray
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 900,
    minWidth: 380,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: "#000000",
    title: "Prism",
    icon: path.join(SCRIPT_DIR, "icon.png"),
    webPreferences: {
      preload: path.join(SCRIPT_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  // open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function createTray() {
  const img = nativeImage.createFromPath(path.join(SCRIPT_DIR, "tray.png"));
  tray = new Tray(img);
  tray.setToolTip("Prism");
  const menu = Menu.buildFromTemplate([
    { label: "Show Prism", click: () => mainWindow && mainWindow.show() },
    {
      label: "Set wallpaper from current art",
      click: () => setWallpaperFromData(lastPlayback.art),
    },
    {
      label: "Auto-update wallpaper on song change",
      type: "checkbox",
      checked: !!config.autoApply,
      click: (item) => {
        config.autoApply = item.checked;
        writeConfig(config);
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => mainWindow && (mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show()));
}

// --------------------------------------------------------------------- bootstrap
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await startServer();
    registerIpc();
    createWindow();
    createTray();
    startPolling();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    // stay alive in the tray on Windows; quit only on explicit Quit
  });
  app.on("before-quit", () => {
    app.isQuitting = true;
    stopPolling();
    if (server) server.close();
  });
}
