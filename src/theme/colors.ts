export const DarkColors = {
  bg: '#07110A',
  surface: '#0D1C12',
  surface2: '#14281A',
  line: '#1F3A28',
  text: '#EEF9E8',
  textMuted: '#8DAE95',
  green: '#2BE36B',
  greenDeep: '#14A84D',
  yellow: '#FFD60A',
  yellowSoft: '#FFE766',
  inkOnYellow: '#1A1500',
  inkOnGreen: '#04210F',
  safety: '#FF6B5E',
} as const;

export const LightColors = {
  bg: '#F5FAEC',
  surface: '#FFFFFF',
  surface2: '#EAF4DC',
  line: '#D3E5C0',
  text: '#0E2414',
  textMuted: '#4F6B57',
  green: '#14A84D',
  greenDeep: '#0D7A37',
  yellow: '#F5C400',
  yellowSoft: '#FFE766',
  inkOnYellow: '#1A1500',
  inkOnGreen: '#FFFFFF',
  safety: '#D93F32',
} as const;

export type ColorToken = keyof typeof DarkColors;
export type Colors = Record<ColorToken, string>;

/** Phase accent gradients — shift colour temperature across the 60-day arc */
export const PhaseAccents = {
  Foundation: { primary: '#2BE36B', secondary: '#14A84D' },  // green-dominant
  Build:      { primary: '#2BE36B', secondary: '#FFD60A' },  // green + yellow highlights
  Intensify:  { primary: '#1FF05A', secondary: '#FFD60A' },  // balanced
  Peak:       { primary: '#FFD60A', secondary: '#2BE36B' },  // yellow-dominant
} as const;

export type PhaseName = keyof typeof PhaseAccents;
