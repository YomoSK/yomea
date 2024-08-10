const { contextBridge, ipcRenderer } = require('electron/renderer');
const superagent = require('superagent');
const cheerio = require('cheerio');
const { resolve } = require('path');

contextBridge.exposeInMainWorld('electron', {
   loadPage: url => ipcRenderer.send('load-page', url),
   maximize: () => ipcRenderer.send('max-app', {}),
   closeApp: () => ipcRenderer.send('close-app', {}),
   getAppVersion: () => {
      return require('./package.json').version;
   }
});

contextBridge.exposeInMainWorld('webSupplier', {
   getTitle: url => {
      if(url.length == 0) return new Promise((resolve, reject) => resolve(null));
      return new Promise((resolve, reject) => {
         superagent.get(url).then(html => {
            resolve(cheerio.load(html.text)('head>title').text());
         }).catch(reject);
      });
   }
});

contextBridge.exposeInMainWorld('emitter', {
   send: (channel, data) => ipcRenderer.send,
   recieve: (channel, callback) => ipcRenderer.on(channel, (_, ...data) => callback(...data))
});