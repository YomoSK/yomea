use std::{env, fs::File, io::Write, path::Path, sync::{LazyLock, Mutex}, time::{SystemTime, UNIX_EPOCH}};

use isahc::ReadResponseExt;
use tauri::{AppHandle, Builder, Emitter, LogicalPosition, LogicalSize, Manager, Url, WebviewBuilder, WebviewUrl, WindowBuilder, Wry};
use serde_json::Value;
use types::{Browser, BrowserTab};

mod types;

static HISTORY_PATH: &str = "./history.json";
static BROWSER: LazyLock<Mutex<Browser>> = LazyLock::new(|| Mutex::new(Browser { tabs: vec![BrowserTab { url: "".to_string(), title: "".to_string() }], current_tab_index: 0 }));
static WINDOW_SIZE: LogicalSize<i32> = LogicalSize::new(1400, 800);

static TOPBAR_HEIGHT: f64 = 60.0;

pub fn get_title_url(url: &str, followredirects: bool) -> Result<String, u16> {
   let mut http = match isahc::get(url) {
      Ok(res) => res,
      Err(_) => {
         isahc::Response::builder()
            .status(404)
            .body(isahc::Body::empty())
            .unwrap()
      }
   };
   let status = http.status();
   if status.is_redirection() && followredirects {
      if let Some(location) = http.headers().get("Location") {
         if let Ok(redirect) = location.to_str() {
            return Ok(get_title_url(redirect, true).unwrap_or("".to_string()));
         }
      }
   }
   if !status.is_success() {
      return Err(status.as_u16());
   }

   let html = http.text();
   let document = scraper::Html::parse_document(html.unwrap().as_str());
   let selector = scraper::Selector::parse("title").unwrap();

   if let Some(title) = document.select(&selector).next() {
      Ok(title.inner_html())
   }
   else {
      Ok("".to_string())
   }
}

#[tauri::command]
fn load_url(app: AppHandle, url: &str) {
   let lock = BROWSER.lock().unwrap();

   let topbar = app.get_webview("topbar").unwrap();
   let webview = app.get_webview(&format!("tab-{}", lock.current_tab_index)).unwrap();

   drop(lock);
   // TODO: Basically this requests the site twice:
   //    1. window.location.href
   //    2. get_title_url()

   if url == "@home" {
      webview.navigate(Url::parse("http://tauri.localhost/home/index.html").unwrap()).unwrap();
      return;
   }

   webview.navigate(url.parse().unwrap()).unwrap();
   
   let title = get_title_url(url, true).unwrap_or("".to_string());
   topbar.emit("title_change", title).unwrap();
   topbar.emit("url_change", url).unwrap();

   // if title.is_err() {
   //    topbar.emit("title_change", title.err());
   // }
   // else {
   //    topbar.emit("title_change", title.unwrap().to_string());
   // }
   // match get_title_url(url, true) {
   //    Ok(title) => topbar.emit("title_change", title),
   //    Err(code) => topbar.emit("title_change", "code")
   // }
}

#[tauri::command(async)]
fn new_tab(app: AppHandle) {
   let mut lock = BROWSER.lock().unwrap();

   let window = app.get_window("main").unwrap();
   let topbar = app.get_webview("topbar").unwrap();
   let mut tabs = lock.tabs.clone();

   let label = format!("tab-{}", lock.current_tab_index + 1);
   let tab = WebviewBuilder::<Wry>::new(
      &label,
      WebviewUrl::App("home/index.html".into())
   ).on_navigation(move |url| {
      let mut lock = BROWSER.lock().unwrap();
      let mut tabs = lock.tabs.clone();
      tabs[lock.current_tab_index as usize].url = url.to_string();
      tabs[lock.current_tab_index as usize].title = get_title_url(url.as_str(), true).unwrap_or("".to_string());
      *lock = Browser { tabs, current_tab_index: lock.current_tab_index };
      drop(lock);
      true
   });

   window.add_child(
      tab.auto_resize(),
      LogicalPosition::new(0.0, TOPBAR_HEIGHT),
      LogicalSize::new(WINDOW_SIZE.width, WINDOW_SIZE.height - TOPBAR_HEIGHT as i32)
   ).unwrap();
   tabs.push(types::BrowserTab { url: "".to_string(), title: "".to_string() });

   window.get_webview(&format!("tab-{}", tabs.len() - 1)).unwrap().show().unwrap();
   topbar.emit("title_change", "").unwrap();
   topbar.emit("url_change", "").unwrap();

   *lock = Browser { tabs: tabs, current_tab_index: lock.current_tab_index + 1 };
   drop(lock);
}

#[tauri::command]
fn close_tab(app: AppHandle) {
   let mut lock = BROWSER.lock().unwrap();

   let topbar = app.get_webview("topbar").unwrap();

   let mut tabs = lock.tabs.clone();
   let current_tab_index = lock.current_tab_index;
   if current_tab_index == 0 {
      close(app);
      return;
   }

   println!("Current index: {}", current_tab_index);
   app.get_webview(&format!("tab-{}", current_tab_index)).unwrap().close().unwrap();
   tabs.remove(current_tab_index as usize);

   topbar.emit("title_change", tabs[(current_tab_index - 1) as usize].title.to_string()).unwrap();
   topbar.emit("url_change", tabs[(current_tab_index - 1) as usize].url.to_string()).unwrap();

   *lock = Browser { tabs: tabs, current_tab_index: current_tab_index - 1 };
   drop(lock);
}

fn get_recent_json() -> Value {
   match serde_json::from_reader(File::open(HISTORY_PATH).unwrap()) {
      Ok(h) => h,
      Err(_) => serde_json::json!([])
   }
}

#[tauri::command]
fn get_recent_tabs(app: AppHandle) {
   app.emit("recent_tabs", get_recent_json().to_string()).unwrap();
   // app.get_webview(format!("tab-{}", app.get_window("main").unwrap().webviews().len() - 2).as_str()).unwrap().emit("recent_tabs", get_recent_json().to_string()).unwrap();
}

#[tauri::command]
fn close(app: AppHandle) {
   app.exit(0);
}

pub fn run() {
   let title = "Yomea";

   let hpath = Path::new(HISTORY_PATH);
   if !hpath.exists() {
      File::create_new(hpath).unwrap().write_all("[]".as_bytes()).unwrap();
   }

   Builder::default()
      .invoke_handler(tauri::generate_handler![load_url, new_tab, close_tab, get_recent_tabs, close])
      .setup(move |app| {
         let topbarcomponent = "topbar/index.html".into();
         let homecomponent = "home/index.html".into();

         let window = WindowBuilder::new(app, "main")
            .title(title)
            .inner_size(WINDOW_SIZE.width as f64, WINDOW_SIZE.height as f64)
            .transparent(true)
            .decorations(false)
            .build()?;

         let topbar = WebviewBuilder::new(
            "topbar",
            WebviewUrl::App(topbarcomponent)
         ).transparent(true);

         // let topbar = WebviewWindow::builder(app, "topbar", WebviewUrl::App(topbarcomponent))
         //    .transparent(true)
         //    .decorations(false)
         //    .auto_resize()
         //    .build()?;

         let handle = app.app_handle().clone();
         let hometab = WebviewBuilder::new(
            "tab-0",
            WebviewUrl::App(homecomponent)
         ).on_navigation(move |url| {
            let topbar = handle.get_webview("topbar").unwrap();
            let strurl = url.to_string();
            let title = get_title_url(&strurl, false).unwrap_or("".to_string());
            
            if !strurl.starts_with("http") && !strurl.contains(&env::current_dir().unwrap().to_str().unwrap().replace("\\", "/")) {
               println!("Blocked access for {}", strurl);
               return false;
            }

            if !strurl.contains("tauri.localhost") && !strurl.contains("127.0.0.1:1430") {
               topbar.emit("url_change", strurl.clone()).unwrap();
               topbar.emit("title_change", title.clone()).unwrap();

               let mut lock = BROWSER.lock().unwrap();
               let mut tabs = lock.tabs.clone();
               tabs[0].url = strurl.clone();
               tabs[0].title = title.clone();
               *lock = Browser { tabs, current_tab_index: lock.current_tab_index };
               drop(lock);

               let mut history = get_recent_json().as_array().unwrap().clone();
               history.push(serde_json::json!({
                  "url": strurl,
                  "title": title,
                  "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
               }));
               File::create(HISTORY_PATH).unwrap().write_all(serde_json::to_string_pretty(&history).unwrap().as_bytes()).unwrap();
            }
            else {
               topbar.emit("url_change", "").unwrap();
               topbar.emit("title_change", "").unwrap();
            }

            true
         });

         window.add_child(
            topbar,
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(WINDOW_SIZE.width, TOPBAR_HEIGHT as i32)
         )?;

         window.add_child(
            hometab.auto_resize(),
            LogicalPosition::new(0.0, TOPBAR_HEIGHT),
            LogicalSize::new(WINDOW_SIZE.width, WINDOW_SIZE.height - TOPBAR_HEIGHT as i32)
         )?;

         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}