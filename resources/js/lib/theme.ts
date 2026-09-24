export interface ThemePreset {
  id: string;
  name: string;
  bg: string;
  panel: string;
  accent: string;
}

export const THEMES: ThemePreset[] = [
  { id: 'midnight-luxe',  name: 'Midnight Luxe',   bg: '#0A0E1A', panel: '#141A2E', accent: '#7C6CF5' },
  { id: 'obsidian-teal',  name: 'Obsidian Teal',   bg: '#071316', panel: '#0F2226', accent: '#2DD4BF' },
  { id: 'carbon-amber',   name: 'Carbon Amber',    bg: '#0C0C0D', panel: '#17181A', accent: '#F59E0B' },
  { id: 'royal-plum',     name: 'Royal Plum',      bg: '#12091B', panel: '#1D1029', accent: '#C084FC' },
  { id: 'nordic-steel',   name: 'Nordic Steel',    bg: '#0D1117', panel: '#161B22', accent: '#3B82F6' },
  { id: 'paper-light',    name: 'Paper Light',     bg: '#F7F8FB', panel: '#FFFFFF', accent: '#4F46E5' },
];

export const DEFAULT_THEME = 'midnight-luxe';

export function applyTheme(id: string): void {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem('pymetory.theme', id); } catch (e) { /* incógnito */ }
}

export function currentTheme(): string {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}
