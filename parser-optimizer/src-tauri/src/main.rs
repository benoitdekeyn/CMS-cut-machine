// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::Manager;

// État global pour stocker les fichiers droppés
struct DroppedFiles(Mutex<Vec<String>>);

#[tauri::command]
fn get_dropped_files(app_handle: tauri::AppHandle) -> Vec<String> {
    let state = app_handle.state::<DroppedFiles>();
    let mut files = state.0.lock().unwrap();
    let result = files.clone();
    files.clear(); // Vider après lecture
    result
}

fn main() {
    tauri::Builder::default()
        .manage(DroppedFiles(Default::default()))
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            
            // Écouter les événements de fenêtre pour capturer les drops
            let app_handle = app.handle();
            window.on_window_event({
                let app_handle = app_handle.clone();
                move |event| {
                    use tauri::WindowEvent;
                    
                    if let WindowEvent::FileDrop(file_drop_event) = event {
                        use tauri::FileDropEvent;
                        
                        match file_drop_event {
                            FileDropEvent::Hovered(paths) => {
                                println!("Fichiers survolés: {:?}", paths);
                                let paths_str: Vec<String> = paths.iter()
                                    .map(|p| p.to_string_lossy().to_string())
                                    .collect();
                                let _ = app_handle.emit_all("file-drop-hover", &paths_str);
                            }
                            FileDropEvent::Dropped(paths) => {
                                println!("Fichiers droppés: {:?}", paths);
                                let paths_str: Vec<String> = paths.iter()
                                    .map(|p| p.to_string_lossy().to_string())
                                    .collect();
                                
                                // Stocker les chemins dans l'état global
                                let state = app_handle.state::<DroppedFiles>();
                                let mut files = state.0.lock().unwrap();
                                *files = paths_str.clone();
                                
                                // Émettre un événement vers le frontend
                                let _ = app_handle.emit_all("file-dropped", &paths_str);
                            }
                            FileDropEvent::Cancelled => {
                                println!("Drop annulé");
                                let _ = app_handle.emit_all("file-drop-cancelled", ());
                            }
                            _ => {
                                // Gérer les autres variantes possibles de FileDropEvent
                                println!("Événement de drop non géré");
                            }
                        }
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_dropped_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
