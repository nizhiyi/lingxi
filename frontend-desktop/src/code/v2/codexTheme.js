/**
 * Codex App 级 Coding View 主题系统
 * 深色为默认，浅色为可选——Codex 风格强调高对比度 + 蓝色强调色
 */

export const CODEX_THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark',
    vars: {
      '--cx-bg': '#0a0a0f',
      '--cx-surface': '#111118',
      '--cx-surface-2': '#1a1a24',
      '--cx-surface-3': '#22222e',
      '--cx-border': 'rgba(255,255,255,0.08)',
      '--cx-border-active': 'rgba(51,156,255,0.4)',
      '--cx-text': '#e8eaf0',
      '--cx-text-2': '#a0a4b0',
      '--cx-text-3': '#5c6070',
      '--cx-accent': '#339cff',
      '--cx-accent-soft': 'rgba(51,156,255,0.12)',
      '--cx-accent-glow': 'rgba(51,156,255,0.3)',
      '--cx-success': '#22c55e',
      '--cx-warning': '#eab308',
      '--cx-error': '#ef4444',
      '--cx-purple': '#a78bfa',
      '--cx-orange': '#fb923c',
    },
  },
  light: {
    id: 'light',
    name: 'Light',
    vars: {
      '--cx-bg': '#ffffff',
      '--cx-surface': '#f8f9fa',
      '--cx-surface-2': '#f0f1f3',
      '--cx-surface-3': '#e8e9eb',
      '--cx-border': 'rgba(0,0,0,0.08)',
      '--cx-border-active': 'rgba(51,156,255,0.5)',
      '--cx-text': '#111118',
      '--cx-text-2': '#555a66',
      '--cx-text-3': '#8c9099',
      '--cx-accent': '#0066cc',
      '--cx-accent-soft': 'rgba(0,102,204,0.08)',
      '--cx-accent-glow': 'rgba(0,102,204,0.2)',
      '--cx-success': '#16a34a',
      '--cx-warning': '#ca8a04',
      '--cx-error': '#dc2626',
      '--cx-purple': '#7c3aed',
      '--cx-orange': '#ea580c',
    },
  },
};

export function applyCodexTheme(themeId) {
  const theme = CODEX_THEMES[themeId] || CODEX_THEMES.dark;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  localStorage.setItem('lingxi-codex-theme', themeId);
}

export function getCodexTheme() {
  return localStorage.getItem('lingxi-codex-theme') || 'dark';
}
