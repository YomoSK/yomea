Vue.createApp({
   data() {
      return {
         url: '',
         opened: {},
         focusedSearchBar: false
      }
   },
   methods: {
      async loadURL({ key, target }) {
         if(this.url.replace(/ /g, '').length == 0 || key != 'Enter') return;

         if(this.url.includes('about:blank')) {
            window.electron.loadPage(this.url);
            this.url = '';
            this.opened = {};
            target.blur();
            return;
         }

         if(!this.url.startsWith('https://') || this.url.startsWith('http://')) this.url = 'https://' + this.url;
         target.blur();

         window.electron.loadPage(this.url);
         this.opened.title = await window.webSupplier.getTitle(this.url);
         this.opened.url = this.url;
      },
      isHTTPSPage() {
         return this.url.startsWith('https://');
      },
      closeApp() {
         window.electron.closeApp();
      }
   },
   mounted() {
      window.emitter.recieve('navigate', async url => {
         this.url = url;
         this.opened.title = await window.webSupplier.getTitle(this.url);
         this.opened.url = url;
      });
   },
   watch: {
      url(newValue, oldValue) {
         if(newValue.endsWith('/')) this.url = this.url.substring(0, this.url.length - 1);
      }
   },
}).mount('nav');