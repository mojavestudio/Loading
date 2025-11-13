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

- `framer.showUI` pins the window to 320 px × 760 px and disables resizing (`Plugin/src/App.tsx:12-19`). Treat 320 px as immutable when designing layouts.
- `main` applies `15px` padding on all sides for breathing room (`Plugin/src/App.css:3-20`). Any future panel should respect this inset to align with the Mojave design vocabulary.
- `MojaveGrid.tsx` declares `@framerIntrinsicWidth 600` and `@framerIntrinsicHeight 600`, plus `width = height = 600` defaults inside the component (`MojaveGrid.tsx:84-112`). New plugins should define explicit intrinsic sizes so inserted nodes appear predictable.
- Component insertion uses those same 600 px dimensions when calling `framer.addComponentInstance` (`Plugin/src/App.tsx:1423-1462`). Keep the code component and insertion metadata in sync.

## Serving the Framer Code Component & Preventing Unlink

- The Canvas component carries `@framerDisableUnlink` to keep it wired to the hosted source (`MojaveGrid.tsx:84-88`).
- The plugin never bundles the component itself. Instead it requests Framer to insert the hosted module referenced by `MOJAVE_GRID_MODULE_URL` (`Plugin/src/App.tsx:179,1423`). Always point this constant at the latest published URL from the Framer share dialog and update it during releases.
- Provide a fallback frame via `framer.createFrameNode` the way Mojave Grid does so permission-restricted projects still get visual feedback (`Plugin/src/App.tsx:1466-1504`).

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
  3. Run a pre-check `{ bind: false }` to fail fast on invalid invoices.
  4. Run the binding call `{ bind: true }` only after the pre-check passes.
  5. Surface granular errors for `wrong_plugin`, `not_found`, `bound_to_other`, and `bound_requires_user_id`.
  6. Time out requests after ~15 s and clean up the injected `<script>` tag.
- The verification screen itself should:
  - Block the rest of the UI whenever `authStatus !== "authorized"` (`Plugin/src/App.tsx:1510-1650`).
  - Use the same animated canvas background (`authGridRef`) so the experience feels intentional.
  - Call `framer.notify` to confirm success or emit actionable error toasts.
  - Label the purchase field as “Receipt #”, enforce the `0000-0000` pattern in both UI and verification logic, and reset the input after successful binding.
  - Include the Mojave legal footer (`© Mojave Studio LLC — Custom Automated Web Design Experts · mojavestud.io`) at the base of both the login gate and the main editor view (`loadingFooter` component).

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
