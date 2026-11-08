/**
 * Design tokens (Section 7.1). The only place colours, fonts and sizes are written down.
 * Core values come from the Stitch design master prompt; tints, severity, notice-bar,
 * shadow and button-height values come from the exported Stitch screens (Section 18 #39).
 */

export const color = {
  primary: '#0F2A44',
  primaryDeep: '#00152A',
  accent: '#0E7C7B',
  accentHover: '#006A69',
  accentTint: '#98F2F0',
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EFF4FF',
  surfaceSunken: '#E6EEFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#B0C9EA',
  error: '#B91C1C',
  errorTint: '#FEE2E2',
  success: '#15803D',
  successTint: '#DCFCE7',
  warning: '#B45309',
  warningTint: '#FEF3C7',
  info: '#1D4ED8',
  infoTint: '#DBEAFE',
  severity: {
    low: { fg: '#475569', bg: '#F1F5F9' },
    medium: { fg: '#B45309', bg: '#FEF3C7' },
    high: { fg: '#C2410C', bg: '#FFEDD5' },
    critical: { fg: '#B91C1C', bg: '#FEE2E2' },
  },
  notice: {
    public: { fg: '#BA1A1A', bg: '#FFDAD6' },
    app: { fg: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  },
  overlay: 'rgba(15, 42, 68, 0.6)',
} as const;

export const font = {
  family: "'Inter', system-ui, sans-serif",
  familyMono: "'IBM Plex Mono', ui-monospace, monospace",
  size: {
    h1: { size: '28px', lineHeight: '36px', weight: '600', letterSpacing: '-0.02em' },
    h2: { size: '22px', lineHeight: '30px', weight: '600', letterSpacing: '-0.015em' },
    h3: { size: '18px', lineHeight: '26px', weight: '600', letterSpacing: '-0.01em' },
    body: { size: '14px', lineHeight: '22px', weight: '400', letterSpacing: '0em' },
    small: { size: '12px', lineHeight: '18px', weight: '400', letterSpacing: '0.01em' },
    label: { size: '11px', lineHeight: '16px', weight: '600', letterSpacing: '0.05em' },
    mono: { size: '13px', lineHeight: '18px', weight: '500', letterSpacing: '-0.01em' },
  },
} as const;

/** 8px scale (space.1 … space.6) and the 24px gutter. Tailwind's 4px step keeps half-steps available. */
export const space = {
  unit: '4px',
  1: '8px',
  2: '16px',
  3: '24px',
  4: '32px',
  5: '40px',
  6: '48px',
  gutter: '24px',
} as const;

export const layout = {
  grid: 12,
  desktop: '1440px',
  tablet: '1024px',
  mobile: '390px',
  content: '1280px',
  sidebar: '248px',
  rail: '80px',
  topBar: '64px',
  noticeBar: '36px',
} as const;

export const radius = {
  card: '8px',
  input: '8px',
  chip: '6px',
} as const;

export const border = {
  width: '1px',
} as const;

export const size = {
  icon: '20px',
  iconSmall: '16px',
  button: '40px',
  touchMin: '44px',
  chip: '24px',
} as const;

export const shadow = {
  card: '0 1px 2px rgba(15, 42, 68, 0.06)',
  raised: '0 8px 24px rgba(15, 42, 68, 0.12)',
} as const;

export const tokens = { color, font, space, layout, radius, border, size, shadow } as const;
