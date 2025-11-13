# Loading Gate

`Loading.tsx` exposes a Framer code component that shows a polished progress bar while it waits for your page to be ready. It uses Framer Motion springs for the animation, supports multiple readiness signals (window load, assets, fonts, quiet time), and can optionally wait for the bar to finish animating before resolving.

## Features

- Progress bar driven by `framer-motion` with easing provided by `useSpring`
- Readiness gate that accounts for page load, image/font availability, and optional quiet-time
- Auto-hide support plus optional variant switch once the gate completes
- Label placement controls (inside/outside, left/center/right) and border customization
- Session-aware option so the gate only runs once per visitor

## Requirements

- React 18+
- `framer-motion`
- Framer code component environment (optional but recommended)

Install dependencies in the folder where `Loading.tsx` lives:

```bash
npm install react react-dom framer framer-motion
```

## Usage

1. Copy `Loading.tsx` into your Framer project's **Code** directory (or import it into the provided one).
2. Restart the Framer canvas so the component appears under Code Components.
3. Drag the **Loading Gate** component onto the canvas and tweak the property controls to match your gating needs.
4. Use the `onReady` action or variant switch to reveal the rest of your experience once loading completes.

## Publishing

This repo is ready to be initialized with git (run `git init` inside the folder). Commit `Loading.tsx` and `README.md`, then publish the repository via GitHub Desktop.

Feel free to open issues or PRs once the repo is online!

## Framer Plugin Layout

The Loading Gate Framer plugin now mirrors the [recommended plugin architecture](https://www.framer.com/developers/concepts#plugin-architecture):

- `main.tsx` bootstraps the plugin, calls `framer.showUI`, imports the shared `globals.css`, and mounts the React tree.
- `App.tsx` contains the entire plugin UI/state machine (it still imports `App.css` for component-level styles and uses `framer` APIs for storage, auth, etc.).
- `App.css` styles the plugin UI, while `globals.css` owns baseline tokens/resets in line with the Framer template.

To try it inside Framer, drop these files into the `/src` directory of a Framer plugin project (or point your dev server at this folder) and run `npm run dev`. The start screen + builder flow will appear as a floating panel just like any plugin generated from the official template.
