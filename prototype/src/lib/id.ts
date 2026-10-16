/** crypto.randomUUID is unavailable over plain http on a LAN address, so build a simple id instead. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
