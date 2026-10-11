import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({ pages: "build", assets: "build", fallback: undefined, precompress: false }),
    // Project Pages live under /<repo>. Override for custom domains:
    // PAGES_BASE="" npm run build
    paths: { base: process.env.PAGES_BASE ?? "/RFExif" },
  },
};

export default config;
