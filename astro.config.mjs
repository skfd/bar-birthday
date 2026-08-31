// @ts-check
import { defineConfig } from 'astro/config';

// Defaults publish to the project's github.io subpath. When barbirthday.com is
// registered and attached to Pages, set SITE_URL=https://barbirthday.com and
// BASE_PATH=/ in the workflow — no link in the site needs touching, they all go
// through src/lib/url.js.
const site = process.env.SITE_URL ?? 'https://skfd.github.io';
const base = process.env.BASE_PATH ?? '/bar-birthday';

export default defineConfig({
  site,
  base,
  output: 'static',
  build: { format: 'directory' },
});
