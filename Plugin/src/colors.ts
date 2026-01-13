/**
 * Framer Color Profile
 * Defines the color system for Framer plugins with customizable secondary accent color
 */

export interface FramerColorProfile {
  // Background Colors
  bgWindow: string;        // Main window background - #111111
  bgSecondary: string;     // Popup/secondary background - #1D1D1D
  inputBackground: string; // Input fields background - #1D1D1D
  surfaceCard: string;     // Card surface - #1a1a1a
  surfacePanel: string;    // Panel surface - #161616
  surfaceBackground: string; // Base surface - #111111
  
  // Text Colors
  textPrimary: string;     // Primary text - #ffffff
  textSecondary: string;   // Secondary text - #b0b0b0
  textTertiary: string;    // Tertiary text - #808080
  textSubtle: string;      // Subtle text - #606060
  
  // Accent Colors (user customizable secondary)
  accentPrimary: string;   // Primary accent - #8550ff (purple default)
  accentSecondary: string; // Secondary accent - user customizable
  accentFocusRing: string; // Focus ring - rgba(133, 79, 255, 0.3)
  
  // Border Colors
  borderSoft: string;      // Soft borders - #2a2a2a
  borderStrong: string;    // Strong borders - #404040
  checkboxBorder: string;  // Checkbox borders - #2a2a2a
  
  // Other Colors
  ghostBg: string;         // Ghost button background - #1a1a1a
  ghostText: string;       // Ghost button text - #b0b0b0
  ghostBorder: string;     // Ghost button border - #2a2a2a
  badgeBg: string;         // Badge background - #2a2a2a
  badgeText: string;       // Badge text - #b0b0b0
  previewBorder: string;   // Preview border - #2a2a2a
  errorText: string;       // Error text - #ff6b6b
  cardShadow: string;      // Card shadow - CSS shadow value
}

/**
 * Default Framer Color Profile
 */
export const defaultFramerColors: FramerColorProfile = {
  // Background Colors
  bgWindow: '#111111',
  bgSecondary: '#1D1D1D',
  inputBackground: '#1C1C1C',
  surfaceCard: '#1a1a1a',
  surfacePanel: '#161616',
  surfaceBackground: '#111111',
  
  // Text Colors
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#808080',
  textSubtle: '#606060',
  
  // Accent Colors
  accentPrimary: '#8550ff',
  accentSecondary: '#6b3dd8',
  accentFocusRing: 'rgba(133, 79, 255, 0.3)',
  
  // Border Colors
  borderSoft: '#2a2a2a',
  borderStrong: '#404040',
  checkboxBorder: '#2a2a2a',
  
  // Other Colors
  ghostBg: '#1a1a1a',
  ghostText: '#b0b0b0',
  ghostBorder: '#2a2a2a',
  badgeBg: '#2a2a2a',
  badgeText: '#b0b0b0',
  previewBorder: '#2a2a2a',
  errorText: '#ff6b6b',
  cardShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
};

/**
 * Create a custom Framer Color Profile with user-specified secondary accent color
 */
export function createFramerColorProfile(secondaryAccentColor: string): FramerColorProfile {
  return {
    ...defaultFramerColors,
    accentSecondary: secondaryAccentColor,
    // Update focus ring to match secondary accent
    accentFocusRing: `${secondaryAccentColor}33`, // Add 20% opacity
  };
}

/**
 * Convert color profile to CSS variables string
 */
export function colorProfileToCSSVariables(colors: FramerColorProfile): string {
  return `
    --bg-window: ${colors.bgWindow};
    --bg-secondary: ${colors.bgSecondary};
    --input-background: ${colors.inputBackground};
    --surface-card: ${colors.surfaceCard};
    --surface-panel: ${colors.surfacePanel};
    --surface-background: ${colors.surfaceBackground};
    
    --text-primary: ${colors.textPrimary};
    --text-secondary: ${colors.textSecondary};
    --text-tertiary: ${colors.textTertiary};
    --text-subtle: ${colors.textSubtle};
    
    --accent-primary: ${colors.accentPrimary};
    --accent-secondary: ${colors.accentSecondary};
    --accent-focus-ring: ${colors.accentFocusRing};
    
    --border-soft: ${colors.borderSoft};
    --border-strong: ${colors.borderStrong};
    --checkbox-border: ${colors.checkboxBorder};
    
    --ghost-bg: ${colors.ghostBg};
    --ghost-text: ${colors.ghostText};
    --ghost-border: ${colors.ghostBorder};
    --badge-bg: ${colors.badgeBg};
    --badge-text: ${colors.badgeText};
    --preview-border: ${colors.previewBorder};
    --card-shadow: ${colors.cardShadow};
    --error-text: ${colors.errorText};
  `;
}

/**
 * Apply color profile to document root
 */
export function applyColorProfile(colors: FramerColorProfile): void {
  const root = document.documentElement;
  
  // Apply each color as CSS variable
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
}
