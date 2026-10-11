<script>
  import { base } from '$app/paths';
  let { active = '' } = $props();
</script>

<header class="site-header">
  <a class="brand-home" href={`${base}/`} aria-label="RF EXIF home">
    <img class="brand-wordmark" src={`${base}/brand/wordmark.svg`} alt="RF EXIF" width="144" height="36" />
  </a>
  <nav aria-label="Equipment">
    <a href={`${base}/cameras`} aria-current={active === 'camera' ? 'page' : undefined}>R cameras</a>
    <a href={`${base}/lenses`} aria-current={active === 'lens' ? 'page' : undefined}>RF lenses</a>
  </nav>
</header>
