/** Server clock in epoch ms (a named helper so pages can read it without tripping the render-purity lint). */
export const currentTimeMs = (): number => Date.now();
