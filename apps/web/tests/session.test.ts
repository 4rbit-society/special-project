import { afterEach, expect, it, vi } from 'vitest';
import { clearToken, hasTabSession, readToken, tokenKey, writeToken } from '../src/lib/session';
function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) };
}
afterEach(() => vi.unstubAllGlobals());
it('logging out an old session does not erase a newer remembered login', () => {
  const tab = memoryStorage(), local = memoryStorage();
  tab.setItem(tokenKey, 'old'); local.setItem(tokenKey, 'new');
  vi.stubGlobal('sessionStorage', tab); vi.stubGlobal('localStorage', local);
  clearToken('old');
  expect(tab.getItem(tokenKey)).toBeNull(); expect(local.getItem(tokenKey)).toBe('new');
});
it('keeps tab-only sessions independent of a remembered account', () => {
  const tab = memoryStorage(), local = memoryStorage();
  vi.stubGlobal('sessionStorage', tab); vi.stubGlobal('localStorage', local);
  local.setItem(tokenKey, 'remembered');
  expect(writeToken('tab', false, null)).toBe(true);
  expect(readToken()).toBe('tab'); expect(hasTabSession('tab')).toBe(true);
  expect(local.getItem(tokenKey)).toBe('remembered');
});
it('still reads local storage when session storage is unavailable', () => {
  const local = memoryStorage(); local.setItem(tokenKey, 'remembered');
  vi.stubGlobal('localStorage', local); vi.stubGlobal('sessionStorage', { getItem() { throw new Error('Storage blocked'); } });
  expect(readToken()).toBe('remembered');
});
