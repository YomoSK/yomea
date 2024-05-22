const { app, BrowserWindow, WebContentsView, ipcMain } = require('electron');
const path = require('path');
const cheerio = require('cheerio');
const mitt = require('mitt');

const winSize = { width: 1024, height: 600 };

function createWindow() {
   const win = new BrowserWindow({
      width: winSize.width,
      height: winSize.height,
      title: 'Yomea Preview Build',
      frame: false,
      center: true,
      movable: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false
      }
   });
   
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

   const view = new WebContentsView();
   // view.setBounds({ width: winSize.width, height: winSize.height - 57, x: 0, y: 57 });
   view.webContents.loadURL('about:blank');
   view.webContents.on('did-navigate', () => {
      const url = view.webContents.getURL();
      if(url.includes('about:blank')) return;
      topbar.webContents.send('navigate', url);
   });
   win.setContentView(view);
   // view.webContents.openDevTools({ mode: 'undocked' });

   win.on('resize', () => {
      console.log(win.getSize());
      topbar.setSize(...win.getSize());
      console.log(win.getSize());
   });
   
   ipcMain.on('load-page', (_, url) => {
      view.webContents.loadURL(url);
      win.setContentView(view);
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