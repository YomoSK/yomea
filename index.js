const { app, BrowserWindow, BrowserView, WebContentsView } = require('electron');
const mitt = require('mitt');

const emitter = mitt();

const winSize = { width: 1024, height: 600 };

function createWindow() {
   const win = new BrowserWindow({
      width: winSize.width,
      height: winSize.height,
      title: 'Yomea DEV',
      frame: true,
      center: true,
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         webviewTag: true
      }
   });

   const view = new WebContentsView();
   view.webContents.loadURL('https://google.com');
   win.setContentView(view);

   const topbar = new BrowserWindow({
      parent: win,
      width: winSize.width,
      height: 50,
      transparent: true,
      frame: false,
      center: true,
      movable: false,
      resizable: false
   });
   topbar.webContents.loadFile('./public/index.html');
   topbar.setPosition(...win.getPosition());

   win.on('move', () => {
      topbar.setPosition(...win.getPosition());
   });
   
   emitter.on('maximize', () => win.maximize());
}

app.on('ready', () => createWindow());
app.on('window-all-closed', () => {
   if(process.platform !== 'darwin') app.quit();
});