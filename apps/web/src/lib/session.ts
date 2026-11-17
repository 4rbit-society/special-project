export const tokenKey = 'araw-session-token-v1';
function storage(kind: 'sessionStorage' | 'localStorage'): Storage | undefined {
  try { return globalThis[kind]; } catch { return undefined; }
}
function read(kind: 'sessionStorage' | 'localStorage') {
  try { return storage(kind)?.getItem(tokenKey) ?? null; } catch { return null; }
}
export const readToken = () => read('sessionStorage') ?? read('localStorage');
export const hasTabSession = (token: string) => read('sessionStorage') === token;
export function clearToken(expected: string | null) {
  // Another tab may have signed in since this request started. Never erase its token.
  for (const kind of ['sessionStorage', 'localStorage'] as const) {
    try { const store = storage(kind); if (store?.getItem(tokenKey) === expected) store.removeItem(tokenKey); } catch { /* Memory logout still succeeds. */ }
  }
}
export function writeToken(token: string, remember: boolean, previous: string | null): boolean {
  clearToken(previous);
  try { const store = storage(remember ? 'localStorage' : 'sessionStorage'); if (!store) return false; store.setItem(tokenKey, token); return true; } catch { return false; }
}
