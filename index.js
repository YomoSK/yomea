const { app, BrowserWindow, WebContentsView, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const historyFile = './history.json';

const winSize = { width: 1024, height: 600 };

function logHistory(url, date = Date.now()) {
   if(!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, '[]');
   fs.readFile(historyFile, (err, data) => {
      const history = JSON.parse(data);
      history.push({ url, date });
      fs.writeFile(historyFile, JSON.stringify(history), err => {
         if(err) console.error(err);
      });
   });
}

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
      },
      icon: './icon.png'
   });
   
   const topbar = new BrowserWindow({
      parent: win,
      width: winSize.width,
      height: winSize.height,
      frame: false,
      transparent: true,
      center: true,
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
   view.webContents.on('did-navigate', () => {
      const url = view.webContents.getURL();
      if(url.includes('about:blank')) return;
      logHistory(url, Date.now() - 1);
      topbar.webContents.send('navigate', url);
   });
   win.setContentView(view);
   const contentBounds = win.getContentBounds();
   contentBounds.y += 57;
   contentBounds.height -= 57;
   // win.setContentBounds(contentBounds);
   // view.webContents.openDevTools({ mode: 'undocked' });

   win.on('resize', () => {
      topbar.setBounds(win.getBounds());
   });
   topbar.on('resize', () => {
      win.setBounds(topbar.getBounds());
   });
   
   ipcMain.on('load-page', (_, url) => {
      logHistory(url, Date.now());
      view.webContents.loadURL(url);
      win.setContentView(view);
   });
   
   ipcMain.on('close-app', () => win.close());
   ipcMain.on('max-app', () => {
      if(win.isMaximized()) {
         win.setMaximumSize(...Object.values(winSize));
         topbar.setMaximumSize(...Object.values(winSize));
      }
      else {
         win.maximize();
         topbar.maximize();
      }
   });
   
   topbar.on('close', () => app.quit()); 
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');

app.on('ready', () => createWindow());
app.on('window-all-closed', () => {
   if(process.platform !== 'darwin') app.quit();
});