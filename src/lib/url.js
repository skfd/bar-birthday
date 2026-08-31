/**
 * Prefixes an internal path with the configured base.
 *
 * The site lives at a subpath on github.io and at the root under a custom
 * domain, so no internal link may be written as a bare root-relative path.
 */
export function url(path) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}
