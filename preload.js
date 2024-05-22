const { contextBridge, ipcRenderer } = require('electron/renderer');
const superagent = require('superagent');
const cheerio = require('cheerio');
const mitt = require('mitt');

contextBridge.exposeInMainWorld('electron', {
   loadPage: url => ipcRenderer.send('load-page', url),
   scrapURL: url => {
      fetch(url).then(html => {
         console.log(cheerio.load(html));
      });
   },
   closeApp: () => ipcRenderer.send('close-app', {})
});

contextBridge.exposeInMainWorld('webSupplier', {
   getTitle: url => {
      return new Promise((resolve, reject) => {
         superagent.get(url).then(html => {
            resolve(cheerio.load(html.text)('title').text());
         }).catch(reject);
      });
   }
});

contextBridge.exposeInMainWorld('emitter', {
   send: (channel, data) => ipcRenderer.send,
   recieve: (channel, callback) => ipcRenderer.on(channel, (_, ...data) => callback(...data))
});