#[derive(Clone)]
pub struct BrowserTab {
   pub url: String,
   pub title: String,
}

pub struct Browser {
   pub tabs: Vec<BrowserTab>,
   pub current_tab_index: i64
}