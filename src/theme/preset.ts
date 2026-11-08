import { color, font, layout, radius, shadow, size, space } from './tokens';

type FontSize = [string, { lineHeight: string; fontWeight: string; letterSpacing: string }];

const fontSize = Object.fromEntries(
  Object.entries(font.size).map(([name, value]) => [
    name,
    [value.size, { lineHeight: value.lineHeight, fontWeight: value.weight, letterSpacing: value.letterSpacing }] as FontSize,
  ]),
);

/** Tailwind preset built only from tokens.ts (Section 7.1). Screens use these class names, never raw values. */
export const claimguardPreset = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: color.primary, deep: color.primaryDeep },
        accent: { DEFAULT: color.accent, hover: color.accentHover, tint: color.accentTint },
        background: color.background,
        surface: { DEFAULT: color.surface, muted: color.surfaceMuted, sunken: color.surfaceSunken },
        border: color.border,
        text: { DEFAULT: color.text, secondary: color.textSecondary, 'on-dark': color.textOnDark, 'on-dark-muted': color.textOnDarkMuted },
        error: { DEFAULT: color.error, tint: color.errorTint },
        success: { DEFAULT: color.success, tint: color.successTint },
        warning: { DEFAULT: color.warning, tint: color.warningTint },
        info: { DEFAULT: color.info, tint: color.infoTint },
        severity: {
          'low-fg': color.severity.low.fg,
          'low-bg': color.severity.low.bg,
          'medium-fg': color.severity.medium.fg,
          'medium-bg': color.severity.medium.bg,
          'high-fg': color.severity.high.fg,
          'high-bg': color.severity.high.bg,
          'critical-fg': color.severity.critical.fg,
          'critical-bg': color.severity.critical.bg,
        },
        notice: {
          'public-fg': color.notice.public.fg,
          'public-bg': color.notice.public.bg,
          'app-fg': color.notice.app.fg,
          'app-bg': color.notice.app.bg,
          'app-border': color.notice.app.border,
        },
        overlay: color.overlay,
      },
      fontFamily: {
        sans: [font.family],
        mono: [font.familyMono],
      },
      fontSize,
      spacing: {
        gutter: space.gutter,
        sidebar: layout.sidebar,
        rail: layout.rail,
        'top-bar': layout.topBar,
        notice: layout.noticeBar,
        icon: size.icon,
        'icon-sm': size.iconSmall,
        button: size.button,
        touch: size.touchMin,
        chip: size.chip,
      },
      maxWidth: {
        content: layout.content,
        desktop: layout.desktop,
      },
      borderRadius: {
        card: radius.card,
        input: radius.input,
        chip: radius.chip,
      },
      boxShadow: {
        card: shadow.card,
        raised: shadow.raised,
      },
    },
  },
};
