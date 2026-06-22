export type ThemeBg = 'dark' | 'amoled' | 'dim' | 'light';
export type ThemeAccent = 'blue' | 'purple' | 'emerald' | 'rose' | 'orange' | 'cyan' | 'indigo' | 'violet' | 'fuchsia' | 'lime' | 'teal' | 'amber';

export const backgroundPalettes: Record<ThemeBg, any> = {
  dark: { '--bg-app': '#0F1115', '--bg-sidebar': '#0A0C10', '--bg-header': '#12141C', '--bg-panel': '#1A1D26', '--border-color': '#2D3139', '--border-hover': '#3D4455', '--text-main': '#E2E8F0', '--text-muted': '#64748B', '--text-darker': '#475569', '--text-light': '#94A3B8', '--is-dark': '1', '--bg-input': '#1A1D26' },
  amoled: { '--bg-app': '#000000', '--bg-sidebar': '#000000', '--bg-header': '#000000', '--bg-panel': '#09090B', '--border-color': '#27272A', '--border-hover': '#3F3F46', '--text-main': '#FAFAFA', '--text-muted': '#A1A1AA', '--text-darker': '#71717A', '--text-light': '#D4D4D8', '--is-dark': '1', '--bg-input': '#09090B' },
  dim: { '--bg-app': '#1C1C1E', '--bg-sidebar': '#18181A', '--bg-header': '#18181A', '--bg-panel': '#2C2C2E', '--border-color': '#3A3A3C', '--border-hover': '#48484A', '--text-main': '#F2F2F7', '--text-muted': '#8E8E93', '--text-darker': '#636366', '--text-light': '#AEAEB2', '--is-dark': '1', '--bg-input': '#2C2C2E' },
  light: { '--bg-app': '#F8FAFC', '--bg-sidebar': '#F1F5F9', '--bg-header': '#FFFFFF', '--bg-panel': '#FFFFFF', '--border-color': '#E2E8F0', '--border-hover': '#CBD5E1', '--text-main': '#0F172A', '--text-muted': '#64748B', '--text-darker': '#94A3B8', '--text-light': '#475569', '--is-dark': '0', '--bg-input': '#FFFFFF' }
};

export const accentPalettes: Record<ThemeAccent, any> = {
  blue: { '--accent-color': '#2563EB', '--accent-hover': '#3B82F6', '--accent-light': '#60A5FA' },
  purple: { '--accent-color': '#7C3AED', '--accent-hover': '#8B5CF6', '--accent-light': '#A78BFA' },
  emerald: { '--accent-color': '#059669', '--accent-hover': '#10B981', '--accent-light': '#34D399' },
  rose: { '--accent-color': '#E11D48', '--accent-hover': '#F43F5E', '--accent-light': '#FB7185' },
  orange: { '--accent-color': '#EA580C', '--accent-hover': '#F97316', '--accent-light': '#FB923C' },
  cyan: { '--accent-color': '#0891B2', '--accent-hover': '#06B6D4', '--accent-light': '#22D3EE' },
  indigo: { '--accent-color': '#4F46E5', '--accent-hover': '#6366F1', '--accent-light': '#818CF8' },
  violet: { '--accent-color': '#6D28D9', '--accent-hover': '#8B5CF6', '--accent-light': '#A78BFA' },
  fuchsia: { '--accent-color': '#C026D3', '--accent-hover': '#D946EF', '--accent-light': '#E879F9' },
  lime: { '--accent-color': '#65A30D', '--accent-hover': '#84CC16', '--accent-light': '#A3E635' },
  teal: { '--accent-color': '#0D9488', '--accent-hover': '#14B8A6', '--accent-light': '#2DD4BF' },
  amber: { '--accent-color': '#D97706', '--accent-hover': '#F59E0B', '--accent-light': '#FBBF24' },
};

export function getThemeStyles(bg: ThemeBg, accent: ThemeAccent) {
  const isDark = backgroundPalettes[bg]['--is-dark'] === '1';
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
  };
  const accentHex = accentPalettes[accent]['--accent-hover'];
  const accentRgb = hexToRgb(accentHex);
  
  return {
    ...backgroundPalettes[bg],
    ...accentPalettes[accent],
    '--accent-transparent': `rgba(${accentRgb}, ${isDark ? '0.1' : '0.15'})`,
    '--accent-border': `rgba(${accentRgb}, ${isDark ? '0.2' : '0.3'})`,
    '--accent-glow': `rgba(${accentRgb}, ${isDark ? '0.5' : '0.3'})`,
    '--shadow-color': isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
  } as React.CSSProperties;
}
