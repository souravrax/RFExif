<script>
  import { base } from '$app/paths';
  import BrandHeader from './BrandHeader.svelte';
  import '../routes/styles.css';
  let { data } = $props();
  let query = $state('');
  let make = $state('');
  let focus = $state('');
  let format = $state('');
  let kind = $state('');
  let family = $state('');
  let sort = $state('name');
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  let isLens = $derived(data.type === 'lens');
  let makes = $derived([...new Set(data.entries.map(entry => entry.make))].sort());
  let families = $derived([...new Set(data.entries.map(entry => entry.model.replace(/ Mark .*| V$/, '')))].sort(collator.compare));
  let shown = $derived.by(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.entries.filter(entry => {
      const text = `${entry.make} ${entry.model} ${entry.mount} ${entry.aliases.join(' ')}`.toLowerCase();
      return words.every(word => text.includes(word)) && (!make || entry.make === make)
        && (!focus || entry.focus === focus)
        && (!format || (format === 'unknown' ? !entry.sensorFormat : entry.sensorFormat === format))
        && (!kind || entry.focalLength?.type === kind)
        && (!family || entry.model.replace(/ Mark .*| V$/, '') === family);
    }).sort((a, b) => {
      if (sort === 'focal') return (a.focalLength?.minMm ?? Infinity) - (b.focalLength?.minMm ?? Infinity) || collator.compare(a.model, b.model);
      if (sort === 'make') return collator.compare(a.make, b.make) || collator.compare(a.model, b.model);
      return collator.compare(a.model, b.model) * (sort === 'reverse' ? -1 : 1);
    });
  });
  function reset() { query = ''; make = ''; focus = ''; format = ''; kind = ''; family = ''; sort = 'name'; }
  $effect(() => { data.type; reset(); });
</script>

<svelte:head><title>{isLens ? 'RF lenses' : 'EOS R cameras'} — RF EXIF</title></svelte:head>
<div class="app">
  <BrandHeader active={data.type} />
  <main class="directory">
    <p class="kicker">THE R SYSTEM · EQUIPMENT DIRECTORY</p>
    <h1>{isLens ? 'Glass with character.' : 'Meet the R family.'}</h1>
    <p class="directory-intro">{isLens ? 'Explore native RF and RF-S lenses. From everyday zooms to curious cine glass.' : 'Explore the Canon EOS R bodies in our illustrated collection.'}</p>
    <div class="directory-controls">
      <label class="directory-search">Search<input type="search" bind:value={query} placeholder={isLens ? 'Try Canon 18-150 or Sigma…' : 'Try R5 or R50…'} /></label>
      {#if isLens}
        <label>Make<select bind:value={make}><option value="">All makes</option>{#each makes as brand}<option value={brand}>{brand}</option>{/each}</select></label>
        <label>Focus<select bind:value={focus}><option value="">All focus types</option><option value="autofocus">Autofocus</option><option value="manual">Manual focus</option></select></label>
        <label>Coverage<select bind:value={format}><option value="">All coverage</option><option value="APS-C">APS-C</option><option value="full-frame">Full frame</option><option value="Super 35">Super 35</option><option value="unknown">Unresearched</option></select></label>
        <label>Lens type<select bind:value={kind}><option value="">All types</option><option value="prime">Prime</option><option value="zoom">Zoom</option></select></label>
      {:else}
        <label>Camera family<select bind:value={family}><option value="">All R families</option>{#each families as name}<option value={name}>{name}</option>{/each}</select></label>
      {/if}
      <label>Sort<select bind:value={sort}><option value="name">Model A–Z</option><option value="reverse">Model Z–A</option>{#if isLens}<option value="make">Make A–Z</option><option value="focal">Focal length ↑</option>{/if}</select></label>
    </div>
    <div class="directory-results"><p aria-live="polite">{shown.length} of {data.entries.length} {isLens ? 'lenses' : 'cameras'}</p><button class="ghost" onclick={reset}>Reset filters</button></div>
    <div class="directory-grid">
      {#each shown as entry (entry.id)}
        <article class="equipment-card">
          <div class="equipment-card-top"><span>{entry.make}</span><span>{entry.series || 'RF'}</span></div>
          {#if entry.image}<img src={`${base}/${entry.image}`} alt={`${entry.make} ${entry.model} illustration`} loading="lazy" width="240" height="240" />{/if}
          <h2>{entry.model}</h2>
          <p class="equipment-facts">{entry.mount}{#if entry.focus} · {entry.focus === 'autofocus' ? 'Autofocus' : 'Manual focus'}{/if}</p>
          {#if isLens}<p class="equipment-facts">{entry.sensorFormat || 'Coverage unresearched'}{#if entry.focalLength} · {entry.focalLength.type}{/if}{#if entry.status === 'historical'} · Historical{/if}</p>{/if}
          <div class="equipment-links"><a href={`${base}/catalog/${entry.detail}`}>Full metadata ↗</a>{#if entry.source}<a href={entry.source} target="_blank" rel="noreferrer">Source ↗</a>{/if}</div>
        </article>
      {:else}
        <div class="directory-empty"><h2>No matches. Try a wider view.</h2><p>Change your search or reset the filters.</p></div>
      {/each}
    </div>
    <p class="directory-note">Illustrations are generated artwork. This is a growing collection, not an exhaustive catalog or a camera support list. Unknown specifications remain unresearched. RF-S lenses use the Canon RF mount.</p>
  </main>
</div>
