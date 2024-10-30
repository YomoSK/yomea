#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::{Builder, WindowBuilder, WebviewBuilder, WebviewUrl, LogicalPosition, LogicalSize};
use serde_json::Value;

pub fn run() {
   let title = "Yomea";
   let size = serde_json::json!({ "width": 1400, "height": 800 });

   Builder::default()
      .setup(move |app| {
         let window = WindowBuilder::new(app, "main")
            .title(title)
            .inner_size(size.get("width").and_then(Value::as_f64).unwrap(), size.get("height").and_then(Value::as_f64).unwrap())
            .build()?;

         let topbar = WebviewBuilder::new(
            "topbar",
            WebviewUrl::External("https://google.com/".parse().unwrap())
         );

         let webview = WebviewBuilder::new(
            "webview",
            WebviewUrl::External("https://yomea.dev/".parse().unwrap())
         );

         window.add_child(
            topbar.auto_resize(),
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(size.get("width").and_then(Value::as_f64).unwrap(), 60.0)
         )?;

         window.add_child(
            webview.auto_resize(),
            LogicalPosition::new(0.0, 60.0),
            LogicalSize::new(size.get("width").and_then(Value::as_f64).unwrap(), size.get("height").and_then(Value::as_f64).unwrap() - 60.0)
         )?;

         // window.maximize()?;

         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}