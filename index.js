const { app, BrowserWindow, WebContentsView, ipcMain } = require('electron');
const path = require('path');
const cheerio = require('cheerio');
const mitt = require('mitt');

const emitter = mitt();

const winSize = { width: 1024, height: 600 };

function createWindow() {
   const win = new BrowserWindow({
      width: winSize.width,
      height: winSize.height,
      title: 'Yomea DEV',
      frame: false,
      center: true,
      movable: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false
      }
   });

   const view = new WebContentsView();
   win.setContentView(view);
   // view.webContents.openDevTools({ mode: 'undocked' });

   const topbar = new BrowserWindow({
      parent: win,
      width: winSize.width,
      height: winSize.height,
      transparent: true,
      frame: false,
      center: true,
      resizable: false,
      vibrancy: 'under-window',
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: true,
         preload: path.join(__dirname, 'preload.js')
      }
   });
   topbar.webContents.loadFile('./public/index.html');
   topbar.setPosition(win.getPosition()[0], win.getPosition()[1]);
   // topbar.webContents.openDevTools({ mode: 'undocked' });

   topbar.on('move', () => {
      win.setPosition(topbar.getPosition()[0], topbar.getPosition()[1]);
   });

   win.on('resize', () => {
      topbar.setSize(...win.getSize());
   });

   ipcMain.on('load-page', (_, url) => {
      console.log(url);
      const newView = new WebContentsView();
      newView.webContents.loadURL(url);
      win.setContentView(newView);
   });

   ipcMain.on('close-app', () => win.close());
   ipcMain.on('max-app', () => win.maximize());
   ipcMain.on('min-app', () => win.minimize());

   topbar.on('close', () => app.quit()); 
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');

app.on('ready', () => createWindow());
app.on('window-all-closed', () => {
   if(process.platform !== 'darwin') app.quit();
});