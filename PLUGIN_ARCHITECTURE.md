# Mojave Plugin Architecture Playbook

This document distills how Mojave Grid is assembled so future Framer plugins can replicate the same architecture, sizing, licensing safeguards, and polish. Use it as a checklist while scaffolding a new plugin or refactoring an existing one.

## Quick Start (Port 5173)

- **Create a plugin scaffold**: `npm create framer-plugin@latest` (or `pnpm create framer-plugin`, `yarn create framer-plugin`). Manual installs can `npm install framer-plugin`, but the template is strongly preferred.
- **Install & run**: `cd Plugin && npm install && npm run dev -- --host localhost --port 5173`. Always keep the dev server on 5173 so Framer can hot-reload your UI without reconfiguration.
- **Requirements**: Node 18+, modern browser, and HTTPS dev certs (handled via `vite-plugin-mkcert`).
- **Open in Framer**: In the desktop app enable *Plugins → Developer Tools*, then *Plugins → Open Development Plugin* and enter `https://localhost:5173`. Framer picks up changes instantly via Vite HMR.
- **Troubleshooting**: Allow-list `framer.com` in Brave/Ad-blockers; stale Node versions should be upgraded or managed via `n`.
- **Hot reloading**: Keep `npm run dev` running—`vite-plugin-framer` adds live bridge reloads so UI changes propagate without restarting.

## File Structure & Build System

```
Loading/
├── Loading.tsx                 # Published code component (Framer Canvas)
├── Plugin/                     # Framer plugin workspace
│   ├── public/
│   │   ├── Loading.component.js
│   │   ├── Loading.component.js.map
│   │   └── icon.svg            # Marketplace badge / plugin icon
│   ├── src/
│   │   ├── App.tsx             # Full plugin UI + auth + insertion logic
│   │   ├── App.css             # Base padding & stacking context
│   │   ├── globals.css         # Theme token plumbing
│   │   └── main.tsx            # Entry that mounts <App/>
│   ├── framer.json             # Plugin manifest (id + modes + icon + metadata)
│   ├── index.html              # Vite entry
│   ├── package.json            # Scripts + dependencies
│   ├── tsconfig.json           # TS target & JSX runtime config
│   ├── tsconfig.node.json      # Vite build tooling config
│   ├── vite.config.ts          # Vite + mkcert + framer plugin config
│   └── vite-env.d.ts           # Vite ambient typings
└── README.md / PLUGIN_ARCHITECTURE.md / etc.
```

- Vite is configured in `Plugin/vite.config.ts:1-12`. Pin target to `ES2022` and keep plugins `[react(), mkcert(), framer()]`. Add `server: { port: 5173 }` if you ever need an enforced port.
- `main.tsx` simply mounts `<App/>`; keep it minimal so most logic resides in `App.tsx`.

## Manual Migration Checklist (Loading Gate Example)

If you inherit a flat prototype (only `App.tsx`, `App.css`, `main.tsx`, `globals.css`, and `Loading.component.js`), bring it in line with this architecture by:

1. **Create workspace folders**
   - `mkdir -p Plugin/src Plugin/public`
   - Move UI files into `Plugin/src/` and the compiled component into `Plugin/public/`:
     - `mv App.tsx Plugin/src/App.tsx`
     - `mv App.css Plugin/src/App.css`
     - `mv main.tsx Plugin/src/main.tsx`
     - `mv globals.css Plugin/src/globals.css`
     - `mv Loading.component.js Plugin/public/Loading.component.js`
     - `mv Loading.component.js.map Plugin/public/Loading.component.js.map`
2. **Update component URL**
   - In `Plugin/src/App.tsx`, point the module loader at the public asset:  
     `const COMPONENT_URL = getEnv("VITE_LOADING_COMPONENT_URL") || new URL("/Loading.component.js", import.meta.url).href`
3. **Scaffold build tooling**
   - Drop in the standard configs:
     - `Plugin/package.json` (React 18, `framer-plugin`, lint scripts, Vite commands)
     - `Plugin/vite.config.ts` (React SWC + mkcert + framer plugins, HTTPS on port 5173, `target: "es2022"`)
     - `Plugin/tsconfig.json`, `Plugin/tsconfig.node.json`, `Plugin/vite-env.d.ts`
     - `Plugin/index.html`, `Plugin/framer.json`
     - `.eslintrc.cjs` for TypeScript + React linting
   - Ensure `framer.json` includes:
     - `id`: exactly six characters (e.g., `"lgate1"`)
     - `icon`: path to a square SVG in `public/` (e.g., `"/icon.svg"`)
     - `modes`: declare the surfaces you support—Loading Gate uses `["canvas", "code"]` so it can drive both the editor UI and code insertions
4. **Install dependencies**
   - `cd Plugin && npm install`
5. **Verify dev server**
   - Keep it on HTTPS port 5173:  
     `npm run dev -- --host localhost --port 5173`
   - Launch via Framer’s *Plugins → Open Development Plugin* using `https://localhost:5173`.

## Plugin Window, Padding & Component Sizing

- `framer.showUI` pins the window to 365 px × 830 px and disables resizing (`Plugin/src/main.tsx:41-47`). The window width is fixed at 365px to accommodate the plugin UI.
### Base Padding

The main container (`.pluginRoot`) applies 15px padding on all sides:

```css
/* Plugin/src/App.css */
.pluginRoot {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    overflow-x: visible;
    padding: 15px;
}
```
### Menu Box Positioning

The settings menu panel is positioned fixed with a width of 250px, calculated to appear directly to the left of the gear icon trigger:

```ts
// Plugin/src/App.tsx
const measurePanelPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelWidth = 250
    // Position directly to the left of the trigger, aligned with top
    const safeLeft = Math.max(12, rect.left - panelWidth - 8 + 30) // 8px gap from trigger, moved 30px right
    const top = rect.top // Aligned with trigger's top
    setPanelPos({ top, left: safeLeft })
}, [])
```

Menu panels use consistent styling:

```css
/* Plugin/src/App.css */
.settingsMenu-panel {
    position: fixed;
    width: 250px;
    max-width: calc(100vw - 30px);
    border-radius: 12px;
    border: 1px solid var(--border-soft);
    padding: 12px;
    box-shadow: var(--card-shadow);
}
```
- **Builder Background & Accordions**: The builder stage sits directly on the same solid background as the login gate (`var(--bg-window)`), which must be `#111111` in dark mode to match the top bar. The `.settingsPanel` drops all borders/shadows and `.loadingSettings` inherits the page backdrop (`Plugin/src/App.css:394-420`). Each configuration section is a slim accordion (`.settingsGroup`) with transparent backgrounds, a single bottom border, and a 18 px vertical hit target for the toggle row plus a 16 px gutter for the revealed inputs (`Plugin/src/App.tsx:1311-1326`, `Plugin/src/App.css:566-608`). Only the three primary sections—Gate Behavior, Progress Animation, and Label—are rendered, each prefixed with a Phosphor icon (`Gate`, `SpinnerGap`, `TextT`) to reinforce hierarchy. Never wrap the dropdowns in extra cards; keep them flush so the header chrome and the body feel seamless, and surface account actions (Signed in + Sign out) beneath the accordions instead of nesting them inside another panel.
### Component Intrinsic Size Annotations

The component declares static intrinsic size annotations (compile-time constants):

```ts
// Loading.tsx
/** @framerIntrinsicWidth  300 */
/** @framerIntrinsicHeight 300 */
/** @framerSupportedLayoutWidth any-prefer-fixed */
/** @framerSupportedLayoutHeight any-prefer-fixed */
/** @framerDisableUnlink */
```

**Note**: While the annotations are static, the component uses runtime logic to determine the correct intrinsic size based on `animationStyle`.

### Dynamic Insertion Sizing

The plugin calculates insertion size based on animation style:

```ts
// Plugin/src/App.tsx
const getInsertionSize = (style: LoadBarControls["animationStyle"]) => {
    // Dynamic sizing based on animation style
    switch (style) {
        case "circle":
            return { width: 300, height: 300 }
        case "bar":
            return { width: 600, height: 50 }
        case "text":
            return { width: 300, height: 50 }
        default:
            return { width: 300, height: 300 }
    }
}
```

### Component Insertion with Attributes

When inserting a component, the plugin passes dynamic dimensions in the `attributes` object:

```ts
// Plugin/src/App.tsx
const insertionSize = getInsertionSize(loadingControls.loadBar.animationStyle)

const insertAttrs = {
    width: insertionSize.width,
    height: insertionSize.height,
    // Prevent auto-sizing jitter on insert
    autoSize: false,
    constraints: { autoSize: "none" as const },
    // Property control values must live under controls
    controls: loadingControls,
}

const inserted = await framer.addComponentInstance({
    url: COMPONENT_URL,
    attributes: insertAttrs,
})
```

### Post-Insertion Size Enforcement

After insertion, `setAttributes` is called multiple times with retries to ensure dimensions are set correctly:

```ts
// Plugin/src/App.tsx
const canSet = await framer.isAllowedTo('setAttributes')
if (canSet) {
    // Set size and controls immediately
    await (framer as any).setAttributes(insertedId, {
        width: insertionSize.width as any,
        height: insertionSize.height as any,
        constraints: { autoSize: 'none' as const },
        controls: loadingControls,
    } as any)
    
    // Retry setting size/controls multiple times (component may load asynchronously)
    const retrySetAttributes = async () => {
        try {
            await (framer as any).setAttributes(insertedId, {
                width: insertionSize.width as any,
                height: insertionSize.height as any,
                constraints: { autoSize: 'none' as const },
                controls: loadingControls,
            } as any)
        } catch (retryErr) {
            if (__isLocal) {
                console.warn("[Loading Plugin] Retry setAttributes failed", retryErr)
            }
        }
    }
    
    // Multiple retries to ensure dimensions are set correctly
    setTimeout(retrySetAttributes, 50)
    setTimeout(retrySetAttributes, 100)
    setTimeout(retrySetAttributes, 250)
    setTimeout(retrySetAttributes, 500)
    setTimeout(retrySetAttributes, 1000)
}
```

### Dynamic Intrinsic Size Calculation

The component calculates intrinsic size at runtime based on `animationStyle`:

```ts
// Loading.tsx
const intrinsicSize = (() => {
    switch (animationStyle) {
        case "circle":
            return { width: 300, height: 300 }
        case "bar":
            return { width: 600, height: 50 }
        case "text":
            return { width: 300, height: 50 }
        default:
            return { width: 300, height: 300 }
    }
})()
```

### Container Size Measurement

The component measures its container size via ResizeObserver:

```ts
// Loading.tsx
React.useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    const measure = () => {
        setContainerSize({
            width: node.offsetWidth,
            height: node.offsetHeight,
        })
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => measure())
    observer.observe(node)
    return () => {
        observer.disconnect()
    }
}, [])
```

### Using Measured Dimensions

The component uses measured container size when available, falling back to dynamic intrinsic size:

```ts
// Loading.tsx
const measuredWidth =
    (typeof p.style?.width === "number" ? p.style.width : null) ??
    (containerSize.width > 0 ? containerSize.width : intrinsicSize.width)
const measuredHeight =
    (typeof p.style?.height === "number" ? p.style.height : null) ??
    (containerSize.height > 0 ? containerSize.height : intrinsicSize.height)

// Use measured container size when available, otherwise use intrinsic size
const effectiveWidth = containerSize.width > 0 ? containerSize.width : intrinsicSize.width
const effectiveHeight = containerSize.height > 0 ? containerSize.height : intrinsicSize.height

const rootStyle: React.CSSProperties = {
    ...p.style,
    width: "100%",
    height: "100%",
    // Set minWidth/minHeight to ensure component doesn't shrink below measured/intrinsic size
    minWidth: effectiveWidth,
    minHeight: effectiveHeight,
    position: "relative",
    boxSizing: "border-box",
    // ... padding, etc.
}
```
- The plugin always inserts the hosted component located at `https://framer.com/m/Loading-v5jr.js@fzOnzVshQ62Gu32UHI6g`, which is the same code body as `Loading.tsx`. Update `VITE_LOADING_COMPONENT_URL` only if that shared component is republished under a different ID.

## Settings Menu + Styling Details

- The three primary configuration sections (Gate Behavior, Progress Animation, Label) reuse the same `settingsGroup` accordion markup so they appear as a single column with minimal chrome. Each header uses a Phosphor icon, the same background color, and a 16px touch target to line up with the Mojave aesthetic (`Plugin/src/App.tsx:1311-1360`, `Plugin/src/App.css:566-608`).
- Gate-specific selectors use the `inlineLabel` helper so their label+input rows stay together (Minimum / Timeout / Finish Delay), and the Finish Delay suffix is still rendered inline via `.inputSuffix`. Circle controls stretch horizontally by grouping the Perpetual Mode and Start at label toggles inside a `settingsRow settingsRow--two`.
- Keep the hero preview and gear exactly as implemented: fixed size, padded 15px from the top-right, and using the same accent slider track (`--range-track`) plus text colors so the plugin preview matches the component’s look and feel (`Plugin/src/App.tsx:1168-1188`, `Plugin/src/App.css:14-55`).

### Custom NumberInput Component with +/- Buttons

The plugin uses a custom `NumberInput` component to replace native browser number inputs, providing consistent styling and integrated increment/decrement buttons.

#### Component Structure

The `NumberInput` component (`Plugin/src/App.tsx:164-268`) renders a unified input box containing:
1. **Input field**: A number input with native spinners hidden via CSS
2. **Vertical separators**: Thin divider lines (`|`) using `var(--border-soft)`
3. **Decrement button**: Minus (`−`) button on the right side
4. **Increment button**: Plus (`+`) button on the right side

```ts
// Plugin/src/App.tsx
const NumberInput = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    style,
}: {
    value: number
    onChange: (value: number) => void
    min: number
    max: number
    step?: number
    style?: CSSProperties
}) => {
    // Implementation with unified box containing input, separators, and buttons
}
```

#### Layout & Styling

- **Container**: Single unified box with `border: 1px solid var(--border-soft)`, `borderRadius: 6px`, and `background: var(--input-background)` to match other form inputs
- **Input field**: Takes up flex space with `padding: 8px 10px` to match standard input heights (same as `select` elements)
- **Buttons**: Fixed width of `20px`, height `100%` to match container, with `fontSize: 12px` and `fontWeight: 600`
- **Separators**: `1px` width, `18px` height, using `var(--border-soft)` color
- **Disabled state**: Buttons show `opacity: 0.5` and `cursor: not-allowed` when at min/max values

#### CSS Integration

Native number input spinners are hidden via CSS:

```css
/* Plugin/src/App.css */
.custom-number-input::-webkit-outer-spin-button,
.custom-number-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.custom-number-input {
    -moz-appearance: textfield;
}
```

The component uses theme variables for consistent theming:
- `var(--input-background)` for container background
- `var(--border-soft)` for borders and separators
- `var(--text-primary)` for text and button colors
- `var(--text-secondary)` for suffix text (when used)

#### Usage Examples

The component is used throughout the plugin for numeric inputs:

```ts
// Line width input
<NumberInput
    value={builder.controls.loadBar.lineWidth}
    onChange={(value) => updateLoadBar({ lineWidth: value })}
    min={1}
    max={20}
    step={0.5}
/>

// Finish delay with external suffix
<div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
    <NumberInput
        value={builder.controls.loadBar.finishDelay}
        onChange={(value) => updateLoadBar({ finishDelay: value })}
        min={0}
        max={2}
        step={0.05}
        style={{ flex: 1, minWidth: 0 }}
    />
    <span style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
        s
    </span>
</div>
```

#### Spacing Consistency

All form elements use consistent `12px` gaps:
- `.settingsGrid`: `gap: 12px` (spacing between rows)
- `.settingsRow`: `gap: 12px` (spacing between elements in a row)
- `.alignmentRow`: `gap: 12px` (alignment controls)
- `.fontPicker`: `gap: 12px` (font selection controls)

All margins are reset to `0` to ensure spacing is controlled exclusively by gap properties:
- `.settingsGrid > *`: `margin: 0`
- `.settingsRow`: `margin: 0`
- `.flexColumn`: `margin: 0`

## Serving the Framer Code Component & Preventing Unlink

### Disable Unlink Annotation

The Canvas component carries `@framerDisableUnlink` to keep it wired to the hosted source:

```ts
// Loading.tsx
/** @framerDisableUnlink */
export default function Loading(p: Props) {
    // Component implementation
}
```

### Component URL Configuration

The plugin never bundles the component itself. Instead it requests Framer to insert the hosted module:

```ts
// Plugin/src/App.tsx
const DEFAULT_COMPONENT_URL = () =>
    "https://framer.com/m/Loading-v5jr.js@fzOnzVshQ62Gu32UHI6g"

const COMPONENT_URL =
    getEnv("VITE_LOADING_COMPONENT_URL") || DEFAULT_COMPONENT_URL()
```

Always point this constant at the latest published URL from the Framer share dialog and update it during releases.

### Fallback Frame Creation

Provide a fallback frame via `framer.createFrameNode` so permission-restricted projects still get visual feedback. See the `tryFallbackInsert` function in `Plugin/src/App.tsx` for the implementation pattern.

## Verification & Licensing Page (Same Endpoint)

- Keep the existing Google Apps Script endpoint unless a new one is provisioned:

```ts
const AUTH_JSONP_ENDPOINT =
  import.meta.env.VITE_GRID_JSONP_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbzKpuHfVwZ9zNejdPC97Zs-mHSd-_fO2wv4eHuvQtkY1-bcUe9qq5dVNRdzHHarzAz8/exec"
```
*(Plugin/src/App.tsx:130-177)*

- Implement `verifyAccessJSONP` exactly as in `Plugin/src/App.tsx:372-449`:
  1. Generate a unique JSONP callback name.
  2. Fetch the current Framer user ID (`framer.getCurrentUser`) and pass it as `framer_user_id`.
  3. Pass along the Framer username (`framer_username`) so the Apps Script can bind it server-side when available.
  4. Run a pre-check `{ bind: false }` to fail fast on invalid receipts.
  5. Run the binding call `{ bind: true }` only after the pre-check passes.
  5. Surface granular errors for `wrong_plugin`, `not_found`, `bound_to_other`, and `bound_requires_user_id`.
  6. Time out requests after ~15 s and clean up the injected `<script>` tag.
- The verification screen itself should:
  - Block the rest of the UI whenever `authStatus !== "authorized"` (`Plugin/src/App.tsx:1510-1650`).
  - Use the same animated canvas background (`authGridRef`) so the experience feels intentional.
  - Call `framer.notify` to confirm success or emit actionable error toasts.
  - Keep login copy limited to the essentials: the hero title “Loading…” and the successful binding footer so the panel feels lightweight.
  - Label the purchase field as “Receipt #”, enforce the `0000-0000` pattern in both UI and verification logic, and reset the input after successful binding.
  - Include the Mojave legal footer (`© Mojave Studio LLC — Custom Automated Web Design Experts · [mojavestud.io](https://mojavestud.io)`) at the base of both the login gate and the main editor view (`loadingFooter` component). The footer text must use a **font-size of 9px** (`Plugin/src/App.css:346-353`), and "mojavestud.io" must be rendered as a link to `https://mojavestud.io` that opens in a new tab with `target="_blank" rel="noopener noreferrer"` (`Plugin/src/App.tsx:965-971, 1344-1350`).

## Caching Login State

- **Storage keys**: `AUTH_STORAGE_ID`, `SESSION_LOCAL_KEY`, `SESSION_FORCE_FRESH_KEY`, `LEGACY_SESSION_KEY` (`Plugin/src/App.tsx:130-178`).
- **Snapshot persistence**: `persistValidatedSession` stores `{ email, projectName, exp }` in both localStorage and Framer’s user-scoped storage, and mirrors a legacy flag via `setPluginData` for backward compatibility (`Plugin/src/App.tsx:276-304`).
- **Restoration**: `restoreStoredSession` first honors a “force fresh” flag, then tries localStorage, user-scoped storage, and legacy plugin data before requiring a new login (`Plugin/src/App.tsx:315-360`).
- **Session lifetime**: 8 hours via `SESSION_LIFETIME_MS`. Any UI should show “Re-verify” or silently attempt a refresh before invalidating the user.
- **Sign out**: Always clear every storage layer and set the force-fresh flag (`Plugin/src/App.tsx:303-314,1311-1322`).
- **Implementation tips**:
  - Use `writeUserScopedPluginData`/`readUserScopedPluginData` for multi-machine continuity.
  - Keep console logging behind the dev-only flag (see below) so secrets never leak in production.

## Visual System & Dual Themes

- `useFramerTheme` listens for `data-framer-theme` mutations and exposes `"light"` or `"dark"` (`Plugin/src/App.tsx:21-39`). Every surface should pull colors from the theme objects that follow.
- Both `darkTheme` and `lightTheme` define palette tokens for cards, sliders, inputs, error states, and the authentication grid (`Plugin/src/App.tsx:42-120`). Whenever you add UI, extend these theme maps rather than hard-coding colors.
- **Background Color**: The plugin background must honor the theme setting. In dark mode, the background color (`--bg-window`) must be set to `#111111` to match the top bar and maintain visual consistency. This is defined in `Plugin/src/App.css` via the `[data-framer-theme="dark"]` selector:
  ```css
  [data-framer-theme="dark"] .loadingStart,
  [data-framer-theme="dark"] .loadingApp,
  [data-framer-theme="dark"] .pluginRoot {
      --bg-window: #111111;
      /* ... other dark theme tokens ... */
  }
  ```
  The `.pluginRoot`, `.loadingStart`, and `.loadingApp` classes use `background: var(--bg-window)` to ensure the background color is consistently applied and honors the theme setting.
- **Container Background Coverage**: To prevent a black box appearing at the bottom of the plugin window, all container elements must have the background color explicitly set. In `Plugin/src/globals.css`, the `html`, `body`, `#root`, and `main` elements must all use `background: var(--bg-window, #111111) !important` with `height: 100%` to ensure full coverage. The `!important` flag is necessary to override any default Framer plugin window styling:
  ```css
  html {
      background: var(--bg-window, #111111) !important;
      height: 100%;
      width: 100%;
  }
  
  body {
      height: 100%;
      width: 100%;
      background: var(--bg-window, #111111) !important;
  }
  
  #root {
      background: var(--bg-window, #111111) !important;
      height: 100%;
      width: 100%;
  }
  
  main {
      background: var(--bg-window, #111111) !important;
      min-height: 100%;
  }
  ```
  This ensures that any empty space at the bottom of the window (such as when the window height exceeds the content height) displays the correct background color instead of defaulting to black.
- Animated landing/auth grids reuse the Mojave palette so even gating flows feel on-brand (`Plugin/src/App.tsx:1323-1507`).
- Follow the padding guidance in `App.css` and keep controls constrained to a single column to respect the 320 px canvas.
- Every plugin shipped from this repo must offer parity in light and dark modes—QA both before publishing.

## Package Dependencies

Key runtime deps (`Plugin/package.json:1-26`):

- `framer-plugin` – bridge to the editor APIs.
- `react` / `react-dom` – UI framework.
- `@phosphor-icons/react` – iconography for controls (gear/close buttons).
- `vite-plugin-mkcert` – issues local HTTPS certs so Framer trusts `localhost:5173`.

Key dev deps: `vite`, `@vitejs/plugin-react(-swc)`, `vite-plugin-framer`, `typescript`, `eslint`, `typescript-eslint`. Keep them aligned to preserve linting + HMR behavior.

## Development Workflow, Logging & Permissions

- **Command palette**:
  - `npm run dev` – HMR server (ensure `--port 5173`).
  - `npm run build` – production bundle for packaging.
  - `npm run preview` – smoke-test the production output.
  - `npm run lint` – static analysis (required before release).
  - `npm run pack` – wraps the plugin into `plugin.zip` for Marketplace uploads.
- **Permissions**: Guard editor actions with `framer.isAllowedTo` before calling APIs such as `addComponentInstance`, `createFrameNode`, or `setAttributes` (`Plugin/src/App.tsx:1419-1498`).
- **Logging**: Use the existing `__isLocal` flag so console noise only appears in dev sessions (`Plugin/src/App.tsx:138-166`). Pattern:

```ts
if (__isLocal) {
  console.log("[Plugin]", payload)
}
```

- **Async & Traits**: Remember plugin code runs in an iframe. Always `await` Framer API calls (selection, node traits, etc.) and rely on helpers like `supportsRotation` when you need type-agnostic node capabilities (see the Framer reference links in README.md).

## Plugin Architecture & Interaction Model

- Plugins are micro-sites surfaced via `framer.showUI` and communicate through the Framer Plugin API. Mojave Grid keeps most interaction inside `App.tsx` and renders a live preview canvas (`GridPreview`) so changes feel immediate.
- Hover/auto behaviors, presets, and component controls are centralized in `MojaveGrid.tsx`, while `App.tsx` is responsible for state management, auth, and bridging those props into Framer.
- Keep hot paths (render loops, pointer handlers) inside `useEffect` hooks tied to refs, mirroring the approach Mojave Grid uses for both the preview canvas and the verification background.

## Framer UI Integration Guidelines

- **Show/Hide UI**: Call `framer.showUI` with explicit sizing (320 × 760, non-resizable) and pair it with conditional `framer.hideUI()` when the plugin shell can disappear (e.g., after closing the auth gate). Keep UI launch logic centralized so feature work doesn’t forget to display the window.
- **Global layout**: Favor semantic HTML (`<main>`, `<section>`, `<form>`, etc.) and leverage Framer’s baked-in styles; use `framer-button-primary`, `framer-divider`, and native inputs where possible before introducing custom components.
- **Color tokens**: Use Framer-provided CSS variables (e.g., `--framer-color-bg`, `--framer-color-text-secondary`, `--framer-color-divider`) for base surfaces and typography. Reserve custom tokens in `App.css` for accents that aren’t available through the Framer palette.
- **Theme awareness**: Bind colors to `[data-framer-theme="light"]` / `[data-framer-theme="dark"]` selectors and read the runtime theme from `document.body.dataset.framerTheme` (see `useFramerTheme`). Avoid manual toggles—Framer’s theme drives the layout automatically.
- **Header & action bar**: Mirror Framer’s native plugin chrome—a top title bar with a “Menu” button wired to `framer.showContextMenu`, and a bottom action bar that pairs a target dropdown with a `framer-button-primary` “Insert” CTA.
- **Menus & context actions**: Register plugin-level menu options with `framer.setMenu` (e.g., “Log out”, “Reset defaults”) and rely on `framer.showContextMenu` for inline tables or lists. Make sure menu callbacks check permissions (see the Development Workflow section).
- **Notifications**: Use `framer.notify` for success, warnings, and destructive confirmations. Attach undo handlers via the `button` option and close notifications programmatically if state changes beneath them.
- **Cleanup**: Offer `framer.closePlugin` once long-running operations complete or when the plugin transitions back to a toast-only workflow.

## Publishing & Marketplace Checklist

1. **Pre-flight**
   - Update `MOJAVE_GRID_MODULE_URL` if you republished the Canvas component.
   - Confirm dark/light parity, hover + auto FX presets, and insertion fallback flows.
   - Run `npm run lint && npm run build`.
2. **Packaging**
   - `npm run pack` in `Plugin/` produces `plugin.zip`.
3. **Submission**
   - In the Marketplace dashboard select “New Plugin”, upload the zip, fill metadata, and submit.
4. **Updates**
   - Repeat the pack/upload cycle whenever you ship a change; version bumps happen automatically once the new zip is processed.

## Additional Recommendations

- Showcase a verification/landing hero similar to `authGridRef` to reassure users before sign-in.
- Document every control inside README.md and keep screenshots/gifs updated as presets evolve.
- Maintain a troubleshooting section (permissions, port conflicts, black frames, etc.) so designers can self-serve.
- Include automated smoke tests where possible (e.g., Cypress hitting localhost:5173) to ensure the verification endpoint responds before publishing.

By following this blueprint—sizing, layout, verification, caching, theming, packaging—you can ship additional Mojave Studio plugins that feel cohesive, secure, and immediately usable inside Framer.
