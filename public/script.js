Vue.createApp({
    data() {
        return {
            url: '',
            focusedSearchBar: false
        }
    },
    methods: {
        loadURL({ key, target }) {
            if(this.url.replace(/ /g, '').length == 0 || key != 'Enter') return;
            if(!this.url.startsWith('https://') || this.url.startsWith('http://')) this.url = 'https://' + this.url;
            window.electron.loadPage(this.url);
            target.blur();
        },
        isHTTPSPage() {
            return this.url.startsWith('https://');
        },
        closeApp() {
            window.electron.closeApp();
        }
    }
}).mount('nav');