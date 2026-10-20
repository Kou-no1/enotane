/** Versioned FNV-1a / Mulberry32. All painting randomness is compiled, never frame-driven. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join('\u001f')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let t = state += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function randomAt(seed: number, index: number): number { return rng(hashSeed(seed, index))(); }
