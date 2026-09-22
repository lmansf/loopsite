/**
 * src/lib/tokens.ts — the ONLY reader of CSS custom properties.
 *
 * Spec: design/05-build-spec.md §F.4. FROZEN after WP0.
 * Canvas code never hardcodes a colour: it asks for a token by name.
 */

const cache = new Map<string, string>();
let probe: HTMLSpanElement | null = null;

function computedRoot(): CSSStyleDeclaration | null {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement);
}

/** Resolve a custom property, e.g. token('--color-loop-accent') -> '#4FE9C4'. */
export function token(name: string): string {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const root = computedRoot();
  const value = root ? root.getPropertyValue(name).trim() : '';
  cache.set(name, value);
  return value;
}

/** Clear the cache. Call on a theme change. */
export function refreshTokens(): void {
  cache.clear();
  if (probe?.parentNode) probe.parentNode.removeChild(probe);
  probe = null;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const rgbCache = new Map<string, Rgb>();

function parseColor(value: string): Rgb {
  const hit = rgbCache.get(value);
  if (hit) return hit;

  let out: Rgb = { r: 255, g: 255, b: 255 };
  const v = value.trim();

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(v);
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v);

  if (long) {
    out = {
      r: parseInt(long[1] as string, 16),
      g: parseInt(long[2] as string, 16),
      b: parseInt(long[3] as string, 16),
    };
  } else if (short) {
    out = {
      r: parseInt((short[1] as string).repeat(2), 16),
      g: parseInt((short[2] as string).repeat(2), 16),
      b: parseInt((short[3] as string).repeat(2), 16),
    };
  } else if (fn) {
    out = { r: +(fn[1] as string), g: +(fn[2] as string), b: +(fn[3] as string) };
  } else if (typeof document !== 'undefined' && v) {
    // color-mix(), oklab(), a keyword… let the engine resolve it for us once.
    if (!probe) {
      probe = document.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
      document.body.appendChild(probe);
    }
    probe.style.color = 'rgb(255,255,255)';
    probe.style.color = v;
    const resolved = getComputedStyle(probe).color;
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(resolved);
    if (m) out = { r: +(m[1] as string), g: +(m[2] as string), b: +(m[3] as string) };
  }

  rgbCache.set(value, out);
  return out;
}

/** Resolve a token and apply an alpha: rgba('--c-accent', 0.22). */
export function rgba(name: string, alpha: number): string {
  const { r, g, b } = parseColor(token(name) || '#ffffff');
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

/** duration('--dur-6') -> 520. Accepts ms or s. */
export function duration(name: string): number {
  const v = token(name);
  if (!v) return 0;
  if (v.endsWith('ms')) return parseFloat(v) || 0;
  if (v.endsWith('s')) return (parseFloat(v) || 0) * 1000;
  return parseFloat(v) || 0;
}
