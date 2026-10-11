<script>
  import { onDestroy } from "svelte";
  import { animate } from "motion/mini";
  import { base } from "$app/paths";
  import { equipmentArt } from "$lib/equipment-art.js";
  import BrandHeader from '$lib/BrandHeader.svelte';
  import { readJpegExif } from "../../cameras/_shared/exif.js";
  import { loadCameras } from "$lib/camera-sdk.js";
  import {
    toEntries,
    categorizeEntries,
    filterEntries,
    firstValue,
    findNativeCount,
    diffKeys,
    exportJsonText,
    formatCount,
    CATEGORY_ORDER,
  } from "$lib/metadata.js";
  import "./styles.css";

  var registry = loadCameras();

  let cards = $state([]);
  let selectedId = $state(null);
  let view = $state("overview");
  let heroTitle;
  let heroArt;
  let heroImmediate = true;
  $effect(() => {
    const compact = view !== "overview" && cards.length > 0;
    if (!heroTitle || !heroArt) return;
    const duration = heroImmediate || matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.24;
    const options = { duration, ease: [0.23, 1, 0.32, 1] };
    const titleMotion = animate(heroTitle, { transform: `scale(${compact ? 0.9 : 1})` }, options);
    const artMotion = animate(heroArt, { transform: `scale(${compact ? 0.9 : 1})` }, options);
    return () => { titleMotion.stop(); artMotion.stop(); };
  });
  let metaQuery = $state("");
  let metaMode = $state("grouped");
  let metaCategory = $state("All");
  let compareQuery = $state("");
  let showDiff = $state(false);
  let dragOver = $state(false);
  /** @type {HTMLInputElement | undefined} */
  let fileInput = $state();

  function changeView(next, event) {
    heroImmediate = event.detail === 0;
    view = next;
    const button = event.currentTarget;
    if (event.detail === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(button, { transform: ["scale(0.97)", "scale(1)"] }, {
      duration: 0.18, ease: [0.23, 1, 0.32, 1],
    });
  }

  let current = $derived(
    cards.find(function (c) { return c.id === selectedId; }) || cards[0] || null
  );

  function touch(id, patch) {
    cards = cards.map(function (c) {
      if (c.id !== id) return c;
      var next = {};
      for (var k in c) next[k] = c[k];
      for (var p in patch) next[p] = patch[p];
      return next;
    });
  }

  function lookupOf(card) {
    var m = {};
    if (card && card.fastExif) for (var k in card.fastExif) m[k] = card.fastExif[k];
    if (card && card.fullMap) for (var g in card.fullMap) m[g] = card.fullMap[g];
    return m;
  }

  function exposureOf(card) {
    var m = lookupOf(card);
    return {
      iso: firstValue(m, ["EXIF:ISO", "IFD0:ISO", "MakerNotes:ISO", "Composite:ISO", "ISO"]),
      shutter: firstValue(m, ["EXIF:ExposureTime", "Composite:ShutterSpeed", "ShutterSpeed", "ExposureTime"]),
      aperture: firstValue(m, ["EXIF:FNumber", "Composite:Aperture", "Aperture", "FNumber"]),
      focal: firstValue(m, ["EXIF:FocalLength", "Composite:FocalLength", "FocalLength"]),
    };
  }

  function fmtAperture(v) {
    if (!v) return "—";
    var s = String(v).trim();
    if (/^f\//i.test(s)) return s;
    if (/^[0-9.]+$/.test(s)) return "f/" + s;
    return s;
  }

  function fmtShutter(v) {
    if (!v) return "—";
    var s = String(v).trim();
    if (/^\d+\/\d+/.test(s)) return s + (/\bs$/.test(s) ? "" : " s");
    var f = parseFloat(s);
    if (!isNaN(f) && f > 0 && f < 1) return "1/" + Math.round(1 / f) + " s";
    return s;
  }

  // Progressive full-decode. ALWAYS runs — even when the fast path found no
  // counter — so every card retains all returned Group:Tag fields and parsing
  // status/errors stay separate from the no-counter explanation.
  async function enrich(id, file, bytes, miniExif, fastHit) {
    try {
      var mod = await import("$lib/wasm/exiftool.js");
      var full = await mod.parseFull(file);
      // Retain every returned Group:Tag field verbatim on the card.
      var fullMap = {};
      for (var k in full.map) fullMap[k] = full.map[k];
      // Merged view for lookups: mini short keys + full Group:Tag keys.
      // Source groups are never dropped (full keys keep their "Group:" prefix).
      var merged = {};
      for (var a in miniExif) merged[a] = miniExif[a];
      for (var b in fullMap) merged[b] = fullMap[b];

      // Genuine native count: full group tags AND short aliases. This runs
      // beside registry.read so an experimental R10 blob hit listed first in
      // the registry can never block a real native ShutterCount.
      var native = findNativeCount(merged);
      var upgrade = null;
      try {
        upgrade = registry.read({ bytes: bytes, exif: merged, fileName: file.name }, "web");
      } catch (e) { upgrade = null; }

      var body = firstValue(merged, ["EXIF:Model", "IFD0:Model", "MakerNotes:CanonModelID", "Composite:CameraModel", "Model"]);
      var patch = {
        enriching: false,
        parseStatus: "ready",
        parseError: "",
        engine: mod.ENGINE + " · " + full.tagCount + " tags",
        fullMap: fullMap,
        tagCount: full.tagCount,
      };
      if (!fastHit && !native && !upgrade) patch.note = "This file has no readable shutter counter. Its available metadata is shown below.";
      if (body) patch.model = body;

      if (native) {
        patch.shutter = native.value;
        patch.fileNumber = false;
        patch.experimental = false;
        patch.badge = "Native";
        patch.source = native.key;
        patch.note = "Native EXIF ShutterCount (" + native.key + ").";
        if (upgrade && upgrade.camera && upgrade.camera.label) {
          if (!body) patch.model = upgrade.camera.label;
          patch.rated = upgrade.camera.ratedLife || patch.rated || 0;
        }
      } else if (
        upgrade && !upgrade.result.fileNumber && !upgrade.result.experimental
      ) {
        patch.shutter = upgrade.result.value;
        patch.fileNumber = false;
        patch.experimental = false;
        patch.badge = null;
        patch.source = upgrade.result.source;
        patch.note = upgrade.result.note;
        patch.model = body || upgrade.camera.label;
        patch.rated = upgrade.camera.ratedLife || 0;
      } else if (upgrade && !upgrade.result.fileNumber && upgrade.result.experimental) {
        var keepFast = fastHit && !fastHit.result.fileNumber;
        if (!keepFast) {
          patch.shutter = upgrade.result.value;
          patch.fileNumber = false;
          patch.experimental = true;
          patch.badge = "Experimental";
          patch.source = upgrade.result.source;
          patch.note = upgrade.result.note;
          patch.model = body || upgrade.camera.label;
          patch.rated = upgrade.camera.ratedLife || 0;
        } else {
          patch.source = patch.source || fastHit.result.source;
        }
      }
      touch(id, patch);
    } catch (e) {
      touch(id, {
        enriching: false,
        parseStatus: "error",
        parseError: String((e && e.message) || e || "parse failed"),
      });
    }
  }

  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(String(name || ""));
    return m ? m[1].toLowerCase() : "";
  }

  let pickerMode = "replace";
  let loadingPhoto = $state(false);
  function pickPhoto(mode = "replace") { pickerMode = mode; fileInput?.click(); }
  async function handleFiles(list, mode = "replace") {
    if (loadingPhoto || !list?.length) return;
    loadingPhoto = true;
    if (mode === "replace") { clearAll(); view = "overview"; }
    else if (cards.length > 1) removeCard(cards[0].id);
    var files = Array.prototype.slice.call(list || []).slice(0, 1);
    for (var fi = 0; fi < files.length; fi++) {
      var file = files[fi];
      try {
        var bytes = new Uint8Array(await file.arrayBuffer());
        var miniExif = readJpegExif(bytes);
        var fastHit = null;
        try {
          fastHit = registry.read({ bytes: bytes, exif: miniExif, fileName: file.name }, "web");
        } catch (e) { fastHit = null; }
        var ext = extOf(file.name);
        var isJpeg = ext === "jpg" || ext === "jpeg" || /^image\/jpeg/i.test(file.type || "");
        var objectURL = null;
        try {
          if (isJpeg) objectURL = URL.createObjectURL(file);
        } catch (e) { objectURL = null; }
        var id = file.name + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
        var base = {
          id: id,
          name: file.name,
          size: file.size,
          ext: ext,
          isJpeg: isJpeg,
          objectURL: objectURL,
          model: (fastHit ? fastHit.camera.label : miniExif.Model || "Camera not identified"),
          shutter: fastHit && !fastHit.result.fileNumber ? fastHit.result.value : fastHit && fastHit.result.fileNumber ? fastHit.result.value : null,
          fileNumber: !!(fastHit && fastHit.result.fileNumber),
          experimental: !!(fastHit && fastHit.result.experimental && !(fastHit && fastHit.result.fileNumber)),
          badge: fastHit ? (fastHit.result.fileNumber ? "File number" : fastHit.result.experimental ? "Experimental" : null) : null,
          note: fastHit ? fastHit.result.note : "",
          source: fastHit ? fastHit.result.source : "",
          rated: fastHit ? fastHit.camera.ratedLife || 0 : 0,
          fastExif: miniExif,
          fullMap: Object.fromEntries(Object.entries(miniExif).map(([key, value]) => ["EXIF:" + key, value])),
          tagCount: Object.keys(miniExif).length,
          enriching: true,
          parseStatus: "enriching",
          parseError: "",
          engine: "",
          hasCounter: !!(fastHit && !fastHit.result.fileNumber),
        };
        if (!fastHit) {
          base.shutter = null;
          base.note = "Checking the original photo for a readable shutter counter.";
        }
        cards = [base].concat(cards);
        if (!selectedId) selectedId = id;
        enrich(id, file, bytes, miniExif, fastHit);
      } catch (e) {
        var eid = (file && file.name ? file.name : "file") + "-" + Date.now();
        cards = [{
          id: eid, name: (file && file.name) || "unknown", size: (file && file.size) || 0,
          ext: extOf(file && file.name), isJpeg: false, objectURL: null,
          model: (file && file.name) || "unknown", shutter: null, fileNumber: false,
          experimental: false, badge: null, note: "", source: "", rated: 0,
          fastExif: {}, fullMap: {}, tagCount: 0, enriching: false,
          parseStatus: "error", parseError: String((e && e.message) || e || "read failed"), engine: "",
          hasCounter: false,
        }].concat(cards);
      }
    }
    loadingPhoto = false;
    if (mode === "compare" && cards.length > 1) view = "compare";
  }

  function removeCard(id) {
    var card = cards.find(function (c) { return c.id === id; });
    if (card && card.objectURL) { try { URL.revokeObjectURL(card.objectURL); } catch (e) {} }
    cards = cards.filter(function (c) { return c.id !== id; });
    if (selectedId === id) selectedId = cards.length ? cards[0].id : null;
  }

  function clearAll() {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].objectURL) { try { URL.revokeObjectURL(cards[i].objectURL); } catch (e) {} }
    }
    cards = [];
    selectedId = null;
  }

  onDestroy(function () {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].objectURL) { try { URL.revokeObjectURL(cards[i].objectURL); } catch (e) {} }
    }
  });

  function exportSelected() {
    if (!current) return;
    var text = exportJsonText(current);
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = current.name + ".metadata.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (e) {}
      a.remove();
    }, 500);
  }

  function captureRows(card) {
    var m = lookupOf(card);
    var rows = [];
    function add(label, v) { if (v) rows.push([label, v]); }
    add("Date and time", firstValue(m, ["EXIF:DateTimeOriginal", "EXIF:CreateDate", "EXIF:ModifyDate", "DateTime"]));
    add("Scene type", firstValue(m, ["EXIF:SceneType", "MakerNotes:SceneType", "Composite:SceneType"]));
    add("Metering mode", firstValue(m, ["EXIF:MeteringMode", "MeteringMode"]));
    add("Exposure mode", firstValue(m, ["EXIF:ExposureProgram", "EXIF:ExposureMode", "ExposureProgram", "ExposureMode"]));
    add("White balance", firstValue(m, ["EXIF:WhiteBalance", "MakerNotes:WhiteBalance", "WhiteBalance"]));
    add("Drive mode", firstValue(m, ["EXIF:DriveMode", "MakerNotes:DriveMode", "DriveMode"]));
    add("Image stabilization", firstValue(m, ["EXIF:ImageStabilization", "MakerNotes:ImageStabilization", "ImageStabilization"]));
    return rows;
  }

  function cameraRows(card) {
    var m = lookupOf(card);
    var rows = [];
    function add(label, v) { if (v) rows.push([label, v]); }
    add("Camera model", firstValue(m, ["EXIF:Model", "IFD0:Model", "Model"]));
    add("Serial number", firstValue(m, ["MakerNotes:SerialNumber", "EXIF:SerialNumber", "SerialNumber"]));
    add("Firmware version", firstValue(m, ["MakerNotes:FirmwareVersion", "EXIF:FirmwareVersion", "FirmwareVersion"]));
    add("Lens model", firstValue(m, ["EXIF:LensModel", "MakerNotes:LensModel", "Composite:Lens", "LensModel"]));
    add("Lens serial number", firstValue(m, ["MakerNotes:LensSerialNumber", "EXIF:LensSerialNumber", "LensSerialNumber"]));
    add("Focal length", firstValue(m, ["EXIF:FocalLength", "FocalLength"]));
    add("Focus mode", firstValue(m, ["EXIF:FocusMode", "MakerNotes:FocusMode", "FocusMode"]));
    add("AF area mode", firstValue(m, ["MakerNotes:AFAreaMode", "AFAreaMode"]));
    return rows;
  }

  function fileRows(card) {
    var m = lookupOf(card);
    var rows = [];
    function add(label, v) { if (v) rows.push([label, v]); }
    var w = firstValue(m, ["EXIF:ImageWidth", "File:ImageWidth", "Composite:ImageSize", "ImageWidth"]);
    var h = firstValue(m, ["EXIF:ImageHeight", "File:ImageHeight", "ImageHeight"]);
    var size = firstValue(m, ["Composite:ImageSize", "File:ImageSize", "ImageSize"]);
    if (size) add("Image dimensions", size);
    else if (w && h) add("Image dimensions", w + " × " + h);
    var wn = parseInt(w, 10), hn = parseInt(h, 10);
    if (!isNaN(wn) && !isNaN(hn) && wn > 0 && hn > 0) {
      add("Megapixels", (Math.round((wn * hn) / 100000) / 10).toFixed(1) + " MP");
    } else {
      add("Megapixels", firstValue(m, ["Composite:Megapixels", "Megapixels"]));
    }
    if (card) add("File size", card.size < 1048576 ? (card.size / 1024).toFixed(1) + " KB" : (card.size / 1048576).toFixed(1) + " MB");
    add("File type", firstValue(m, ["File:FileType", "FileType"]) || (card && card.ext ? card.ext.toUpperCase() : ""));
    add("Color space", firstValue(m, ["EXIF:ColorSpace", "ColorSpace"]));
    add("Bit depth", firstValue(m, ["EXIF:BitsPerSample", "File:BitsPerSample", "BitsPerSample"]));
    add("Compression", firstValue(m, ["EXIF:Compression", "File:Compression", "Compression"]));
    add("Software", firstValue(m, ["EXIF:Software", "Software"]));
    return rows;
  }

  function hasGps(card) {
    return Boolean(card && (categorizeEntries(card.fullMap).GPS || []).length);
  }

  // Compare helpers
  let compareMaps = $derived(cards.map(function (c) { return c.fullMap || {}; }));
  let differing = $derived(diffKeys(compareMaps));
  let differingSet = $derived((function () {
    var s = {};
    for (var i = 0; i < differing.length; i++) s[differing[i]] = true;
    return s;
  })());

  function compareDetailRows(card) {
    var rows = cameraRows(card).concat(captureRows(card)).concat(fileRows(card)).slice(0, 8);
    var q = compareQuery.trim().toLowerCase();
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (q && rows[i][0].toLowerCase().indexOf(q) < 0 && String(rows[i][1]).toLowerCase().indexOf(q) < 0) continue;
      out.push(rows[i]);
    }
    return out;
  }

  function allComparedRows() {
    var keys = [...new Set(cards.flatMap(c => Object.keys(c.fullMap || {})))].sort();
    var query = compareQuery.trim().toLowerCase();
    return keys.map(key => ({ key, values: cards.map(c => c.fullMap[key] ?? null) }))
      .filter(row => !showDiff || differingSet[row.key])
      .filter(row => !query || (row.key + " " + row.values.join(" ")).toLowerCase().includes(query));
  }
</script>

<div class="app">
  <BrandHeader />
  <div class="maincol">
    <main>
        <div class="poster-hero">
          <h1 bind:this={heroTitle}>Small file.<br class="mobile-break" /> Big story.</h1>
          <div class="hero-art" bind:this={heroArt} aria-hidden="true">
            <span class="local-sticker">LOCAL<br />ONLY</span>
            <img src={`${base}/art/camera-buddy.png`} alt="" width="210" height="210" />
          </div>
        </div>
      {#if cards.length}<div class="photo-toolbar">    <nav class="header-nav" aria-label="Views">
      <button class:active={view === "overview"} aria-current={view === "overview" ? "page" : undefined} onclick={(event) => changeView("overview", event)}>
        Overview
      </button>
      <button class:active={view === "metadata"} aria-current={view === "metadata" ? "page" : undefined} onclick={(event) => changeView("metadata", event)}>
        Metadata
      </button>
      {#if cards.length > 1}<button class:active={view === "compare"} aria-current={view === "compare" ? "page" : undefined} onclick={(event) => changeView("compare", event)}>
        Comparison
      </button>{/if}
    </nav>
<div class="photo-actions"><button class="add" disabled={loadingPhoto} onclick={() => pickPhoto("compare")}>+ Compare</button><button class="ghost" disabled={loadingPhoto} onclick={() => pickPhoto()}>Replace photo</button><button class="ghost" onclick={clearAll}>Reset</button></div></div>{/if}
      {#if !cards.length}
        <section class="empty" aria-labelledby="empty-h">
          <p class="kicker">Free camera insights · Canon EOS R</p>
          <h2 id="empty-h">Meet your camera’s story.</h2>
          <p class="sub">Drop an original, unedited photo straight from the camera. Counts are read in your browser — files never leave this device.</p>
          <div
            class="dropzone"
            class:over={dragOver}
            role="button" tabindex="0"
            aria-label="Drop photos here or press Enter to browse"
            onclick={() => pickPhoto()}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickPhoto(); } }}
            ondragover={(e) => { e.preventDefault(); dragOver = true; }}
            ondragenter={(e) => { e.preventDefault(); dragOver = true; }}
            ondragleave={(e) => { e.preventDefault(); dragOver = false; }}
            ondrop={(e) => { e.preventDefault(); dragOver = false; handleFiles(e.dataTransfer.files); }}
          >
            <div class="dz-icon" aria-hidden="true">▣</div>
            <p><strong>Drag photos here</strong> or <span class="link">browse files</span></p>
            <p class="muted small">CR3 · JPG · HIF — one original at a time · originals only, edits strip MakerNotes</p>
          </div>
          <div class="hints">
            <div><strong>01 · Drop</strong><span>Unedited file from the camera.</span></div>
            <div><strong>02 · Result</strong><span>Honest count on a clean card.</span></div>
            <div><strong>03 · Inspect</strong><span>Every metadata field, searchable.</span></div>
          </div>
        </section>
      {:else if current && view === "overview"}
              {@const cameraArt = equipmentArt('camera', firstValue(lookupOf(current), ['EXIF:Model', 'IFD0:Model', 'Model']) || current.model)}
              {@const lensArt = equipmentArt('lens', firstValue(lookupOf(current), ['EXIF:LensModel', 'MakerNotes:LensModel', 'LensModel']))}
        <section class="ov" aria-labelledby="ov-h">
          <h2 id="ov-h" class="visually-hidden">Photo overview</h2>
          <p class="crumb">{current.name} / {current.model}</p>
          <div class="bento">
            <article class="score span2" aria-label="Total actuations">
              <div class="rowhead"><span>{current.fileNumber ? "File number" : current.source === "r10-blob" ? "Total actuations" : "Shutter count"} <span class="info" title="Experimental readings are labeled. Rated life is a separate reference.">ⓘ</span></span>{#if current.badge}<span class="pill" class:exp={current.experimental}>{current.badge}</span>{/if}</div>
              <div class="bignum">{current.fileNumber ? formatCount(current.shutter) : current.shutter != null ? formatCount(current.shutter) : "—"}</div>
              <p class="cap">{current.fileNumber ? "File number — not a shutter count" : current.shutter != null ? (current.note || "Total actuations") : "No readable counter in this file"}</p>
              {#if !current.fileNumber && current.shutter == null}
                <p class="muted small">{current.note}</p>
              {/if}
              <p class="parseline muted small">
                {#if current.parseStatus === "enriching"}Reading full EXIF…
                {:else if current.parseStatus === "error"}Full EXIF failed — {current.parseError}
                {:else if current.tagCount > 0}Full EXIF via {current.engine}
                {:else}Full EXIF returned no tags.
                {/if}
              </p>
              {#if current.source}<p class="muted small">Source: {current.source}</p>{/if}
            </article>
            <article class="rated" aria-label="Rated mechanical life">
              <div class="rowhead"><span>Rated mechanical life <span class="info" title="Manufacturer reference only.">ⓘ</span></span></div>
              <div class="midnum">{current.rated > 0 ? formatCount(current.rated) : "—"}</div>
              <p class="muted small">Manufacturer's rated mechanical shutter life (for reference).</p>
              <p class="warn"><span aria-hidden="true">⚠</span> Total actuations are not mechanical wear.</p>
            </article>
            <article class="preview" aria-label="Photo preview">
              <span class="preview-label">Your photo</span>
              {#if current.isJpeg && current.objectURL}
                <img src={current.objectURL} alt={current.name + " preview"} onerror={() => { URL.revokeObjectURL(current.objectURL); touch(current.id, { objectURL: null }); }} />
              {:else}
                <div class="rawph" role="img" aria-label={(current.ext ? current.ext.toUpperCase() : "RAW") + " preview not rendered"}>
                  <span class="rawext">{current.ext ? current.ext.toUpperCase() : "RAW"}</span>
                  <span class="muted small">Preview not rendered — {current.ext ? current.ext.toUpperCase() : "RAW"} kept locally.</span>
                </div>
              {/if}
            </article>
            <article class="minicard" aria-label="Camera">
              {#if cameraArt?.sprite}<span class="equipment-art equipment-sprite" role="img" aria-label={cameraArt.label + " illustration"} style:background-image={`url("${cameraArt.image}")`} style:background-position={cameraArt.position}></span>{:else if cameraArt}<img class="equipment-art" src={cameraArt.image} alt={cameraArt.label} title={cameraArt.credit || cameraArt.label} />{:else}<div class="mini-ic" aria-hidden="true">◉</div>{/if}
              <div><strong>{firstValue(lookupOf(current), ["EXIF:Model", "IFD0:Model", "Model"]) || current.model}</strong><span class="muted small">Camera identification</span>{#if cameraArt?.sprite}<span class="art-credit">Illustration</span>{:else if cameraArt}<span class="art-credit"><a href={cameraArt.source} target="_blank" rel="noreferrer">Photo: {cameraArt.credit}</a> · <a href={cameraArt.licenseUrl} target="_blank" rel="noreferrer">{cameraArt.license}</a> · grayscale treatment</span>{/if}</div>
            </article>
            <article class="minicard" aria-label="Lens">
              {#if lensArt?.sprite}<span class="equipment-art equipment-sprite" role="img" aria-label={lensArt.label + " illustration"} style:background-image={`url("${lensArt.image}")`} style:background-position={lensArt.position}></span>{:else if lensArt}<img class="equipment-art" src={lensArt.image} alt={lensArt.label} title={lensArt.credit || lensArt.label} />{:else}<div class="mini-ic" aria-hidden="true">◎</div>{/if}
              <div><strong>{firstValue(lookupOf(current), ["EXIF:LensModel", "MakerNotes:LensModel", "Composite:Lens", "LensModel"]) || "Lens not in tags"}</strong><span class="muted small">From embedded metadata</span>{#if lensArt?.sprite}<span class="art-credit">Illustration</span>{:else if lensArt}<span class="art-credit"><a href={lensArt.source} target="_blank" rel="noreferrer">Photo: {lensArt.credit}</a> · <a href={lensArt.licenseUrl} target="_blank" rel="noreferrer">{lensArt.license}</a> · grayscale treatment</span>{/if}</div>
            </article>
            <article class="exposure span2" aria-label="Exposure settings">
              <h2>Exposure settings</h2>
              <div class="tiles">
                <div><span>ISO</span><strong>{exposureOf(current).iso || "—"}</strong></div>
                <div><span>Shutter speed</span><strong>{fmtShutter(exposureOf(current).shutter)}</strong></div>
                <div><span>Aperture</span><strong>{fmtAperture(exposureOf(current).aperture)}</strong></div>
                <div><span>Focal length</span><strong>{exposureOf(current).focal ? exposureOf(current).focal + (/(mm)\b/i.test(exposureOf(current).focal) ? "" : " mm") : "—"}</strong></div>
              </div>
            </article>
          </div>
          <div class="groups">
            <article aria-label="Capture details"><h2>▤ Capture details</h2><dl>{#each captureRows(current) as r}<div><dt>{r[0]}</dt><dd>{r[1]}</dd></div>{/each}{#if !captureRows(current).length}<p class="muted small">No capture tags in this file.</p>{/if}</dl></article>
            <article aria-label="Camera and lens"><h2>◉ Camera &amp; lens</h2><dl>{#each cameraRows(current) as r}<div><dt>{r[0]}</dt><dd>{r[1]}</dd></div>{/each}{#if !cameraRows(current).length}<p class="muted small">No camera tags in this file.</p>{/if}</dl></article>
            <article aria-label="Image and file"><h2>▦ Image &amp; file</h2><dl>{#each fileRows(current) as r}<div><dt>{r[0]}</dt><dd>{r[1]}</dd></div>{/each}{#if !fileRows(current).length}<p class="muted small">No image tags in this file.</p>{/if}</dl></article>
          </div>
          <button class="explorelink" onclick={() => { view = "metadata"; }}>☰ Explore all {current.tagCount || toEntries(current.fullMap).length} metadata fields →</button>
        </section>
      {:else if current && view === "metadata"}
        <section class="meta" aria-labelledby="meta-h">
          <h1 id="meta-h">The complete picture.</h1>
          <p class="crumb">{current.name} / {current.model}</p>
          <div class="toolbar">
            <span class="countpill">{toEntries(current.fullMap).length} fields</span>
            <label class="search"><span class="visually-hidden">Search metadata</span><input type="search" placeholder="Search metadata…" bind:value={metaQuery} aria-label="Search metadata" /></label>
            <div class="seg" role="group" aria-label="Metadata layout">
              <button class:active={metaMode === "grouped"} aria-pressed={metaMode === "grouped"} onclick={() => { metaMode = "grouped"; }}>Grouped</button>
              <button class:active={metaMode === "raw"} aria-pressed={metaMode === "raw"} onclick={() => { metaMode = "raw"; }}>Raw</button>
            </div>
            <button class="ghost" onclick={exportSelected}>Export JSON</button>
          </div>
          <p class="parseline muted small">
            {#if current.parseStatus === "enriching"}Reading full EXIF… fast-path count shown first.
            {:else if current.parseStatus === "error"}Full EXIF failed — {current.parseError} · showing fast-path result only.
            {:else}Full EXIF via {current.engine} · source groups preserved.
            {/if}
          </p>
          <div class="category-tabs" role="group" aria-label="Metadata category">
            {#each ["All", ...CATEGORY_ORDER] as category}
              <button class:active={metaCategory === category} aria-pressed={metaCategory === category} onclick={() => metaCategory = category}>{category}</button>
            {/each}
          </div>
          {#if metaMode === "grouped"}
            {@const cats = categorizeEntries(current.fullMap)}
            <div class="catgrid">
              {#each CATEGORY_ORDER as cat}
                {@const all = cats[cat] || []}
                {@const rows = filterEntries(all, metaQuery)}
                {#if (metaCategory === "All" || metaCategory === cat) && cat === "GPS" && all.length === 0 && !metaQuery}
                  <article class="catcard"><h2>GPS <span class="n">0</span></h2><p class="muted small">Not present in this file.</p></article>
                {:else if rows.length && (metaCategory === "All" || metaCategory === cat)}
                  <article class="catcard">
                    <h2>{cat} <span class="n">{rows.length}</span></h2>
                    <dl>{#each rows as e}<div><dt>{e.tag} <span class="src">{e.group}</span></dt><dd>{e.value === "" ? "—" : e.value}</dd></div>{/each}</dl>
                  </article>
                {/if}
              {/each}
            </div>
            {#if metaQuery && filterEntries(toEntries(current.fullMap), metaQuery).length === 0}<p class="muted">No fields match “{metaQuery}”.</p>{/if}
            {#if current.parseStatus === "ready" && toEntries(current.fullMap).length === 0}
              <p class="muted">Full EXIF returned no tags for this file.</p>
            {/if}
          {:else}
            {@const cats = categorizeEntries(current.fullMap)}
            {@const rows = filterEntries(metaCategory === "All" ? toEntries(current.fullMap) : cats[metaCategory] || [], metaQuery)}
            <div class="rawwrap">
              <table>
                <thead><tr><th scope="col">Group</th><th scope="col">Tag</th><th scope="col">Value</th></tr></thead>
                <tbody>
                  {#each rows as e}<tr><td><span class="src">{e.group}</span></td><td>{e.tag}</td><td>{e.value === "" ? "—" : e.value}</td></tr>{/each}
                </tbody>
              </table>
              {#if !rows.length}<p class="muted small">No fields match “{metaQuery}”.</p>{/if}
              {#if !hasGps(current)}<p class="muted small">GPS: Not present in this file.</p>{/if}
            </div>
          {/if}
        </section>
      {:else if view === "compare"}
        <section class="cmp" aria-labelledby="cmp-h">
          <h1 id="cmp-h">Frames, side by side.</h1>
          <p class="crumb">{cards.length} original{cards.length === 1 ? "" : "s"}</p>
          <div class="toolbar">
            <label class="switch"><input type="checkbox" bind:checked={showDiff} /> Show differences{#if differing.length} ({differing.length}){/if}</label>
            <label class="search"><span class="visually-hidden">Search compared metadata</span><input type="search" placeholder="Search compared fields…" bind:value={compareQuery} aria-label="Search compared fields" /></label>
          </div>
          <div class="cmpgrid">
            {#each cards as c (c.id)}
              {@const ex = exposureOf(c)}
              <article class="cmpcard" class:sel={current && c.id === current.id} aria-label={c.name}>
                <button class="cmphead" onclick={() => { selectedId = c.id; }} aria-label={"Select " + c.name}>
                  {#if c.isJpeg && c.objectURL}
                    <img src={c.objectURL} alt="" />
                  {:else}
                    <div class="rawph small" aria-hidden="true"><span class="rawext">{c.ext ? c.ext.toUpperCase() : "RAW"}</span></div>
                  {/if}
                  <span class="cmpname">{c.name}</span>
                  <span class="muted small">{c.model}</span>
                </button>
                <div class="cmpcount">{c.fileNumber ? formatCount(c.shutter) : c.shutter != null ? formatCount(c.shutter) : "—"}</div>
                <p class="cap">{c.fileNumber ? "File number — not a shutter count" : c.source === "r10-blob" ? "Total actuations" : "Shutter count"}</p>
                {#if c.badge}<span class="pill" class:exp={c.experimental}>{c.badge}</span>{/if}
                {#if c.note && !c.fileNumber}<p class="muted small">{c.note}</p>{/if}
                <div class="cmpexp">
                  <div><span>ISO</span><strong>{ex.iso || "—"}</strong></div>
                  <div><span>Shutter</span><strong>{fmtShutter(ex.shutter)}</strong></div>
                  <div><span>Aperture</span><strong>{fmtAperture(ex.aperture)}</strong></div>
                </div>
                <dl class="cmprows">
                  {#each compareDetailRows(c) as r}
                    <div><dt>{r[0]}</dt><dd>{r[1]}</dd></div>
                  {/each}
                </dl>
                {#if showDiff}
                  {@const entries = filterEntries(toEntries(c.fullMap), compareQuery).filter(function (e) { return differingSet[e.key]; })}
                  <div class="diffbox">
                    <h3>Differing fields ({entries.length})</h3>
                    {#if entries.length}
                      <p class="muted small">See the complete comparison below.</p>
                    {:else}
                      <p class="muted small">No differing fields{cards.length < 2 ? " — add another photo to compare." : " match this search."}</p>
                    {/if}
                  </div>
                {/if}
                <button class="ghost" onclick={() => { selectedId = c.id; view = "metadata"; }}>Explore {c.tagCount || toEntries(c.fullMap).length} fields</button>
              </article>
            {/each}
          </div>
          <div class="rawwrap comparison-table">
            <h2>{showDiff ? "Every differing field" : "Every field, side by side"}</h2>
            <table>
              <thead><tr><th scope="col">Field</th>{#each cards as c}<th scope="col">{c.name}</th>{/each}</tr></thead>
              <tbody>{#each allComparedRows() as row}<tr class:diff={Boolean(differingSet[row.key])}><th scope="row">{row.key}</th>{#each row.values as value}<td>{value === null ? "Not present" : value === "" ? "—" : value}</td>{/each}</tr>{/each}</tbody>
            </table>
            {#if !allComparedRows().length}<p class="muted">No compared fields match the current filters.</p>{/if}
          </div>

        </section>
      {/if}

      <input
        bind:this={fileInput} type="file" hidden
        accept=".cr3,.jpg,.jpeg,.hif,.heif"
        onchange={(e) => { handleFiles(e.currentTarget.files, pickerMode); e.currentTarget.value = ""; }}
      />
    </main>

    <footer>RF EXIF · Free · Photos stay on your device · Independent tool for Canon photographers</footer>
  </div>
</div>

<style>
  /* component-local tweaks live in styles.css; nothing needed here */
</style>
