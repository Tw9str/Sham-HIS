'use client';
import { useSyncExternalStore } from 'react';
import { modules, type Lang, type View } from '@/lib/catalog';
function subscribeLanguage(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('sham-language', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('sham-language', callback);
  };
}
function languageSnapshot(): Lang {
  return localStorage.getItem('sham-language') === 'ar' ? 'ar' : 'en';
}
function subscribeRoute(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}
function routeSnapshot(): View {
  const value = window.location.hash.slice(1);
  return [
    'dashboard',
    'patients',
    'reports',
    'audit',
    'settings',
    ...modules.map((m) => m.id),
  ].includes(value)
    ? (value as View)
    : 'dashboard';
}
export function useBrowserPreferences() {
  const lang = useSyncExternalStore(subscribeLanguage, languageSnapshot, () => 'en' as Lang);
  const view = useSyncExternalStore(subscribeRoute, routeSnapshot, () => 'dashboard' as View);
  const setLang = (value: Lang) => {
    localStorage.setItem('sham-language', value);
    window.dispatchEvent(new Event('sham-language'));
  };
  return { lang, setLang, view };
}
