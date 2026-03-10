/**
 * Electron main process entry point.
 * Creates BrowserWindow, registers IPC handlers, manages app lifecycle.
 *
 * Web Speech API requires a "secure context" (HTTPS or localhost).
 * In production Electron loads via file:// which is NOT secure, so we
 * register a custom `app://` scheme as privileged before app is ready.
 */

import { app, BrowserWindow, net, protocol, session } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { registerIpcHandlers } from "./ipc-handlers";

// Register custom scheme BEFORE app is ready — must be synchronous top-level
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: "LiveSub Desktop",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // Load via custom app:// protocol (secure context) instead of file://
    mainWindow.loadURL("app://livesub/index.html");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Serve renderer files from the custom app:// protocol
  const rendererDir = path.join(__dirname, "..", "renderer");
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    const filePath = path.join(rendererDir, url.pathname);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  // Remove any CSP restrictions to allow Web Speech API (connects to Google servers)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...(details.responseHeaders || {}) };
    delete headers["content-security-policy"];
    delete headers["Content-Security-Policy"];
    callback({ responseHeaders: headers });
  });

  // Auto-grant microphone and speech recognition permissions
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "audioCapture"];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ["media", "audioCapture"];
    return allowed.includes(permission);
  });

  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
