export const FontFamilies = {
  displayBold:      'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  bodyRegular:      'DMSans_400Regular',
  bodyMedium:       'DMSans_500Medium',
  bodyBold:         'DMSans_700Bold',
  mono:             'JetBrainsMono_400Regular',
} as const;

export const TypeScale = {
  xs:    12,
  sm:    14,
  md:    16,
  lg:    20,
  xl:    28,
  xxl:   40,
  timer: 64,
} as const;

export type TypeScaleKey = keyof typeof TypeScale;
