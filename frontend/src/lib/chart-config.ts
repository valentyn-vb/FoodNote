/**
 * Series config for the dashboard charts — the `config` object EvilCharts maps
 * data keys to labels and colors with. Kept out of the components (and out of
 * the vendored `evilcharts/` source) so the palette decisions live in one
 * readable place: colors come from the FoodNote tokens, never EvilCharts
 * defaults.
 */

// One metric, one hue (the H03 "Weight trend & projection" annotation), in two
// shades: logged weight is the deeper, measured green; the projection is a
// lighter tint, since a forecast reading lighter than real data is the point.
// Solid vs dashed still carries the split in the plot, but the legend swatch is
// a plain filled square (evilcharts/ui/legend LegendIndicator) and cannot show
// a dash — with one shared color the two keys were indistinguishable there.
export const weightConfig = {
  actual: { label: 'Logged', colors: { light: ['var(--fn-secondary-deep)'] } },
  projected: {
    // "Projected" is the user-facing word and matches Projected Goal Date in
    // CONTEXT.md. The line is remaining weight ÷ Pace, so it is straight by
    // construction; the lighter tint and dash carry that it is not measured
    // data. Real variation comes from the logged series, not from wiggling a
    // forecast we have no model for.
    label: 'Projected',
    colors: {
      light: ['color-mix(in oklch, var(--fn-secondary), white 38%)'],
    },
  },
};

export const calorieConfig = {
  kcal: { label: 'kcal', colors: { light: ['var(--fn-primary)'] } },
};
