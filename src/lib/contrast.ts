/**
 * WCAG 2.1 contrast ratio utilities for the dark-theme design system.
 *
 * References:
 * - https://www.w3.org/TR/WCAG21/#contrast-minimum
 * - https://www.w3.org/TR/WCAG21/#non-text-contrast
 */

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAALarge: boolean;
  passesAAA: boolean;
  passesAAANlarge: boolean;
}

/**
 * Parse an HSL color string ("H S% L%") into { h, s, l }.
 */
export function parseHSL(hsl: string): { h: number; s: number; l: number } {
  const cleaned = hsl.trim().replace(/%/g, "");
  const parts = cleaned.split(/\s+/).map(Number);
  return { h: parts[0] ?? 0, s: parts[1] ?? 0, l: parts[2] ?? 0 };
}

/**
 * Convert HSL to relative luminance per WCAG 2.1.
 */
export function hslToLuminance(h: number, s: number, l: number): number {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const rLin = r + m;
  const gLin = g + m;
  const bLin = b + m;

  const toLinear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(rLin) + 0.7152 * toLinear(gLin) + 0.0722 * toLinear(bLin);
}

/**
 * Convert an HSL CSS variable value to relative luminance.
 */
export function hslVarToLuminance(hslVar: string): number {
  const { h, s, l } = parseHSL(hslVar);
  return hslToLuminance(h, s, l);
}

/**
 * Calculate WCAG 2.1 contrast ratio between two luminance values.
 * Returns a value between 1 and 21.
 */
export function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG contrast between two HSL color strings.
 * @param foreground - HSL string (e.g. "210 40% 98%")
 * @param background - HSL string (e.g. "222.2 84% 4.9%")
 */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const fgLum = hslVarToLuminance(foreground);
  const bgLum = hslVarToLuminance(background);
  const ratio = contrastRatio(fgLum, bgLum);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAALarge: ratio >= 3,
    passesAAA: ratio >= 7,
    passesAAANlarge: ratio >= 4.5,
  };
}

/**
 * Validate all dark-theme design token pairs for WCAG compliance.
 * Returns any token pairs that fail the minimum AA standard.
 */
export interface TokenContrastReport {
  token: string;
  fgVar: string;
  bgVar: string;
  fgValue: string;
  bgValue: string;
  result: ContrastResult;
}

export function validateDarkThemeTokens(
  tokens: Record<string, { fg: string; bg: string }>,
): TokenContrastReport[] {
  const failures: TokenContrastReport[] = [];

  for (const [token, { fg, bg }] of Object.entries(tokens)) {
    const result = checkContrast(fg, bg);
    if (!result.passesAA) {
      failures.push({
        token,
        fgVar: fg,
        bgVar: bg,
        fgValue: fg,
        bgValue: bg,
        result,
      });
    }
  }

  return failures;
}

/**
 * Get the default dark-theme token pairs from the CSS custom properties.
 */
export function getDefaultDarkThemeTokenPairs(): Record<
  string,
  { fg: string; bg: string }
> {
  if (typeof document === "undefined") return {};

  const dark = document.querySelector(".dark");
  if (!dark) return {};

  const style = getComputedStyle(dark);

  const getToken = (name: string) =>
    style.getPropertyValue(`--${name}`).trim();

  return {
    "foreground-on-background": {
      fg: getToken("foreground"),
      bg: getToken("background"),
    },
    "card-foreground-on-card": {
      fg: getToken("card-foreground"),
      bg: getToken("card"),
    },
    "popover-foreground-on-popover": {
      fg: getToken("popover-foreground"),
      bg: getToken("popover"),
    },
    "primary-foreground-on-primary": {
      fg: getToken("primary-foreground"),
      bg: getToken("primary"),
    },
    "secondary-foreground-on-secondary": {
      fg: getToken("secondary-foreground"),
      bg: getToken("secondary"),
    },
    "muted-foreground-on-muted": {
      fg: getToken("muted-foreground"),
      bg: getToken("muted"),
    },
    "accent-foreground-on-accent": {
      fg: getToken("accent-foreground"),
      bg: getToken("accent"),
    },
    "destructive-foreground-on-destructive": {
      fg: getToken("destructive-foreground"),
      bg: getToken("destructive"),
    },
  };
}
