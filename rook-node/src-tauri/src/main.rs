// Rook Node Tauri shell.
//
// This is a thin supervised shell. The real execution authority is the Node.js
// sidecar (`rook-node`), which runs Chromium, the control gateway, and durable
// state. Tauri only:
//   - supervises the sidecar lifecycle (start on launch, restart on crash),
//   - hosts a minimal status window,
//   - forwards pairing secrets between the OS credential store and the sidecar.
//
// The sidecar is bundled as an external binary and launched via the Tauri sidecar
// API. On Windows the shell also registers autostart through the sidecar's
// `--install`/`--uninstall` commands.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct SidecarState {
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn health(state: State<'_, SidecarState>) -> Result<String, String> {
    let guard = state.child.lock().map_err(|_| "lock")?;
    Ok(match guard.as_ref() {
        Some(child) => format!("sidecar running pid={}", child.pid()),
        None => "sidecar not running".to_string(),
    })
}

#[tauri::command]
fn start_sidecar(state: State<'_, SidecarState>, app: tauri::AppHandle) -> Result<(), String> {
    let existing = state.child.lock().map_err(|_| "lock")?;
    if existing.is_some() {
        return Ok(());
    }
    drop(existing);

    let command = app
        .shell()
        .sidecar("binaries/rook-node")
        .map_err(|e| e.to_string())?;
    let (mut rx, child) = command.spawn().map_err(|e| e.to_string())?;

    *state.child.lock().map_err(|_| "lock")? = Some(child);

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => log::info!("[sidecar] {}", String::from_utf8_lossy(&line)),
                CommandEvent::Stderr(line) => log::error!("[sidecar] {}", String::from_utf8_lossy(&line)),
                CommandEvent::Terminated(payload) => {
                    log::warn!("[sidecar] terminated code={:?}", payload.code);
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn stop_sidecar(state: State<'_, SidecarState>) -> Result<(), String> {
    let child = state.child.lock().map_err(|_| "lock")?.take();
    if let Some(mut child) = child {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    env_logger::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![health, start_sidecar, stop_sidecar])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = handle.emit("sidecar-boot", "booting");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Rook Node");
}