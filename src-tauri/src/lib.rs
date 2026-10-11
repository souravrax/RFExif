// ShutterDrop backend: USB PTP shutter-counter reader.
//
// The desktop app is USB-only: it lists attached cameras and reads counters
// straight from the device. It never parses photo files or EXIF — that lives
// in the web app. Per-camera metadata (labels, model matchers, rated life)
// is generated from web/cameras/*/camera.toml (see src-tauri/build.rs).
mod cameras;
mod usb;

use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri::window::{Effect, EffectsBuilder};
#[cfg(target_os = "macos")]
use tauri::window::EffectState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraRef {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShutterInfo {
    pub value: Option<u32>,
    pub experimental: bool,
    pub simulated: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceReport {
    pub device: usb::UsbDevice,
    pub camera: Option<CameraRef>,
    pub rated_life: u32,
    pub shutter: ShutterInfo,
    pub error: Option<String>,
}

pub struct UsbState {
    pub transport: Box<dyn usb::UsbTransport>,
}

#[tauri::command]
fn list_cameras(state: tauri::State<UsbState>) -> Result<Vec<usb::UsbDevice>, usb::UsbError> {
    state.transport.list_devices()
}

#[tauri::command]
fn read_usb_counter(
    state: tauri::State<UsbState>,
    device_id: String,
) -> Result<DeviceReport, usb::UsbError> {
    let devices = state.transport.list_devices()?;
    let device = devices
        .into_iter()
        .find(|d| d.id == device_id)
        .ok_or_else(|| usb::UsbError::transport(format!("unknown device {device_id}")))?;
    let matched = cameras::match_camera(&device.model);
    let (camera, rated_life) = match matched {
        Some(manifest) => (
            Some(CameraRef {
                id: manifest.id.clone(),
                label: manifest.label.clone(),
            }),
            manifest.rated_life,
        ),
        None => (None, 0),
    };
    match state.transport.read_counter(&device.id) {
        Ok(reading) => Ok(DeviceReport {
            device,
            camera,
            rated_life,
            shutter: ShutterInfo {
                value: Some(reading.value),
                experimental: reading.experimental,
                simulated: reading.simulated,
                note: reading.note,
            },
            error: None,
        }),
        Err(e) => Ok(DeviceReport {
            device,
            camera,
            rated_life,
            shutter: ShutterInfo {
                value: None,
                experimental: false,
                simulated: false,
                note: String::new(),
            },
            error: Some(e.message),
        }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(UsbState {
            // Mock transport until a real PTP transport lands; the UI and
            // commands are transport-agnostic from day one.
            transport: Box::new(usb::MockTransport::demo()),
        })
        .setup(|app| {
            // Without this, `transparent: true` is just a see-through hole.
            // The OS compositor must be told to blur behind the window:
            // Mica on Windows 11, vibrancy on macOS.
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                window.set_effects(
                    EffectsBuilder::new()
                        .effects([Effect::Sidebar])
                        .state(EffectState::Active)
                        .radius(12.0)
                        .build(),
                )?;
                #[cfg(target_os = "windows")]
                window.set_effects(EffectsBuilder::new().effect(Effect::Mica).build())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![list_cameras, read_usb_counter])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
