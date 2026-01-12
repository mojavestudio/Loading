# Framer Plugin Styling Guide

## Color System

### Framer Color Profile

The Loading plugin uses a comprehensive color system designed for Framer plugins. This system ensures consistent theming across light and dark modes while allowing users to customize their plugin's secondary accent color.

#### Background Colors
- **`--bg-window`**: #111111 - Main window background
- **`--bg-secondary`**: #1D1D1D - Popup/secondary background (used for dropdowns, text inputs, number boxes)
- **`--input-background`**: #1D1D1D - Input field background
- **`--surface-card`**: #1a1a1a - Card surface
- **`--surface-panel`**: #161616 - Panel surface
- **`--surface-background`**: #111111 - Base surface

#### Text Colors
- **`--text-primary`**: #ffffff - Primary text
- **`--text-secondary`**: #b0b0b0 - Secondary text
- **`--text-tertiary`**: #808080 - Tertiary text
- **`--text-subtle`**: #606060 - Subtle text

#### Accent Colors
- **`--accent-primary`**: #8550ff - Primary accent (purple)
- **`--accent-secondary`**: #6b3dd8 - Secondary accent (user customizable)
- **`--accent-focus-ring`**: rgba(133, 79, 255, 0.3) - Focus ring color

#### Border Colors
- **`--border-soft`**: #2a2a2a - Soft borders
- **`--border-strong`**: #404040 - Strong borders
- **`--checkbox-border`**: #2a2a2a - Checkbox borders

#### Utility Colors
- **`--ghost-bg`**: #1a1a1a - Ghost button background
- **`--ghost-text`**: #b0b0b0 - Ghost button text
- **`--ghost-border`**: #2a2a2a - Ghost button border
- **`--badge-bg`**: #2a2a2a - Badge background
- **`--badge-text`**: #b0b0b0 - Badge text
- **`--preview-border`**: #2a2a2a - Preview border
- **`--error-text`**: #ff6b6b - Error text
- **`--card-shadow`**: 0 2px 8px rgba(0, 0, 0, 0.3) - Card shadow

## Implementation

### CSS Variables

All colors are defined as CSS custom properties (variables) in the `:root` selector of `globals.css`. This allows for dynamic theming and easy customization.

```css
:root {
    --bg-window: #111111;
    --bg-secondary: #1D1D1D;
    /* ... other colors */
}
```

### Usage in Components

Use the CSS variables in your components:

```css
.my-component {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-soft);
}
```

### Input Fields

Dropdowns, text inputs, and number boxes use the `--bg-secondary` color (#1D1D1D) as their background:

```css
input[type="text"],
input[type="email"],
input[type="number"],
select {
    background: #1D1D1D;
    color: var(--text-primary);
    /* ... other styles */
}
```

## Custom Color Profile

### TypeScript Interface

The color system is type-safe with the `FramerColorProfile` interface:

```typescript
interface FramerColorProfile {
    bgWindow: string;
    bgSecondary: string;
    // ... all color properties
}
```

### Creating Custom Profiles

Users can create custom color profiles with their own secondary accent color:

```typescript
import { createFramerColorProfile } from "./colors"

const customProfile = createFramerColorProfile("#ff6b35")
```

### Applying Custom Colors

The plugin automatically applies custom colors when in dark mode:

```typescript
useEffect(() => {
    if (themeMode === "dark" && builder.secondaryAccentColor) {
        const customProfile = createFramerColorProfile(builder.secondaryAccentColor)
        root.style.setProperty("--accent-secondary", customProfile.accentSecondary)
        root.style.setProperty("--accent-focus-ring", customProfile.accentFocusRing)
    }
}, [themeMode, builder.secondaryAccentColor])
```

## Best Practices

1. **Always use CSS variables** instead of hardcoding colors
2. **Respect the color hierarchy** - primary for main actions, secondary for accents
3. **Ensure sufficient contrast** - all text colors have been tested against their backgrounds
4. **Test in both light and dark modes** - the system automatically adapts
5. **Use semantic color names** - prefer `--text-primary` over `--white`

## Theme Support

The color system supports both light and dark Framer themes. The plugin automatically detects the current theme and applies the appropriate color palette.

### Light Theme
Uses a light color palette with white backgrounds and dark text.

### Dark Theme
Uses the Framer Color Profile with dark backgrounds (#111111) and light text.

## Migration Guide

When updating existing plugins to use this color system:

1. Replace hardcoded colors with CSS variables
2. Update input backgrounds to use `#1D1D1D` or `var(--bg-secondary)`
3. Add the color constants file to your project
4. Implement the custom secondary color feature if desired
5. Test thoroughly in both themes

## Resources

- [Color constants file](./Plugin/src/colors.ts)
- [CSS variables definition](./Plugin/src/globals.css)
- [Theme implementation example](./Plugin/src/App.tsx)
