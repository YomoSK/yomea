use isahc::ReadResponseExt;
use tauri::{Builder, LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl, WindowBuilder};
use serde_json::Value;

pub struct _Yomea {
   pub url: &'static str
}

pub static YOMEA: _Yomea = _Yomea {
   url: "https://google.com"
};

pub fn get_title_url(url: String, followredirects: bool) -> Result<String, u16> {
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
            return Ok(get_title_url(redirect.to_string(), true).unwrap());
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
      Ok("Invalid title tag".to_string())
   }
}

#[tauri::command]
fn get_title() -> String {
   return get_title_url(YOMEA.url.to_string(), true).unwrap();
}

pub fn run() {
   let title = "Yomea";
   let size = serde_json::json!({ "width": 1400, "height": 800 });

   Builder::default()
      .invoke_handler(tauri::generate_handler![get_title])
      .setup(move |app| {
         let topbarcomponent = "topbar.html".into();

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

         let webview = WebviewBuilder::new(
            "webview",
            WebviewUrl::External(YOMEA.url.parse().unwrap())
         );

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