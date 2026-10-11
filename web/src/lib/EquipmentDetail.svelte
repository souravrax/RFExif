<script>
  import { base } from '$app/paths';
  import BrandHeader from './BrandHeader.svelte';
  import { CAMERA_SPEC_SECTIONS, formatSpec } from './camera-specs.js';
  import '../routes/styles.css';
  let { data } = $props();
  let record = $derived(data.record);
  let lens = $derived(data.type === 'lens');
  function label(key) { return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/Mm$/, ' (mm)').replace(/G$/, ' (g)').replace(/M$/, ' (m)').replace(/^./, letter => letter.toUpperCase()); }
  function value(item) { return item == null ? 'Unresearched' : typeof item === 'boolean' ? (item ? 'Yes' : 'No') : Array.isArray(item) ? item.join(' · ') || 'None recorded' : String(item); }
  function flatten(object, prefix = '') {
    return Object.entries(object || {}).flatMap(([key, item]) => {
      const title = prefix ? `${prefix} · ${label(key)}` : label(key);
      return item && typeof item === 'object' && !Array.isArray(item) ? flatten(item, title) : [[title, value(item)]];
    });
  }
  let focal = $derived(record.focalLength ? `${record.focalLength.minMm}${record.focalLength.maxMm !== record.focalLength.minMm ? '–' + record.focalLength.maxMm : ''} mm` : '—');
  let aperture = $derived(record.maximumAperture ? `${record.maximumAperture.unit === 'T-stop' ? 'T' : 'f/'}${record.maximumAperture.wide}${record.maximumAperture.tele !== record.maximumAperture.wide ? '–' + record.maximumAperture.tele : ''}` : '—');
  let identity = $derived([['Make',record.make],['Model',record.model],['Physical mount',record.mount],['Series',record.series || 'Not recorded'],['Coverage',record.sensorFormat || 'Unresearched'],['Focus',record.focus || 'Not recorded'],['Catalog status',record.status || 'Not recorded'],['Categories',value(record.categories)],['Aliases',value(record.aliases)],['Equipment ID',record.id]]);
  // Camera derivations: every field stays honest — null renders "Unresearched".
  let specs = $derived(record.specifications || {});
  let sensorLine = $derived(specs.effectiveMegapixels ? `${specs.effectiveMegapixels} MP${record.sensorFormat ? ` · ${record.sensorFormat}` : ''}` : (record.sensorFormat || 'Unresearched'));
  let videoLine = $derived(specs.maxVideoResolution || 'Unresearched');
  let support = $derived(record.shutterSupport || null);
  let supportLine = $derived(!support ? 'Not mapped' : support.strategies.some(strategy => !strategy.experimental) ? 'Supported' : 'Experimental');
  let cameraIdentity = $derived([['Make',record.make],['Model',record.model],['Physical mount',record.mount],['Series',record.series || 'Not recorded'],['Sensor coverage',record.sensorFormat || 'Unresearched'],['Equipment ID',record.id],['Aliases',value(record.aliases)]]);
  function strategyKind(kind) { return kind === 'blob-scan' ? 'Hidden counter scan' : kind === 'exif-tag' ? 'Native EXIF tag' : kind === 'filename' ? 'File number fallback' : kind; }
</script>

<svelte:head><title>{record.make} {record.model} — RF EXIF</title><meta name="description" content={`Explore ${record.make} ${record.model}: ${record.mount} equipment information, specifications and illustration.`} /></svelte:head>
<div class="app">
  <BrandHeader active={data.type} />
  <main class="equipment-detail">
    <a class="detail-back" href={`${base}/${lens ? 'lenses' : 'cameras'}`}>← All {lens ? 'RF lenses' : 'R cameras'}</a>
    <section class="detail-hero" aria-labelledby="equipment-title">
      <div class="detail-title"><p class="kicker">{record.make} · {record.mount} · {lens ? 'LENS PROFILE' : 'CAMERA PROFILE'}</p><h1 id="equipment-title">{record.model}</h1><p class="detail-deck">{lens ? 'Get to know the glass.' : 'Get to know the body.'}<br />One profile. Every recorded detail.</p></div>
      <div class="detail-art">{#if record.image}<img src={`${base}/${record.image.path}`} alt={`${record.make} ${record.model} illustration`} width="480" height="480" />{/if}<span>Illustration · RF EXIF</span></div>
    </section>
    <section class="detail-highlights" aria-label="At a glance">
      <article><p>PHYSICAL MOUNT</p><strong>{record.mount}</strong></article>
      {#if lens}
        <article><p>FOCAL LENGTH</p><strong>{focal}</strong></article>
        <article><p>MAXIMUM APERTURE</p><strong>{aperture}</strong></article>
      {:else}
        <article><p>SENSOR</p><strong>{sensorLine}</strong></article>
        <article><p>MAX VIDEO</p><strong>{videoLine}</strong></article>
      {/if}
    </section>
    {#if lens}
      <p class="detail-note">Focal length and aperture are parsed from catalog model labels. Detailed specifications below are unresearched where marked.</p>
      <div class="detail-sections">
        <section><h2>The essentials.</h2><dl>{#each identity as [key,item]}<div><dt>{key}</dt><dd class:unresearched={item === 'Unresearched'}>{item}</dd></div>{/each}</dl></section>
        <section><h2>By the numbers.</h2><dl>{#each Object.entries(record.specifications || {}) as [key,item]}<div><dt>{label(key)}</dt><dd class:unresearched={item == null}>{value(item)}</dd></div>{/each}</dl></section>
        <section><h2>Behind the details.</h2><dl>{#each flatten(record.metadataProvenance) as [key,item]}<div><dt>{key}</dt><dd>{item}</dd></div>{/each}<div><dt>Catalog verified</dt><dd>{record.catalogVerifiedAt || 'Not recorded'}</dd></div></dl>{#if record.source}<a class="detail-source" href={record.source} target="_blank" rel="noreferrer">Read the catalog source ↗</a>{/if}</section>
      </div>
    {:else}
      <p class="detail-note">Full-frame and APS-C coverage follow Canon's R-series lineup. Every specification marked Unresearched is waiting on an official manufacturer source — never a guess.</p>
      <div class="detail-sections">
        <section><h2>The essentials.</h2><dl>{#each cameraIdentity as [key,item]}<div><dt>{key}</dt><dd class:unresearched={item === 'Unresearched'}>{item}</dd></div>{/each}</dl></section>
        <section class="support-panel"><h2>Shutter count.</h2><p class="support-status"><span class="support-badge" class:ok={supportLine === 'Supported'} class:exp={supportLine === 'Experimental'}>{supportLine}</span>{#if support?.ratedLife}<span class="support-rated">Rated {support.ratedLife.toLocaleString('en-US')} shots</span>{/if}</p>
          {#if support}
            <ul class="support-list">{#each support.strategies as strategy}<li><strong>{strategyKind(strategy.kind)}</strong><span class="support-meta">{strategy.platforms.join(' + ')}{#if strategy.experimental} · experimental{/if}{#if strategy.tag} · {strategy.tag}{/if}</span>{#if strategy.note}<span class="support-note">{strategy.note}</span>{/if}</li>{/each}</ul>
          {:else}
            <p class="support-note">No counter mapping lives in <code>cameras/*/camera.toml</code> for this body yet. File numbers are never presented as shutter counts.</p>
          {/if}
        </section>
        {#each CAMERA_SPEC_SECTIONS as group}
          <section><h2>{group.title}</h2><dl>{#each group.fields as field}<div><dt>{field.label}</dt><dd class:unresearched={specs[field.key] == null}>{formatSpec(field.key, specs[field.key])}</dd></div>{/each}</dl></section>
        {/each}
        <section><h2>Behind the details.</h2><dl>{#each flatten(record.metadataProvenance) as [key,item]}<div><dt>{key}</dt><dd>{item}</dd></div>{/each}<div><dt>Catalog verified</dt><dd>{record.catalogVerifiedAt || 'Not recorded'}</dd></div></dl>{#if record.source}<a class="detail-source" href={record.source} target="_blank" rel="noreferrer">Read the catalog source ↗</a>{/if}</section>
      </div>
    {/if}
    <details class="detail-audit"><summary>Illustration and asset information</summary><p>Generated artwork is illustrative and may differ from the actual product. It does not establish specifications.</p><dl>{#each flatten(record.image) as [key,item]}<div><dt>{key}</dt><dd>{item}</dd></div>{/each}</dl></details>
    <p class="detail-note">RF-S describes APS-C coverage; its physical mount is Canon RF. RF EXIF is an independent project.</p>
  </main>
</div>
