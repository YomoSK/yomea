struct BrowserTab {
   url: &str,
   title: &str,
   previous: BrowserTab,
   next: BrowserTab
}

struct Browser {
   tabs: Vec<BrowserTab>,
   currentTabIndex: i64
}