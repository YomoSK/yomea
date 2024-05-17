const { app, BrowserWindow } = require('electron');
const mitt = require('mitt');

const emitter = mitt();

function createWindow() {
   const win = new BrowserWindow({
      width: 1024,
      height: 600,
      title: 'Yomea DEV',
      frame: false,
      webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         webviewTag: true
      }
   });

   win.loadFile('index.html');
   
   emitter.on('maximize', () => win.maximize());
}

app.on('ready', () => createWindow());
app.on('window-all-closed', () => {
   if(process.platform !== 'darwin') app.quit();
});