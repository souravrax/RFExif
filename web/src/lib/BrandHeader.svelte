<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  let { active = '' } = $props();
  let dark = $state(false);
  onMount(() => {
    const sync = () => { dark = document.documentElement.dataset.theme === 'dark'; };
    sync();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      let saved;
      try { saved = localStorage.getItem('rfexif-theme'); } catch {}
      if (!saved) document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
      sync();
    };
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  });
  function toggleTheme() {
    dark = !dark;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('rfexif-theme', dark ? 'dark' : 'light'); } catch {}
  }
</script>

<header class="site-header">
  <a class="brand-home" href={`${base}/`} aria-label="RF EXIF home">
    <img class="brand-wordmark" src={`${base}/brand/wordmark.svg`} alt="RF EXIF" width="144" height="36" />
  </a>
  <nav aria-label="Equipment">
    <a href={`${base}/cameras`} aria-current={active === 'camera' ? 'page' : undefined}>R cameras</a>
    <a href={`${base}/lenses`} aria-current={active === 'lens' ? 'page' : undefined}>RF lenses</a>
  </nav>
  <button class="theme-toggle" onclick={toggleTheme} aria-label="Dark theme" aria-pressed={dark} title={dark ? 'Switch to light theme' : 'Switch to dark theme'}><span aria-hidden="true">{dark ? '☀' : '☾'}</span></button>
</header>
