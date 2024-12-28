const { invoke } = window.__TAURI__.core;

window.__TAURI__.event.listen('recent_tabs', ({ payload }) => {
   payload = JSON.parse(payload);
   if(payload.length < 3) return;

   payload = payload.filter(({ url, title }) => url.includes('://') && title.replace(/ /g, '').length > 0).reverse().slice(0, 4);
   
   const tabs = document.getElementById('recent-tabs');
   payload.forEach(({ title, url }) => {
      const tab = document.createElement('div');
      tab.innerHTML = `<span>${title}</span>`;
      tab.addEventListener('click', () => invoke('load_url', { url }));
      tabs.appendChild(tab);
   });

   document.getElementById('wrapper').style.display = null;
});

window.addEventListener('DOMContentLoaded', () => {
   setTimeout(() => invoke('get_recent_tabs'), 1000);
});