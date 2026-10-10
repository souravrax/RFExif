<script>
  import { readJpegExif } from "$lib/exif/r10.js";
  import { read as registryRead } from "$lib/exif/registry.js";
  import "$lib/cameras/index.js";
  import "./styles.css";

  let cards = $state([]);
  let dragOver = $state(false);
  /** @type {HTMLInputElement | undefined} */
  let fileInput = $state();

  function fmt(n) {
    return n.toLocaleString("en-US");
  }

  async function handleFiles(list) {
    for (const file of list) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const exif = readJpegExif(bytes);
        const hit = registryRead({ bytes, exif, fileName: file.name });
        if (!hit) {
          cards = [{
            id: file.name + Date.now(), name: file.name, model: file.name,
            shutter: null, badge: null, note: "",
            rows: [["Hint", "Use an original CR3 or JPG straight from the camera — edited exports strip the MakerNote blob this reader needs."]],
          }, ...cards];
          continue;
        }
        const { extractor, result } = hit;
        const rated = extractor.ratedLife || 0;
        const rows = [
          ["File", `${file.name} (${(file.size / 1048576).toFixed(1)} MB)`],
          ["Checked", new Date().toLocaleString()],
        ];
        if (exif.DateTime) rows.push(["Taken", exif.DateTime]);
        if (exif.ISO) rows.push(["ISO", exif.ISO]);
        if (exif.ExposureTime) rows.push(["Shutter", "1/" + Math.round(1 / parseFloat(exif.ExposureTime)) + " s"]);
        if (exif.FNumber) rows.push(["Aperture", "f/" + exif.FNumber]);
        if (exif.FocalLength) rows.push(["Focal", exif.FocalLength]);
        cards = [{
          id: file.name + Date.now(), name: file.name, model: extractor.label,
          shutter: result.value, badge: result.experimental ? `experimental · ${result.source}` : null,
          note: result.note, rated, rows,
        }, ...cards];
      } catch (e) {
        cards = [{
          id: file.name + Date.now(), name: file.name, model: file.name,
          shutter: null, badge: null, note: "",
          rows: [["Error", String(e && e.message || e)]],
        }, ...cards];
      }
    }
  }

  function pct(shutter, rated) {
    return Math.min(100, Math.round((shutter / rated) * 100));
  }
</script>

<header class="top">
  <div class="brand">Shutter<span>Drop</span></div>
  <div class="top-note">Web · 100% local</div>
</header>

<main>
  <section class="hero">
    <p class="kicker">Canon shutter count — from a photo</p>
    <h1>Drop a photo.<br />Get the count.</h1>
    <p class="sub">Original, unedited CR3 or JPG straight from the camera.
      Files never leave your device — everything is read in your browser.</p>
  </section>

  <section
    class="dropzone"
    class:over={dragOver}
    role="button" tabindex="0"
    aria-label="Drop photos here or click to browse"
    onclick={() => fileInput?.click()}
    onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput?.click(); }}
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragenter={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={(e) => { e.preventDefault(); dragOver = false; }}
    ondrop={(e) => { e.preventDefault(); dragOver = false; handleFiles(e.dataTransfer.files); }}
  >
    <div class="dz-icon">▣</div>
    <p><strong>Drag photos here</strong> or <span class="link">browse files</span></p>
    <p class="muted small">CR3 · JPG · HIF — multiple files welcome</p>
    <input
      bind:this={fileInput} type="file" hidden
      accept=".cr3,.jpg,.jpeg,.hif,.heif" multiple
      onchange={(e) => { handleFiles(e.currentTarget.files); e.currentTarget.value = ""; }}
    />
  </section>

  <section class="steps">
    <div class="step"><span>01 · Drop</span>Unedited file from the camera.</div>
    <div class="step"><span>02 · Result</span>Exact count on a clean card.</div>
    <div class="step"><span>03 · Compare</span>% of rated life, at a glance.</div>
  </section>

  <section class="cards">
    {#each cards as c (c.id)}
      <article class="card">
        <div class="model">{c.model}</div>
        <span class="via">Via photo · {c.name}</span>
        <div class="count">{c.shutter != null ? fmt(c.shutter) : "—"}</div>
        <div class="cap">Shutter count</div>
        {#if c.shutter != null && c.rated > 0}
          <div class="bar"><i style="width:{pct(c.shutter, c.rated)}%"></i></div>
          <div class="pct">{pct(c.shutter, c.rated)}% used of {fmt(c.rated)} rated</div>
        {/if}
        {#if c.badge}<span class="badge-exp">{c.badge}</span>{/if}
        {#if c.note}<p class="muted small">{c.note}</p>{/if}
        <table>
          {#each c.rows as r}<tr><td>{r[0]}</td><td>{r[1]}</td></tr>{/each}
        </table>
      </article>
    {/each}
  </section>

  <section class="fine muted">
    <p>R10 readings use experimental blob offset <code>0xC93</code> (total mechanical +
    electronic). Native EXIF carries no R10 shutter count — this offset was
    reverse-engineered from 14 consecutive shots.</p>
    <p>Rated life: EOS R10 ≈ 100,000 actuations. Community cameras welcome —
    see <code>web/CONTRIBUTING.md</code>.</p>
  </section>
</main>

<footer>ShutterDrop Web · local-only · ExifTool powers the desktop app</footer>

<style>
  /* component-local tweaks live in styles.css; nothing needed here */
</style>
