/**
 * Central color palette for the Acme mobile app.
 *
 * Aligned with the Acme Brand Guide (docs/BRANDING.md).
 *
 * Use these constants instead of raw hex literals throughout the codebase.
 * Tailwind/NativeWind class names are preferred for layout; use COLORS for
 * props that only accept a string (e.g. icon `color`, `ActivityIndicator color`,
 * `placeholderTextColor`, `tintColor`, JS StyleSheet values).
 */
export const COLORS = {
  // ── Brand ─────────────────────────────────────────────
  primary: '#205B23', // Acme Blue (blue-600) — CTAs, links, active states
  primaryDark: '#205B23', // Deep Blue (blue-700) — pressed / hover
  primaryLight: '#C3EFC4', // Light Blue (blue-100) — subtle backgrounds, badges
  primaryBorder: '#93C5FD',

  accent: '#E28200', // violet-600 — Pro / premium badge
  accent400: '#FFC81B',
  accent500: '#FFAA00',
  accent600: '#E28200',

  neutrals100: '#F1F1F1',
  neutrals200: '#E6E6E6',
  neutrals300: '#D6D6D6',
  neutrals500: '#767676',
  neutrals700: '#434343',
  neutrals900: '#1A1A1A',

  primary25: '#c8dcc9',
  primary100: '#E0F8E0',
  primary300: '#94E197',
  primary700: '#237227',
  primary900: '#1C4B1F',
  profileChipGoodBorder: '#94E197',
  profileChipBadBorder: '#FF9292',
  profileChipNeutralBorder: '#D9D9D9',
  nutriScoreA: '#157F3E',
  nutriScoreB: '#83CB16',
  nutriScoreC: '#FCCB18',
  nutriScoreD: '#FA913E',
  nutriScoreE: '#EB580A',
  nutriScoreAActive: '#196c37',
  nutriScoreBActive: '#76a919',
  nutriScoreCActive: '#a1862f',
  nutriScoreDActive: '#d47f2f',
  nutriScoreEActive: '#c2571a',
  nutriScoreActiveBorder: '#D1A70F',

  // ── Semantic ──────────────────────────────────────────
  blue: '#2563EB', // blue-600 — good match rating
  blueSoft: '#EFF6FF', // blue-50
  blueBorder: '#BFDBFE', // blue-200
  success: '#16A34A', // green-600 — correct answers, streaks
  successSoft: '#EAF7EE',
  successBorder: '#CDEBD6',
  successShadow: '#37B03C',
  warning: '#D97706', // amber-600 — warnings, trial/upgrade prompts
  warningSoft: '#FEF5E7',
  warningBorder: '#F6D6A8',
  danger: '#DC2626', // red-600 — errors, destructive actions, "Again" rating
  danger50: '#c72a2a',
  danger800: '#B60000',
  dangerSoft: '#FDECEC',
  dangerBorder: '#F5C5C5',

  // ── Accent ────────────────────────────────────────────
  purple: '#7C3AED', // violet-600 — Pro / premium badge
  emerald: '#16A34A', // green-600 — success accent (alias)
  amber: '#D97706', // amber-600 — warning accent (alias)

  // ── AI Sparkle ────────────────────────────────────────
  sparkle: '#FBBF24', // gold — AI sparkle accent
  sparkleDark: '#F59E0B', // amber — AI sparkle gradient end

  // ── Neutrals ──────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',

  gray50: '#F9FAFB', // card backgrounds, grouped rows
  gray100: '#F3F4F6',
  gray200: '#E5E7EB', // borders, dividers
  gray300: '#D1D5DB', // icon placeholder / muted
  gray400: '#9CA3AF', // secondary text / inactive
  gray500: '#6B7280', // captions, secondary text
  gray700: '#374151', // body primary (dark on white)
  gray800: '#1F2937', // primary text
  gray900: '#111827', // headings
  appBackground: '#FAFAFA',

  // ── Special ───────────────────────────────────────────
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.4)', // modal backdrop
  overlayStrong: '#00000099',
} as const;
