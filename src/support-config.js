// Set this to your own verified public Ko-fi page URL to enable support.
export const KOFI_URL = 'https://ko-fi.com/1010ten';

export function getKofiUrl(value = KOFI_URL) {
  const url = typeof value === 'string' ? value.trim() : '';
  return /^https:\/\/ko-fi\.com\/[a-z0-9_-]+\/?$/i.test(url) ? url : null;
}
