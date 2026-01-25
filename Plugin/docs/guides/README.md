# Loading Gate

`Plugin/Plugins/Loading.tsx` is the canonical Framer code component source for this repo. It shows a polished progress bar while it waits for your page to be ready. It uses Framer Motion springs for the animation and supports multiple readiness signals (window load, assets, fonts, quiet time).

## Features

- Progress bar driven by `framer-motion` with easing provided by `useSpring`
- Readiness gate that accounts for page load, image/font availability, and optional quiet-time
- Auto-hide support plus optional variant switch once the gate completes
- Label placement controls (inside/outside, left/center/right) and border customization
- Session-aware option so the gate only runs once per visitor

## Expanded Plugin Functionality

- The designer-facing plugin exposes the exact same gating, animation, and label controls as the `Plugin/Plugins/Loading.tsx` component so every builder switch updates the published behavior.
- Gate logic (minimum hold, timeout, session lock, once-per-session) and circle quirks (perpetual animation, start-at-label) share the same helpers between component and plugin for perfect parity.
- Licensing/auth uses the Google Apps Script endpoint, stores sessions in both localStorage and Framer scoped storage, and surfaces Clear Video & Purchase actions in the footer.
- Settings menus include the three accordions—Gate Behavior, Progress Animation, Label—each with a Phosphor icon and transparent toggle so the layout feels like one continuous column.
- When the plugin inserts the code component it defaults to the bundled `Loading.component.js` (from `Plugin/public/`). You can override this by setting `VITE_LOADING_COMPONENT_URL` to a shared Framer module URL.
- The plugin uses insertion defaults of **300 × 300** for circle and **600 × 48** for bar/text (see `getInsertionSize` in `Plugin/src/App.tsx`).

## Requirements

- React 18+
- `framer-motion`
- Framer code component environment (optional but recommended)

Install dependencies in the folder where the Framer plugin lives (the component lives at `Plugin/Plugins/Loading.tsx`):

```bash
npm install react react-dom framer framer-motion
```

## Usage

1. Copy `Plugin/Plugins/Loading.tsx` into your Framer project's **Code** directory (or rely on Framer Git Sync to pull it from this repo).
2. Restart the Framer canvas so the component appears under Code Components.
3. Drag the **Loading Gate** component onto the canvas and tweak the property controls to match your gating needs.
4. Use the `onReady` action or variant switch to reveal the rest of your experience once loading completes.

## Publishing

This repository is ready for Git initialization and publishing. To set up:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: Loading Gate component and plugin"

# Create GitHub repository and push
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Framer Plugin Publishing

To package the plugin for Framer Marketplace:

```bash
# From the repository root
cd Plugin
npm install
npm run build
npm run pack
```

This creates `plugin.zip` in the Plugin directory, ready for Marketplace upload.

### Component Publishing

The Loading component (`Plugin/Plugins/Loading.tsx`) can be:
1. Used directly in Framer projects via Git Sync
2. Published as a shared module for broader distribution

Feel free to open issues or PRs once the repository is online!

## Framer Plugin Layout

The Loading Gate Framer plugin now mirrors the [recommended plugin architecture](https://www.framer.com/developers/concepts#plugin-architecture):

- `main.tsx` bootstraps the plugin, calls `framer.showUI`, imports the shared `globals.css`, and mounts the React tree.
- `App.tsx` contains the entire plugin UI/state machine (it still imports `App.css` for component-level styles and uses `framer` APIs for storage, auth, etc.).
- `App.css` styles the plugin UI, while `globals.css` owns baseline tokens/resets in line with the Framer template.

To try it inside Framer, drop these files into the `/src` directory of a Framer plugin project (or point your dev server at this folder) and run `npm run dev`. The start screen + builder flow will appear as a floating panel just like any plugin generated from the official template.

## Packing The Plugin

From the repo root:

```bash
npm -C Plugin install
npm -C Plugin run build
npm -C Plugin run pack
```

## Settings Menu & Styling Overview

- Each settings group lives inside a `.settingsGroup` accordion with minimal chrome: no cards, thin hover feedback, and consistent 16px padding so content feels unified.
- Gate controls (Minimum / Timeout) render via `inlineLabel` rows so their label and number field stay on one line.
- Circle controls present the `Perpetual Mode` / `Start at label` checkboxes on the same row, and the `Perpetual Gap` slider uses the theme’s `--range-track` color for visibility.
- The hero preview above the menus sits in a fixed-size shell, with the gear icon overlapping its top-right using absolute/fixed positioning, and slider tracks/boxes leverage the same accent tokens as the code component so the visual experience matches.
