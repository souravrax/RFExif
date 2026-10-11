// USB camera interface foundation (desktop only).
//
// The desktop app reads shutter counters over USB PTP — it never touches
// EXIF or photo files. Real transports (gphoto2 shell-out, EDSDK, …) plug
// in later by implementing `UsbTransport`; until then `MockTransport`
// serves scripted fixtures so the commands, UI, and tests run end to end
// with no hardware attached. Mock output is always flagged `simulated`.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbDevice {
    pub id: String,
    pub model: String,
    pub serial: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbReading {
    pub device_id: String,
    pub value: u32,
    pub property: String,
    pub experimental: bool,
    pub note: String,
    pub simulated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbError {
    /// "no-devices" | "no-permission" | "unsupported-model" | "transport"
    pub kind: String,
    pub message: String,
}

impl UsbError {
    pub fn no_devices() -> Self {
        Self {
            kind: "no-devices".into(),
            message: "No cameras detected. Connect a camera via USB and refresh.".into(),
        }
    }

    pub fn unsupported_model(model: &str) -> Self {
        Self {
            kind: "unsupported-model".into(),
            message: format!("{model}: no USB counter mapping for this body yet."),
        }
    }

    pub fn transport(message: impl Into<String>) -> Self {
        Self {
            kind: "transport".into(),
            message: message.into(),
        }
    }
}

/// USB transport seam. Real implementations live here later; commands and
/// the UI only ever talk to this trait. Must be object-safe.
pub trait UsbTransport: Send + Sync {
    fn list_devices(&self) -> Result<Vec<UsbDevice>, UsbError>;
    fn read_counter(&self, device_id: &str) -> Result<UsbReading, UsbError>;
}

/// Scripted fixtures for development and tests. Never reports real data:
/// every reading carries `simulated: true`.
pub struct MockTransport {
    devices: Vec<UsbDevice>,
    readings: HashMap<String, UsbReading>,
}

impl MockTransport {
    pub fn demo() -> Self {
        let device = UsbDevice {
            id: "mock-r10".into(),
            model: "Canon EOS R10".into(),
            serial: Some("MOCK0001".into()),
        };
        let mut readings = HashMap::new();
        readings.insert(
            device.id.clone(),
            UsbReading {
                device_id: device.id.clone(),
                value: 22165,
                property: "mock/shutter-count".into(),
                experimental: true,
                note: "Simulated reading — no camera connected.".into(),
                simulated: true,
            },
        );
        Self {
            devices: vec![device],
            readings,
        }
    }

    pub fn empty() -> Self {
        Self {
            devices: vec![],
            readings: HashMap::new(),
        }
    }
}

impl UsbTransport for MockTransport {
    fn list_devices(&self) -> Result<Vec<UsbDevice>, UsbError> {
        Ok(self.devices.clone())
    }

    fn read_counter(&self, device_id: &str) -> Result<UsbReading, UsbError> {
        self.readings.get(device_id).cloned().ok_or_else(|| {
            if self.devices.iter().any(|d| d.id == device_id) {
                UsbError::unsupported_model(device_id)
            } else {
                UsbError::transport(format!("unknown device {device_id}"))
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_lists_demo_device() {
        let t = MockTransport::demo();
        let devices = t.list_devices().expect("list");
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].model, "Canon EOS R10");
    }

    #[test]
    fn mock_reading_is_flagged_simulated() {
        let t = MockTransport::demo();
        let reading = t.read_counter("mock-r10").expect("read");
        assert_eq!(reading.value, 22165);
        assert!(reading.simulated);
        assert!(reading.experimental);
    }

    #[test]
    fn mock_unknown_device_errors() {
        let t = MockTransport::demo();
        let err = t.read_counter("nope").unwrap_err();
        assert_eq!(err.kind, "transport");
    }

    #[test]
    fn empty_transport_lists_nothing() {
        let t = MockTransport::empty();
        assert!(t.list_devices().expect("list").is_empty());
    }
}
