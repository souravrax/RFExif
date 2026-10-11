import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";

type R10Info = {
  value: number;
  bytes: number[];
  blobOffset: number;
};

type ShutterInfo = {
  value: number | null;
  source: string;
  experimental: boolean;
  note: string;
};

type FileReport = {
  path: string;
  fileName: string;
  shutter: ShutterInfo;
  camera: { id: string; label: string } | null;
  r10: R10Info | null;
  keyTags: Record<string, string>;
  error: string | null;
};

const dz = document.querySelector("#dropzone") as HTMLElement;
const cards = document.querySelector("#cards") as HTMLElement;
const status = document.querySelector("#status") as HTMLElement;
const pickBtn = document.querySelector("#pick-btn") as HTMLButtonElement;

const TAG_ORDER = [
  "Model", "ShutterMode", "CreateDate", "DateTimeOriginal", "SerialNumber",
  "InternalSerialNumber", "LensModel", "RFLensType", "ISO", "ExposureTime",
  "FNumber", "FocalLength", "ImageSize", "FirmwareVersion", "FileType",
];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function cardHtml(r: FileReport): string {
  const sh = r.shutter;
  const badge =
    sh.value == null
      ? `<span class="badge none">no counter</span>`
      : sh.experimental
        ? `<span class="badge exp">experimental${r.camera ? ` · ${esc(r.camera.label)}` : ""}</span>`
        : `<span class="badge native">native EXIF</span>`;
  const shutterLine =
    sh.value == null
      ? `<div class="shutter">—</div>`
      : `<div class="shutter">${sh.value.toLocaleString("en-US")}</div>`;
  const rows = TAG_ORDER.filter((k) => r.keyTags[k])
    .map((k) => `<tr><td>${esc(k)}</td><td>${esc(r.keyTags[k])}</td></tr>`)
    .join("");
  const extra = Object.keys(r.keyTags)
    .filter((k) => !TAG_ORDER.includes(k))
    .sort()
    .map((k) => `<tr><td>${esc(k)}</td><td>${esc(r.keyTags[k])}</td></tr>`)
    .join("");
  const r10line = r.r10
    ? `<p class="note">blob @${r.r10.blobOffset} · bytes [${r.r10.bytes.join(", ")}] → 0xC93 uint32 LE</p>`
    : "";
  const err = r.error ? `<p class="err">${esc(r.error)}</p>` : "";
  return `<article class="card">
    <h3>${esc(r.fileName)}</h3>
    ${badge}${shutterLine}
    <p class="note">${esc(sh.note)}${sh.source === "r10-blob" ? " (mech + EFCS + electronic combined)." : ""}</p>
    ${r10line}${err}
    <table class="tags">${rows}${extra}</table>
  </article>`;
}

async function analyze(paths: string[]) {
  if (!paths.length) return;
  status.textContent = `Reading ${paths.length} file(s)…`;
  try {
    const reports = await invoke<FileReport[]>("analyze_files", { paths });
    status.textContent = `Done — ${reports.length} file(s), read-only.`;
    cards.innerHTML = reports.map(cardHtml).join("");
  } catch (e) {
    status.textContent = `Error: ${String(e)}`;
  }
}

pickBtn.addEventListener("click", async () => {
  const sel = await open({
    multiple: true,
    filters: [{ name: "Photos", extensions: ["cr3", "jpg", "jpeg", "hif", "heif", "dng"] }],
  });
  if (Array.isArray(sel)) await analyze(sel as string[]);
  else if (typeof sel === "string") await analyze([sel]);
});

dz.addEventListener("click", () => pickBtn.click());
dz.addEventListener("dragover", (e) => {
  e.preventDefault();
  dz.classList.add("over");
});
dz.addEventListener("dragleave", () => dz.classList.remove("over"));
dz.addEventListener("drop", (e) => e.preventDefault());

// Native OS file-drop (Tauri) — works when dragging from Explorer/Finder.
try {
  const vw = getCurrentWebview();
  await vw.onDragDropEvent((ev) => {
    if (ev.payload.type === "over") dz.classList.add("over");
    else if (ev.payload.type === "drop") {
      dz.classList.remove("over");
      void analyze((ev.payload as { paths: string[] }).paths ?? []);
    } else dz.classList.remove("over");
  });
} catch {
  /* browser preview: dialog picker still works */
}
