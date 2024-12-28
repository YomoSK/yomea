const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const newTab = document.querySelector('#tabs>svg');
const title = document.getElementById('tab-title');
const searchbar = document.querySelector('#searchbar>input');

function subpayload(payload, length = 20) {
   if(payload.length > length) payload = payload.substring(0, length) + '...';
   return payload;
}

document.addEventListener('DOMContentLoaded', () => {
   localStorage.clear();

   // newTab.addEventListener('click', () => {
   //    console.log('NEW_TAB');
   //    invoke('new_tab');
   // });

   title.addEventListener('auxclick', () => {
      invoke('load_url', { url: '@home' });
   });

   searchbar.addEventListener('keydown', ({ target, key }) => {
      const url = target.value.trim();
      if(key.toUpperCase() == 'ENTER' && url != 'about:blank') {
         target.blur();
         invoke('load_url', {
            //TODO: More complex check
            url: !url.includes('.') ? 'https://google.com/search?q=' + url.replace(/ /g, '+') : url.includes('://') ? url : 'https://' + url
         });
      }
   });

   searchbar.addEventListener('focus', ({ target }) => {
      if(target.value) target.value = localStorage.getItem('origin_url') || target.value;
   });

   searchbar.addEventListener('blur', ({ target }) => {
      target.value = localStorage.getItem('pretty_url') || target.value;
   });
   
   document.querySelector('#controls>svg').addEventListener('click', () => {
      invoke('close');
   });

   window.addEventListener('contextmenu', event => event.preventDefault());
});

listen('title_change', ({ payload }) => {
   if(payload) {
      title.innerText = subpayload(payload);
      title.style.display = null;
   }
   else title.style.display = 'none';
});

listen('url_change', ({ payload }) => {
   let url = payload.endsWith('/') ? payload.substring(0, payload.length - 1) : payload;
   if(url == 'about:blank') url = '';

   const isHTTPS = url.startsWith('https://');

   document.querySelector('#searchbar>svg').style.display = isHTTPS ? 'block' : null;
   searchbar.style.paddingLeft = isHTTPS ? 'calc(2*.4rem + 20px)' : null;

   localStorage.setItem('origin_url', url);
   searchbar.value = (isHTTPS ? url.split('://')[1] : url).replace('www.', '');
   localStorage.setItem('pretty_url', searchbar.value);
});