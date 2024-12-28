use std::{fs::File, io::Write, path::Path, time::{SystemTime, UNIX_EPOCH}};

use isahc::ReadResponseExt;
use tauri::{AppHandle, Builder, Emitter, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl, WindowBuilder, Wry};
use serde_json::Value;

static HISTORY_PATH: &str = "./history.json";

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
            return Ok(get_title_url(redirect, true).unwrap());
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
   let topbar = app.get_webview("topbar").unwrap();
   let mut webview = app.get_webview("tab-0").unwrap();
   // TODO: Basically this requests the site twice:
   //    1. window.location.href
   //    2. get_title_url()

   if url == "@home" {
      let _size = webview.size().unwrap();
      webview.close().unwrap();

      // let newtab = WebviewBuilder::<Wry>::new(
      //    "tab-0",
      //    WebviewUrl::App("home/index.html".into())
      // );
      // app.get_window("main").unwrap().add_child(
      //    newtab.auto_resize(),
      //    LogicalPosition::new(0.0, 60.0),
      //    LogicalSize::new(_size.width, _size.height)
      // ).unwrap();
      // webview.navigate(WebviewUrl::App("home/index.html".into()).);

      return;
   }

   webview.navigate(url.parse().unwrap()).unwrap();
   
   let title = get_title_url(url, true).unwrap_or("".to_string());
   topbar.emit("title_change", title).unwrap();

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

#[tauri::command]
fn new_tab(app: AppHandle) {
   let window = app.get_window("main").unwrap();
   let tabs = app.webviews().clone();

   let tab = WebviewBuilder::<Wry>::new(
      format!("tab-{}", tabs.len() - 1),
      WebviewUrl::External("https://maps.google.com".parse().unwrap())
   );

   let size: LogicalSize<f64> = window.inner_size().unwrap().to_logical(1.0);

   // window.get_webview("tab-0").unwrap().hide().unwrap();

   window.add_child(
      tab.auto_resize(),
      LogicalPosition::new(0.0, 60.0),
      LogicalSize::new(size.width, size.height)
   ).unwrap();

   // window.show().unwrap();

   println!("NEW EMPTY TAB!");
   println!("TABS: {}", tabs.len() + 1);
}

fn get_recent_json() -> Value {
   match serde_json::from_reader(File::open(HISTORY_PATH).unwrap()) {
      Ok(h) => h,
      Err(_) => serde_json::json!([])
   }
}

#[tauri::command]
fn get_recent_tabs(app: AppHandle) {
   app.get_webview(format!("tab-{}", app.get_window("main").unwrap().webviews().len() - 2).as_str()).unwrap().emit("recent_tabs", get_recent_json().to_string()).unwrap();
}

#[tauri::command]
fn close(app: AppHandle) {
   app.exit(0);
}

pub fn run() {
   let title = "Yomea";
   let size = serde_json::json!({ "width": 1400, "height": 800 });

   let hpath = Path::new(HISTORY_PATH);
   if !hpath.exists() {
      File::create_new(hpath).unwrap().write_all("[]".as_bytes()).unwrap();
   }

   Builder::default()
      .invoke_handler(tauri::generate_handler![load_url, new_tab, get_recent_tabs, close])
      .setup(move |app| {
         let topbarcomponent = "topbar/index.html".into();
         let homecomponent: &str = "home/index.html";

         let width = size.get("width").and_then(Value::as_f64).unwrap();
         let height = size.get("height").and_then(Value::as_f64).unwrap();

         let window = WindowBuilder::new(app, "main")
            .title(title)
            .inner_size(width, height)
            .transparent(true)
            .decorations(false)
            .build()?;

         let topbar = WebviewBuilder::new(
            "topbar",
            WebviewUrl::App(topbarcomponent)
         );

         let handle = app.app_handle().clone();
         let hometab = WebviewBuilder::new(
            "tab-0",
            WebviewUrl::App(homecomponent.into())
         ).on_navigation(move |url| {
            let topbar = handle.get_webview("topbar").unwrap();
            let strurl = url.to_string();
            let title = get_title_url(&strurl, false).unwrap_or("".to_string());
            
            if !strurl.starts_with("http") {
               println!("Blocked access for {}", strurl);
               return false;
            }

            if !strurl.contains("tauri.localhost") && !strurl.contains("127.0.0.1:1430") {
               topbar.emit("url_change", strurl.clone()).unwrap();
               topbar.emit("title_change", title.clone()).unwrap();

               let mut history = get_recent_json().as_array().unwrap().clone();
               history.push(serde_json::json!({
                  "url": strurl,
                  "title": title,
                  "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
               }));
               File::create(HISTORY_PATH).unwrap().write_all(serde_json::to_string_pretty(&history).unwrap().as_bytes()).unwrap();
            }

            true
         });

         window.add_child(
            topbar.auto_resize(),
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(width * 1.01, 60.0)
         )?;

         window.add_child(
            hometab.auto_resize(),
            LogicalPosition::new(0.0, 60.0),
            LogicalSize::new(width * 1.01, height - 23.0)
         )?;

         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}