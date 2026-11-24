/** Design tokens (docs/specs/design.md): one vivid look, no light/dark variants. */
export const colors = {
  bgFrom: '#5B0CFF',
  bgTo: '#F500E6',
  ink: '#2A0A5E',
  inkSoft: '#6B4FA0',
  white: '#FFFFFF',
  glass: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.38)',
  card: '#FFFFFF',

  oceanLight: '#46C2FF',
  oceanDeep: '#1B3BD6',
  atmosphere: 'rgba(140, 230, 255, 0.55)',
  land: '#FFD84D',
  landOther: '#E9C95A',
  landMuted: '#B9A6E8',
  border: 'rgba(90, 20, 140, 0.55)',
  graticule: 'rgba(255,255,255,0.13)',

  accent: '#FFD84D',
  target: '#FF3D9A',
  correct: '#21E6A0',
  correctDeep: '#0BAF77',
  wrong: '#FF4D6D',
  wrongDeep: '#D61F45',
  learned: '#7CF5C4',
  learning: '#FFB13D',
} as const;

export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

export const radius = { s: 12, m: 20, l: 28, pill: 999 } as const;
