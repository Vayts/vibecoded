import { Text, type TextProps } from 'react-native';

/**
 * Semantic typography variants for the Acme app.
 *
 * Sizes aligned with the iOS Human Interface Guidelines (SF Pro scale)
 * and the Acme Brand Guide:
 *
 *   hero        — 34pt Bold   (Large Title)     text-3xl font-bold
 *   pageTitle   — 28pt Bold   (Title)           text-2xl font-bold
 *   sectionTitle— 20pt Semi   (Section Header)  text-lg  font-semibold
 *   headerTitle — 17pt Semi   (Nav bar)         text-base font-semibold
 *   body        — 17pt Reg    (Body)            text-base
 *   bodySecondary — 15pt Reg  (Secondary)       text-sm
 *   caption     — 13pt Reg    (Caption)         text-xs
 *   fieldLabel  — 11pt Med    (Uppercase label)  text-xs  font-medium uppercase tracking-wide
 *   button      — 17pt Semi   (Button)          text-base font-semibold
 *   buttonSmall — 15pt Semi   (Small button)    text-sm  font-semibold
 *   link        — 17pt Semi   (Inline link)     text-base font-semibold text-brand
 */
export type TypographyVariant =
  | 'hero'
  | 'pageTitle'
  | 'sectionTitle'
  | 'headerTitle'
  | 'body'
  | 'bodySecondary'
  | 'caption'
  | 'fieldLabel'
  | 'button'
  | 'buttonSmall'
  | 'link';

const variantClasses: Record<TypographyVariant, string> = {
  hero: 'text-3xl font-bold text-gray-900',
  pageTitle: 'text-2xl font-bold text-neutrals-900',
  sectionTitle: 'text-lg font-semibold text-gray-900',
  headerTitle: 'text-base font-semibold text-gray-900',
  body: 'text-base text-gray-700',
  bodySecondary: 'text-sm text-gray-500',
  caption: 'text-xs text-gray-400',
  fieldLabel: 'text-xs font-medium text-gray-400 uppercase tracking-wide',
  button: 'text-base font-semibold',
  buttonSmall: 'text-sm font-semibold',
  link: 'text-base font-semibold text-blue-600',
};

export interface TypographyProps extends TextProps {
  /** Semantic text variant — controls size, weight, and default color. */
  variant?: TypographyVariant;
}

/**
 * Drop-in replacement for React Native `<Text>`.
 *
 * Usage:
 *   <Typography variant="hero">Acme</Typography>
 *   <Typography variant="body" className="mt-2">Some text</Typography>
 *   <Typography variant="button" className="text-white">Save</Typography>
 *
 * Falls back to `body` when no variant is given.
 * Any extra `className` is merged on top of the variant defaults,
 * so you can override color, alignment, margins, etc.
 */
export function Typography({ variant = 'body', className, ...props }: TypographyProps) {
  return <Text className={`${variantClasses[variant]} ${className ?? ''}`.trim()} {...props} />;
}
