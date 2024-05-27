tippy.setDefaultProps({
   allowHTML: true,
   placement: 'bottom-start',
   appendTo: () => document.querySelector('#root')
});

const _emitter = mitt();

const app = Vue.createApp({
   data() {
      return {
         url: '',
         opened: [{ title: null, url: 'about:blank' }],
         openedIndex: 0,
         tabsTippy: null,
         focusedSearchBar: false
      }
   },
   methods: {
      isEmptyURL() {
         return this.url.replace(/ /g, '').length == 0;
      },
      async loadURL({ key, target }) {
         if(this.isEmptyURL() || key != 'Enter') return;

         if(this.url.includes('about:blank')) {
            window.electron.loadPage(this.url);
            this.url = '';
            this.opened[this.openedIndex].title = null;
            this.opened[this.openedIndex].url = 'about:blank';
            target.blur();
            return;
         }

         if(!this.url.startsWith('https://') || this.url.startsWith('http://')) this.url = 'https://' + this.url;
         target.blur();

         window.electron.loadPage(this.url);
         this.opened[this.openedIndex] = { title: await window.webSupplier.getTitle(this.url), url: this.url };
      },
      newTab() {
         if(this.isEmptyURL()) return;
         window.electron.loadPage('about:blank');
         this.url = '';
         this.opened.push({ title: null, url: this.url });
         this.openedIndex = this.opened.length - 1;
      },
      changeTab(index) {
         if(this.openedIndex == index) return;
         const tab = this.opened[index];
         this.url = tab.title == null ? '' : tab.url;
         window.electron.loadPage(tab.title == null ? 'about:blank' : this.url);
         this.openedIndex = index;
      },
      getTabsTooltip() {
         const arr = [];
         for (let i = 0; i < this.opened.length; i++) {
            const page = this.opened[i];
            arr.push(`<button onclick="_emitter.emit('change-tab', { index: ${i} })">${page.title || 'Empty'}</button>`);
         }
         return `<ul id="tabs-tooltip">${arr.map(r => '<li>' + r + '</li>').join('')}</ul>`;
      },
      isHTTPSPage() {
         return this.url.startsWith('https://');
      },
      maximize() {
         window.electron.maximize();
      },
      closeApp() {
         window.electron.closeApp();
      }
   },
   mounted() {
      window.emitter.recieve('navigate', async url => {
         this.url = url;
         this.opened[this.openedIndex] = { title: await window.webSupplier.getTitle(this.url), url: this.url };
      });

      _emitter.on('change-tab', data => this.changeTab(data.index));
   },
   watch: {
      url(newValue, oldValue) {
         if(newValue.endsWith('/')) this.url = this.url.substring(0, this.url.length - 1);
      },
      opened: {
         handler(newValue, oldValue) {
            if(this.tabsTippy != null && this.tabsTippy[0] != null) this.tabsTippy[0].destroy();
            this.tabsTippy = tippy('#tabs-wrapper', {
               content: this.getTabsTooltip(),
               interactive: true
            });
         },
         deep: true
      }
   }
});
app.mount('#root');