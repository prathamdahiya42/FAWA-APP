export const Spacing = {
  xxs:  4,
  xs:   8,
  sm:   12,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 100,
} as const;

/** Minimum tap target size in dp (WCAG / Android accessibility) */
export const TouchTarget = 48;
