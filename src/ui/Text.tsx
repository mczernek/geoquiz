import { Text as RNText, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const VARIANTS = {
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 23 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
} as const;

export function Text({
  variant = 'body',
  color = colors.white,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  return <RNText {...props} style={[VARIANTS[variant], { color }, style]} />;
}
