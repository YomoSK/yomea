use tauri::{Builder, LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl, WindowBuilder};
use serde_json::Value;

pub fn run() {
   let title = "Yomea";
   let size = serde_json::json!({ "width": 1400, "height": 800 });

   Builder::default()
      .setup(move |app| {
         let topbarcomponent = "topbar.html".into();

         let width = size.get("width").and_then(Value::as_f64).unwrap();
         let height = size.get("height").and_then(Value::as_f64).unwrap();

         let window = WindowBuilder::new(app, "main")
            .title(title)
            .inner_size(width, height)
            .build()?;

         let topbar = WebviewBuilder::new(
            "topbar",
            WebviewUrl::App(topbarcomponent)
         );

         let webview = WebviewBuilder::new(
            "webview",
            WebviewUrl::External("https://google.com/".parse().unwrap())
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