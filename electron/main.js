const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('../src/js/store/persistence-node');
const { createCheckoutSession, verifySession } = require('../src/js/shop/stripe-node');

let mainWindow = null;
const store = new Store(path.join(app.getPath('userData'), 'player-save.json'));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0a1628',
    title: 'Arena Ki Fighters',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('store:get', () => store.read());
ipcMain.handle('store:set', (_e, data) => store.write(data));
ipcMain.handle('store:patch', (_e, patch) => store.patch(patch));

ipcMain.handle('shop:checkout', async (_e, productId) => {
  const result = await createCheckoutSession(productId);
  if (result.url) {
    await shell.openExternal(result.url);
  }
  return result;
});

ipcMain.handle('shop:verify', async (_e, sessionId) => {
  return verifySession(sessionId);
});

ipcMain.handle('app:open-external', async (_e, url) => {
  let parsed;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  await shell.openExternal(parsed.toString());
  return true;
});
