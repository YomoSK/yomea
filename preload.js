const { contextBridge, ipcRenderer } = require('electron/renderer');
const cheerio = require('cheerio');

contextBridge.exposeInMainWorld('electron', {
   loadPage: url => ipcRenderer.send('load-page', url),
   scrapURL: url => {
      fetch(url).then(html => {
         console.log(cheerio.load(html));
      })
   },
   closeApp: () => ipcRenderer.send('close-app', {})
});