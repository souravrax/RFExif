import { invoke } from "@tauri-apps/api/core";

type UsbDevice = {
  id: string;
  model: string;
  serial: string | null;
};

type DeviceReport = {
  device: UsbDevice;
  camera: { id: string; label: string } | null;
  ratedLife: number;
  shutter: {
    value: number | null;
    experimental: boolean;
    simulated: boolean;
    note: string;
  };
  error: string | null;
};

const panel = document.querySelector("#connect") as HTMLElement;
const status = document.querySelector("#status") as HTMLElement;
const cards = document.querySelector("#cards") as HTMLElement;
const refreshBtn = document.querySelector("#refresh-btn") as HTMLButtonElement;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function lifeLine(ratedLife: number, value: number | null): string {
  if (!ratedLife || value == null) return "";
  const pct = Math.min(100, (value / ratedLife) * 100);
  return `<p class="note">${pct.toFixed(1)}% of ${ratedLife.toLocaleString("en-US")} rated actuations</p>`;
}

function cardHtml(r: DeviceReport): string {
  const sh = r.shutter;
  const badge = r.error
    ? `<span class="badge none">read failed</span>`
    : sh.value == null
      ? `<span class="badge none">no counter</span>`
      : sh.simulated
        ? `<span class="badge sim">simulated</span>`
        : sh.experimental
          ? `<span class="badge exp">experimental${r.camera ? ` · ${esc(r.camera.label)}` : ""}</span>`
          : `<span class="badge usb">USB · ${esc(r.camera?.label ?? r.device.model)}</span>`;
  const shutterLine =
    sh.value == null
      ? `<div class="shutter">—</div>`
      : `<div class="shutter">${sh.value.toLocaleString("en-US")}</div>`;
  const serial = r.device.serial ? `<p class="note">S/N ${esc(r.device.serial)}</p>` : "";
  const note = sh.note ? `<p class="note">${esc(sh.note)}</p>` : "";
  const err = r.error ? `<p class="err">${esc(r.error)}</p>` : "";
  return `<article class="card">
    <h3>${esc(r.device.model)}</h3>
    ${badge}${shutterLine}${serial}
    ${note}${lifeLine(r.ratedLife, sh.value)}${err}
  </article>`;
}

async function refresh() {
  status.textContent = "Scanning USB…";
  cards.innerHTML = "";
  try {
    const devices = await invoke<UsbDevice[]>("list_cameras");
    if (!devices.length) {
      status.textContent = "No cameras detected — connect one via USB and refresh.";
      return;
    }
    status.textContent = `Reading ${devices.length} camera(s)…`;
    const reports: DeviceReport[] = [];
    for (const d of devices) {
      reports.push(await invoke<DeviceReport>("read_usb_counter", { deviceId: d.id }));
    }
    status.textContent = `Done — ${reports.length} camera(s), read-only.`;
    cards.innerHTML = reports.map(cardHtml).join("");
  } catch (e) {
    status.textContent = `Error: ${String(e)}`;
  }
}

refreshBtn.addEventListener("click", () => void refresh());
panel.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("button")) void refresh();
});
void refresh();
