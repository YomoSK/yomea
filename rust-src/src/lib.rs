use isahc::ReadResponseExt;
use tauri::{AppHandle, Builder, Emitter, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl, WindowBuilder};
use serde_json::Value;

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
   let mut webview = app.get_webview("webview").unwrap();
   // TODO: Basically this requests the site twice:
   //    1. window.location.href
   //    2. get_title_url()
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
fn close(app: AppHandle) {
   app.exit(0);
}

pub fn run() {
   let title = "Yomea";
   let size = serde_json::json!({ "width": 1400, "height": 800 });

   Builder::default()
      .invoke_handler(tauri::generate_handler![load_url, close])
      .setup(move |app| {
         let topbarcomponent = "topbar/index.html".into();
         let homecomponent = "home/index.html".into();

         let width = size.get("width").and_then(Value::as_f64).unwrap();
         let height = size.get("height").and_then(Value::as_f64).unwrap();

         let window = WindowBuilder::new(app, "main")
            .title(title)
            .inner_size(width - 1.0, height - 1.0)
            .transparent(true)
            .decorations(false)
            .build()?;

         let topbar = WebviewBuilder::new(
            "topbar",
            WebviewUrl::App(topbarcomponent)
         );

         let handle = app.app_handle().clone();
         let webview = WebviewBuilder::new(
            "webview",
            WebviewUrl::App(homecomponent)
         ).on_navigation(move |url| {
            let topbar = handle.get_webview("topbar").unwrap();
            let strurl = url.to_string();

            if !strurl.starts_with("http") {
               println!("Blocked access for {}", strurl);
               return false;
            }

            if !strurl.contains("tauri.localhost") && !strurl.contains("127.0.0.1:1430") {
               topbar.emit("url_change", strurl).unwrap();
               topbar.emit("title_change", get_title_url(url.as_str(), false).unwrap_or("".to_string())).unwrap();
            }

            true
         });

         window.add_child(
            topbar.auto_resize(),
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(width, 60.0)
         )?;

         window.add_child(
            webview.auto_resize(),
            LogicalPosition::new(0.0, 60.0),
            LogicalSize::new(width, height - 60.0)
         )?;

         window.set_size(LogicalSize::new(width, height))?;

         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}