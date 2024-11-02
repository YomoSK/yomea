const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const title = document.getElementById('tab-title');
const searchbar = document.getElementById('searchbar');

document.addEventListener('DOMContentLoaded', () => {
   invoke('get_title').then(t => {
      title.innerText = t;
      if(t) title.style.display = null;
   });

   searchbar.addEventListener('keydown', ({ target, key }) => {
      const url = target.value.trim();
      if(key.toUpperCase() == 'ENTER' && url != 'about:blank') invoke('load_url', { url });
   });
   
   document.querySelector('#controls>svg').addEventListener('click', () => invoke('close'));

   window.addEventListener('contextmenu', event => event.preventDefault());
});

listen('title_change', ({ payload }) => {
   if(payload) {
      title.innerText = payload;
      title.style.display = null;
   }
   else title.style.display = 'none';
});

listen('url_change', ({ payload }) => {
   const url = payload.endsWith('/') ? payload.substring(0, payload.length - 1) : payload;
   if(payload && url != 'about:blank') searchbar.value = url;
});