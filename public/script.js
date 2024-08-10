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
         notice: [],
         tabsTippy: null,
         updateCheckerTippy: null,
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
            this.setURL('');
            target.blur();
            return;
         }

         if(!this.url.startsWith('https://') || this.url.startsWith('http://')) this.url = 'https://' + this.url;
         target.blur();

         window.electron.loadPage(this.url);
         this.opened[this.openedIndex] = { title: await window.webSupplier.getTitle(this.url), url: this.url };
      },
      async setURL(url) {
         this.url = url;
         this.opened[this.openedIndex] = { title: await window.webSupplier.getTitle(this.url), url: this.url || 'about:blank' };
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
      getTitle() {
         let title = this.opened[this.openedIndex].title;
         if(title.length > 12) title = title.substring(0, 12) + '...';
         return title;
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
      window.emitter.recieve('navigate', async url => this.setURL(url));

      document.addEventListener('click', async click => {
         if(click.target.parentNode.id == 'notice') {
            click.preventDefault();
            this.setURL(click.target.getAttribute('href'));
            window.electron.loadPage(this.url);
         }
      });

      function updateCheckerTippy(text) {
         if(this.updateCheckerTippy != null && this.updateCheckerTippy[0] != null) this.updateCheckerTippy[0].destroy();
         this.updateCheckerTippy = tippy('#update-check', {
            content: '<div style="padding: .5rem; font-family: \'Roboto\', sans-serif; font-weight: 600; letter-spacing: 1px;">' + text + '</div>'
         });
      }
      updateCheckerTippy('Checking for updates...');
      
      const updaterIcon = this.$refs['updater-icon'];

      fetch('https://api.yomea.dev')
         .then(res => res.json())
         .then(data => {
            this.notice = data?.notice;

            updaterIcon.style.animation = 'none';
            if(data?.newestVersion == window.electron.getAppVersion()) {
               updateCheckerTippy('Perfect! You\'re running the latest version!');
               updaterIcon.classList.value = 'fas fa-check';
               updaterIcon.style.color = '#4cd964';
            }
            else {
               updateCheckerTippy('Newer version is available!<br>Click to download it!');
               updaterIcon.classList.value = 'fas fa-box';
               updaterIcon.style.color = '#007aff';
               updaterIcon.style.cursor = 'pointer';
               updaterIcon.parentNode.addEventListener('click', () => {
                  this.url = 'https://github.com/YomoSK/yomea';
                  window.electron.loadPage(this.url);
               });
            }
         })
         .catch(() => {
            updateCheckerTippy('Could not verify the latest version!');
            updaterIcon.classList.value = 'fas fa-triangle-exclamation';
         })
         .finally(() => updaterIcon.style.animation = 'none');

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
               arrow: false,
               interactive: true
            });
         },
         deep: true
      }
   }
});
app.mount('#root');