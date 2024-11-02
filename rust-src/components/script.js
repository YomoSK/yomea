document.addEventListener('DOMContentLoaded', () => {
   window.__TAURI__.core.invoke('get_title').then(title => {
      document.getElementById('tab-title').innerText = title;
   });
});