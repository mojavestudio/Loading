# Personal Plugin Development Cheatsheet

**INTERNAL USE ONLY** - Contains shortcuts, templates, and proprietary workflows for rapid plugin development.

## Quick Templates

### Plugin Scaffold Generator
```bash
# One-liner plugin setup
npm create framer-plugin@latest my-plugin && cd my-plugin && npm install && npm run dev -- --port 5173
```

## Ribbon Wave Monorepo (current architecture)

- Root repo: `Ribbon Wave/` (git lives here)
  - `RibbonWave.tsx` — canonical Framer component to publish/share
  - `Plugin/` — Framer plugin (Vite + mkcert + framer)
    - `src/app.tsx` — UI, auth, live preview, insertComponent
    - `src/App.css`, `src/main.tsx`, `public/`, `vite.config.ts`, `framer.json`, `package.json`

### Dev commands (run from `Ribbon Wave/Plugin`)

- Install: `npm install`
- Dev server (Framer expects port 5173): `npm run dev -- --host localhost --port 5173`
- Lint: `npm run lint`
- Build: `npm run build`
- Preview built plugin: `npm run preview`
- Package zip: `npm run pack` (outputs `.framer-plugin.zip` in `dist`)

### Auth / environment config

Set `PLUGIN_CONFIG` at the top of `Plugin/src/app.tsx`:

```ts
const PLUGIN_CONFIG = {
  verifyEndpoint: "https://your-domain.com/path/to/license-script",
  pluginLicenseName: "ribbon",
}
```

- JSONP endpoint must accept `email`, `access_code`, `plugin_name`, `framer_user_id`, `bind`, `callback`, `nocache`.
- Cached session key: `auth_session` in localStorage; clear via Settings → Sign Out.

### Insert component

- Hosted component URL (update when you republish `RibbonWave.tsx`):
  `https://framer.com/m/RibbonWave-KdjB.js@eFEu4RLeRHULp2pWhpo8`
- `insertComponent` passes current controls, including derived `segments` (20–220, even) based on amplitude + padding.

### Usage notes

- Modes: Ribbon / Ring toggle overlays live preview.
- Controls: Lines, Thickness, Amplitude, Padding (vertical slider with negative overshoot), Angle, Taper, Speed, Colors (start/end/background).
- Settings popover: User Guide + Sign Out; insert button shows loading while adding.
- Framer already renders a plugin title/header chrome above your UI. Don’t duplicate it with an in-panel `<h1>`/`<h2>`—leave that vertical space for primary controls.

### Publishing steps

1. Publish `RibbonWave.tsx` in Framer; copy the new share URL.
2. Update `moduleUrl` inside `insertComponent` in `Plugin/src/app.tsx`.
3. Run `npm run pack` inside `Plugin/` to produce `.framer-plugin.zip` for upload.

### App.tsx Starter (Copy Paste)
```tsx
import { useEffect, useState } from "react"
import { framer } from "framer-plugin"

// CONFIG - Update these constants
const PLUGIN_NAME = "YourPlugin"
const VERIFY_ENDPOINT = import.meta.env.VITE_VERIFY_ENDPOINT || "YOUR_SCRIPT_URL"
const COMPONENT_URL = "YOUR_COMPONENT_URL"

// Auth state management
const [authStatus, setAuthStatus] = useState("checking") // checking, unauthorized, authorized
const [user, setUser] = useState(null)
const [email, setEmail] = useState("")
const [accessCode, setAccessCode] = useState("")

// Theme detection
const [theme, setTheme] = useState('light')
useEffect(() => {
  const updateTheme = () => setTheme(document.body.dataset.framerTheme || 'light')
  updateTheme()
  const observer = new MutationObserver(updateTheme)
  observer.observe(document.body, { attributes: true })
  return () => observer.disconnect()
}, [])

// User detection
useEffect(() => {
  framer.getCurrentUser().then(setUser)
}, [])

// Verification helper (JSONP)
const verifyAccess = (email, accessCode, bind = false) => {
  return new Promise((resolve, reject) => {
    const callback = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const script = document.createElement('script')
    
    window[callback] = (response) => {
      cleanup()
      resolve(response)
    }
    
    const cleanup = () => {
      delete window[callback]
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
    
    const params = new URLSearchParams({
      email: email.trim().toLowerCase(),
      access_code: accessCode.trim(),
      plugin_name: PLUGIN_NAME,
      framer_user_id: user?.id || "",
      bind: bind ? "1" : "0",
      callback
    })
    
    script.src = `${VERIFY_ENDPOINT}?${params}`
    script.onerror = () => {
      cleanup()
      reject(new Error('Network error'))
    }
    
    document.head.appendChild(script)
    
    setTimeout(() => {
      if (window[callback]) {
        cleanup()
        reject(new Error('Timeout'))
      }
    }, 15000)
  })
}

// Two-step verification
const handleVerification = async () => {
  try {
    setAuthStatus("checking")
    
    // Step 1: Pre-check
    const preCheck = await verifyAccess(email, accessCode, false)
    if (!preCheck.ok || !preCheck.valid) {
      setAuthStatus("unauthorized")
      framer.notify(preCheck.error || "Invalid credentials", { type: "error" })
      return
    }
    
    // Step 2: Bind if needed
    if (!preCheck.bound && user?.id) {
      const bindResult = await verifyAccess(email, accessCode, true)
      if (!bindResult.ok || !bindResult.valid) {
        setAuthStatus("unauthorized")
        framer.notify(bindResult.error || "Binding failed", { type: "error" })
        return
      }
    }
    
    setAuthStatus("authorized")
    framer.notify("Access granted!", { type: "success" })
    
    // Cache session
    localStorage.setItem('auth_session', JSON.stringify({
      email,
      verified: true,
      timestamp: Date.now()
    }))
    
  } catch (error) {
    setAuthStatus("unauthorized")
    framer.notify("Verification failed", { type: "error" })
  }
}

// Component insertion helper
const insertComponent = async (props = {}) => {
  if (!framer.isAllowedTo("addComponentInstance")) {
    framer.notify("Cannot add components to this project", { type: "error" })
    return
  }
  
  try {
    await framer.addComponentInstance({
      url: COMPONENT_URL,
      attributes: {
        width: 600,
        height: 400,
        ...props
      }
    })
    framer.notify("Component added!", { type: "success" })
  } catch (error) {
    framer.notify("Failed to add component", { type: "error" })
  }
}

// Cached session check
useEffect(() => {
  const cached = localStorage.getItem('auth_session')
  if (cached) {
    try {
      const session = JSON.parse(cached)
      const isRecent = Date.now() - session.timestamp < 8 * 60 * 60 * 1000 // 8 hours
      if (isRecent && session.email === email) {
        setAuthStatus("authorized")
        return
      }
    } catch {}
  }
  setAuthStatus("unauthorized")
}, [email])

// DEV MODE SHORTCUTS
const __isLocal = window.location.hostname === "localhost"

if (__isLocal) {
  // Auto-fill in development
  useEffect(() => {
    setEmail("dev@test.com")
    setAccessCode("test123")
  }, [])
  
  // Skip verification in dev
  if (__isLocal && authStatus === "unauthorized") {
    setAuthStatus("authorized")
  }
}

// RENDER
if (authStatus !== "authorized") {
  return (
    <div style={{ 
      padding: 20, 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center",
      background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
      color: theme === 'dark' ? '#fff' : '#000'
    }}>
      <h2>{PLUGIN_NAME} - Access Required</h2>
      <input 
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ margin: '10px 0', padding: 8 }}
      />
      <input 
        placeholder="Access Code"
        value={accessCode}
        onChange={(e) => setAccessCode(e.target.value)}
        style={{ margin: '10px 0', padding: 8 }}
      />
      <button onClick={handleVerification}>
        Verify Access
      </button>
    </div>
  )
}

return (
  <div style={{ padding: 20 }}>
    <h2>{PLUGIN_NAME}</h2>
    <p>Welcome, {user?.name || user?.email}</p>
    
    <button onClick={() => insertComponent()}>
      Add Component
    </button>
    
    {__isLocal && (
      <div style={{ marginTop: 20, padding: 10, background: '#ff0', color: '#000' }}>
        <strong>DEV MODE</strong><br/>
        Auto-verified: {authStatus}<br/>
        User ID: {user?.id}
      </div>
    )}
  </div>
)
```

## Color Picker Slider Snippet

Use this pattern when you need hue/opacity sliders that show a circular indicator without the native progress bar fill:

```tsx
<div className="framerColorSliderWrapper" style={{ background: hueGradient }}>
  <div className="framerColorHueCircle" style={{ left: `${(h / 360) * 100}%` }} />
  <input
    className="framerColorHue"
    type="range"
    min={0}
    max={360}
    value={Math.round(h)}
    onChange={...}
  />
</div>
<div className="framerColorSliderWrapper" style={{ background: opacityGradient }}>
  <div className="framerColorAlphaCircle" style={{ left: `${alpha * 100}%` }} />
  <input
    className="framerColorAlpha"
    type="range"
    min={0}
    max={100}
    value={Math.round(alpha * 100)}
    onChange={...}
  />
</div>
```

CSS helpers that keep the gradient visible while hiding the native progress fill:

```css
.framerColorSliderWrapper input {
  opacity: 0;
}

.framerColorSliderWrapper::before {
  content: "";
  position: absolute;
  inset: 0;
  background: inherit;
  border-radius: inherit;
  pointer-events: none;
}

.framerColorHueCircle,
.framerColorAlphaCircle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 5;
}

.framerColorHue::-webkit-slider-progress,
.framerColorAlpha::-webkit-slider-progress,
.framerColorHue::-moz-range-progress,
.framerColorAlpha::-moz-range-progress {
  background: transparent !important;
  height: 0;
  display: none;
}
```

This preserves the gradient background while the circular dot shows the current value.

## Carousel Icon Picker Snippet

Use this pattern when you want a horizontally scrolling icon picker with previous/next arrows and an active glow state:

```tsx
const ICON_OPTIONS = ["MagicWand", "Wheelchair", "TextAa", "PersonSimple"] as const

function IconCarouselPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className="iconCarousel" role="listbox" aria-label="Launcher icon">
      <button
        type="button"
        className="iconCarousel-arrow"
        aria-label="Previous icon"
        onClick={() => {
          const currentIndex = ICON_OPTIONS.indexOf(value)
          const nextIndex = (currentIndex - 1 + ICON_OPTIONS.length) % ICON_OPTIONS.length
          onChange(ICONS[nextIndex])
        }}
      >
        ‹
      </button>
      <div className="iconCarousel-track" ref={trackRef}>
        {ICON_OPTIONS.map((iconKey, idx) => (
          <button
            key={iconKey}
            type="button"
            className={`iconCarousel-item ${iconKey === value ? "active" : ""}`}
            aria-selected={iconKey === value}
            data-index={idx}
            onClick={() => onChange(iconKey)}
          >
            <span className="iconCarousel-label">{iconKey}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="iconCarousel-arrow"
        aria-label="Next icon"
        onClick={() => {
          const currentIndex = ICON_OPTIONS.indexOf(value)
          const nextIndex = (currentIndex + 1) % ICON_OPTIONS.length
          onChange(ICON_OPTIONS[nextIndex])
        }}
      >
        ›
      </button>
    </div>
  )
}
```

The CSS defined under `.iconCarousel`, `.iconCarousel-track`, `.iconCarousel-item`, and `.iconCarousel-arrow` in `App.css` already provide the groove, snapping, and active glow; reuse them by placing this component inside a card and pairing it with the `.widgetLauncher-field` layout.

### Component Template (PluginComponent.tsx)
```tsx
import { addPropertyControls, ControlType } from "framer"

// @framerIntrinsicWidth 600
// @framerIntrinsicHeight 400

export function PluginComponent({
  title = "Default Title",
  color = "#09F",
  size = "medium"
}) {
  const sizeMap = {
    small: { width: 300, height: 200 },
    medium: { width: 600, height: 400 },
    large: { width: 900, height: 600 }
  }
  
  const dimensions = sizeMap[size] || sizeMap.medium
  
  return (
    <div style={{
      width: dimensions.width,
      height: dimensions.height,
      background: color,
      padding: 20,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 24,
      fontWeight: "bold"
    }}>
      {title}
    </div>
  )
}

PluginComponent.defaultProps = {
  width: 600,
  height: 400,
}

addPropertyControls(PluginComponent, {
  title: {
    type: ControlType.String,
    title: "Title",
    defaultValue: "Default Title"
  },
  color: {
    type: ControlType.Color,
    title: "Background Color",
    defaultValue: "#09F"
  },
  size: {
    type: ControlType.Enum,
    title: "Size",
    options: ["small", "medium", "large"],
    defaultValue: "medium"
  }
})
```

## Google Apps Script Template (Copy Paste)

```javascript
/****************************************************
 * PLUGIN LICENSE VERIFIER - READY TO DEPLOY
 ****************************************************/

const SPREADSHEET_ID = PropertiesService.getScriptProperties()
  .getProperty("SHEET_ID") || "YOUR_SPREADSHEET_ID_HERE"
const SHEET_NAME = "Purchases"
const CACHE_SECONDS = 300

function norm(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getHeaderMap_(sheet) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  const map = {}
  header.forEach((h, i) => (map[norm(h)] = i + 1))
  return map
}

function respond_(payload, callback) {
  const body = JSON.stringify(payload)
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${body});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT)
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON)
}

const MEMO = {}
function getCache_(key) {
  if (MEMO[key]) return MEMO[key]
  const raw = CacheService.getScriptCache().get(key)
  if (!raw) return null
  return (MEMO[key] = JSON.parse(raw))
}

function putCache_(key, value, seconds) {
  MEMO[key] = value
  CacheService.getScriptCache().put(key, JSON.stringify(value), seconds)
}

function doGet(e) {
  const params = e?.parameter || {}
  const callback = (params.callback || "").trim()
  const email = String(params.email || "").trim().toLowerCase()
  const accessCode = String(params.access_code || "").trim()
  const framerUserId = String(params.framer_user_id || "").trim()
  const pluginName = norm(params.plugin || params.plugin_name || "")
  const bind = params.bind === "1"
  const noCache = params.nocache === "1"

  if (!email || !accessCode) {
    return respond_({ ok: false, error: "missing email or access_code" }, callback)
  }

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
    if (!sheet) {
      return respond_({ ok: false, error: `Sheet "${SHEET_NAME}" not found` }, callback)
    }

    const map = getHeaderMap_(sheet)
    const col = (label) => map[norm(label)] || 0
    const cEmail = col("Client Email")
    const cCode = col("Access Code")
    const cPlugin = col("Plugin Name")
    const cFuid = col("Framer User ID")
    const cClient = col("Client Name")

    if (!cEmail || !cCode || !cPlugin || !cFuid) {
      return respond_({ ok: false, error: "Missing required columns" }, callback)
    }

    const rowCount = sheet.getLastRow() - 1
    if (rowCount <= 0) {
      return respond_({ ok: true, valid: false, bound: false, reason: "not_found" }, callback)
    }

    const readCol = (colIdx) => sheet.getRange(2, colIdx, rowCount, 1).getValues().flat()
    const emailValues = readCol(cEmail)
    const codeValues = readCol(cCode)
    const pluginValues = readCol(cPlugin)
    const framerIds = readCol(cFuid)
    const clientNames = cClient ? readCol(cClient) : []

    const matches = []
    for (let i = 0; i < rowCount; i++) {
      if (emailValues[i]?.toLowerCase().trim() === email && codeValues[i]?.trim() === accessCode) {
        matches.push(i)
      }
    }
    
    if (!matches.length) {
      return respond_({ ok: true, valid: false, bound: false, reason: "not_found" }, callback)
    }

    const filtered = pluginName
      ? matches.filter((i) => norm(pluginValues[i]) === pluginName)
      : matches
      
    if (!filtered.length) {
      const firstIdx = matches[0]
      return respond_({
        ok: true,
        valid: false,
        bound: !!String(framerIds[firstIdx]).trim(),
        reason: "wrong_plugin",
        plugin_name_found: pluginValues[firstIdx],
      }, callback)
    }

    let idx = filtered.find((i) => !String(framerIds[i]).trim())
    if (idx === undefined) idx = filtered.find((i) => String(framerIds[i]).trim() === framerUserId)
    if (idx === undefined) idx = filtered[0]

    const projectName = clientNames[idx]
    const boundFuid = String(framerIds[idx] || "").trim()
    const buildResponse = (payload) => respond_(payload, callback)

    let cacheKey = null
    if (!noCache && !bind) {
      const tag = pluginName || "any"
      cacheKey = `verify:${email}:${accessCode}:${framerUserId || "anonymous"}:${tag}`
      const cached = getCache_(cacheKey)
      if (cached) return buildResponse(cached)
    }

    const setCache = (payload) => {
      if (cacheKey) putCache_(cacheKey, payload, CACHE_SECONDS)
      return buildResponse(payload)
    }

    if (bind || (framerUserId && !boundFuid)) {
      const lock = LockService.getScriptLock()
      try {
        lock.waitLock(5000)
        const cell = sheet.getRange(idx + 2, cFuid, 1, 1)
        const current = String(cell.getValue() || "").trim()
        if (!current && framerUserId) {
          cell.setValue(framerUserId)
          return setCache({ ok: true, valid: true, bound: true, project_name: projectName, action: "bound" })
        }
        if (current === framerUserId) {
          return setCache({ ok: true, valid: true, bound: true, project_name: projectName, action: "already_bound" })
        }
        return setCache({ ok: true, valid: false, bound: true, reason: "bound_to_other" })
      } finally {
        try { lock.releaseLock() } catch (_) {}
      }
    }

    if (!boundFuid) {
      return setCache({ ok: true, valid: true, bound: false, project_name: projectName })
    }
    if (!framerUserId) {
      return setCache({ ok: true, valid: false, bound: true, reason: "bound_requires_user_id" })
    }
    if (boundFuid === framerUserId) {
      return setCache({ ok: true, valid: true, bound: true, project_name: projectName, action: "already_bound" })
    }
    return setCache({ ok: true, valid: false, bound: true, reason: "bound_to_other" })

  } catch (error) {
    return respond_({ ok: false, error: error.toString() }, callback)
  }
}
```

## Dev Environment Setup

### .env.local Template
```env
VITE_VERIFY_ENDPOINT=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_COMPONENT_URL=https://your-component-url
VITE_DEBUG=true
```

### Package.json Scripts (Enhanced)
```json
{
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview --port 4173",
    "lint": "eslint . --ext ts,tsx --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "pack": "npx framer-plugin-tools@latest pack",
    "pack:preview": "npm run build && npm run pack && npm run preview",
    "clean": "rm -rf dist node_modules package-lock.json",
    "fresh": "npm run clean && npm install",
    "dev:clean": "npm run clean && npm run dev"
  }
}
```

### Vite Config (Optimized)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { framer } from 'vite-plugin-framer'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [react(), mkcert(), framer()],
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: true
  },
  build: {
    sourcemap: true,
    minify: 'esbuild'
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
})
```

## Quick Commands

### Development Workflow
```bash
# Fresh start
npm run fresh && npm run dev

# Quick build test
npm run build && npm run preview

# Pre-publish check
npm run lint && npm run type-check && npm run build

# Package for marketplace
npm run pack
```

### Debug Commands
```bash
# Check what's in the build
npm run build && npx vite preview --port 4173

# Test component in isolation
npx framer preview PluginComponent.tsx

# Verify plugin package
unzip -l plugin.zip
```

## Common Patterns

### Permission Wrapper
```tsx
const withPermission = (permission, fn) => {
  if (!framer.isAllowedTo(permission)) {
    framer.notify(`Permission denied: ${permission}`, { type: "error" })
    return
  }
  return fn()
}

// Usage
withPermission("addComponentInstance", () => {
  framer.addComponentInstance({...})
})
```

### Error Boundary
```tsx
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false)
  
  if (hasError) {
    return <div>Something went wrong. Please refresh.</div>
  }
  
  return (
    <ErrorBoundaryComponent onError={() => setHasError(true)}>
      {children}
    </ErrorBoundaryComponent>
  )
}
```

### Loading State Hook
```tsx
const useAsync = (fn, deps = []) => {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  
  useEffect(() => {
    let cancelled = false
    
    fn()
      .then(data => !cancelled && setState({ loading: false, data, error: null }))
      .catch(error => !cancelled && setState({ loading: false, data: null, error }))
    
    return () => { cancelled = true }
  }, deps)
  
  return state
}
```

## Testing Checklist

### Before Every Release
- [ ] Dev mode auto-verification working
- [ ] Production verification flow tested
- [ ] Dark/light theme switching works
- [ ] Component insertion with/without permissions
- [ ] Error handling for network failures
- [ ] Console clean in production build
- [ ] Plugin package size reasonable (<5MB)

### Manual Testing Steps
1. Clear localStorage and test fresh verification
2. Test with invalid credentials
3. Test component insertion in various project types
4. Test permission denied scenarios
5. Test network timeout handling
6. Verify plugin closes properly

## Deployment Scripts

### Quick Deploy Script
```bash
#!/bin/bash
# deploy.sh

echo "Building plugin..."
npm run build

echo "Running checks..."
npm run lint
npm run type-check

echo "Packaging..."
npm run pack

echo "Ready to upload to Marketplace!"
echo "Package: plugin.zip"
echo "Size: $(du -h plugin.zip)"
```

### Environment Switcher
```bash
# switch-env.sh
ENV=${1:-development}

case $ENV in
  "dev")
    cp .env.dev .env.local
    echo "Switched to development"
    ;;
  "prod")
    cp .env.prod .env.local
    echo "Switched to production"
    ;;
  *)
    echo "Usage: ./switch-env.sh [dev|prod]"
    ;;
esac
```

## Styling System

### Settings Menu Dropdown (SettingsPopover)

The settings menu is a dropdown popover that appears when clicking the gear icon in the top-right corner.

#### Component Structure
```tsx
function SettingsPopover({ email, projectName, onSignOut, onTriggerRefChange }: SettingsPopoverProps) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)
    const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    
    // Position calculation - positions panel to the left of trigger
    const measurePanelPosition = useCallback(() => {
        if (!triggerRef.current || typeof window === "undefined") return
        const rect = triggerRef.current.getBoundingClientRect()
        const panelWidth = 250
        const safeLeft = Math.max(12, rect.left - panelWidth - 8 + 30) // 8px gap, 30px offset
        const top = rect.top // Align with trigger's top
        setPanelPos({ top, left: safeLeft })
    }, [])
    
    // Click outside to close
    useEffect(() => {
        if (!open || typeof document === "undefined") return
        const handlePointer = (event: Event) => {
            const target = event.target instanceof Node ? event.target : null
            if (!target) return
            const isInsideMenu = menuRef.current?.contains(target)
            const isInsidePanel = panelRef.current?.contains(target)
            if (!isInsideMenu && !isInsidePanel) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handlePointer)
        document.addEventListener("touchstart", handlePointer)
        return () => {
            document.removeEventListener("mousedown", handlePointer)
            document.removeEventListener("touchstart", handlePointer)
        }
    }, [open])
}
```

#### CSS Classes
- `.settingsMenu` - Container for the menu trigger
- `.settingsMenu-trigger` - The gear icon button (28x28px, transparent background)
- `.settingsMenu-icon` - Icon styling (16x16px, rotates 180deg when open)
- `.settingsMenu-overlay` - Transparent overlay covering entire viewport (z-index: 999)
- `.settingsMenu-panel` - The dropdown panel (220px wide, fixed position, z-index: 1000)
- `.settingsMenu-account` - Account info section (border-bottom separator)
- `.settingsMenu-actions` - Action buttons container (flex column, gap: 4px)
- `.settingsMenu-item` - Individual menu item buttons (hover: ghost-bg background)

#### Key Styling Details
- Panel uses `createPortal` to render in `document.body` for proper z-index stacking
- Position calculated dynamically based on trigger position
- Panel has `border-radius: 12px`, `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15)`
- Uses theme tokens: `--surface-card`, `--border-soft`, `--text-primary`, `--ghost-bg`
- Trigger button has hover state with `background: var(--ghost-bg)`
- Menu items have `padding: 8px 10px`, `border-radius: 6px`, transition on hover

### Sign In/Out Logic

#### Sign In Flow
```tsx
const handleSignIn = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (authLoading) return
    
    const email = authEmail.trim().toLowerCase()
    const receipt = authReceipt.trim()
    
    // Validation
    if (!email || !receipt || !/^\d{4}-\d{4}$/.test(receipt)) {
        setAuthError("Email and receipt number are required.")
        setAuthStatus("denied")
        return
    }
    
    setAuthLoading(true)
    setAuthError(null)
    
    try {
        // Step 1: Pre-check (bind: false)
        const precheck = await verifyAccessJSONP(email, receipt, { bind: false })
        
        if (!precheck?.valid) {
            setAuthError(precheck?.error || "Invalid credentials")
            setAuthStatus("denied")
            return
        }
        
        // Step 2: Bind (bind: true)
        const response = await verifyAccessJSONP(email, receipt, { bind: true })
        
        if (response.valid && response.bound) {
            const snapshot = await persistValidatedSession(email, response.project_name || "")
            setAuthSnapshot(snapshot)
            setAuthStatus("authorized")
            framer.notify?.("✅ License verified.", { variant: "success" })
        }
    } catch (error) {
        setAuthError("Verification failed. Please try again.")
        setAuthStatus("denied")
    } finally {
        setAuthLoading(false)
    }
}, [authEmail, authReceipt, authLoading])
```

#### Sign Out Flow
```tsx
const handleSignOut = useCallback(async () => {
    try {
        await clearStoredSession() // Clears localStorage, plugin data, session cache
    } catch (error) {
        if (__isLocal) console.warn("[Loading Plugin] Sign out failed", error)
    } finally {
        setAuthSnapshot(null)
        setAuthStatus("unknown")
        setProjectName(null)
        setAuthError(null)
        setAuthLoading(false)
    }
}, [])
```

#### Session Persistence
- Uses `persistValidatedSession()` to save session to:
  - `localStorage` (session cache)
  - `framer.writeUserScopedPluginData("session", ...)` (user-scoped storage)
  - Legacy `framer.setPluginData()` for backward compatibility
- Session lifetime: 8 hours (SESSION_LIFETIME_MS)
- Session includes: `email`, `projectName`, `expiresAt` timestamp

### General Styling Components

#### Theme System
Uses CSS custom properties (CSS variables) for theming:

```css
/* Light Theme */
--bg-window: #ffffff
--surface-panel: rgba(255, 255, 255, 0.8)
--surface-card: #ffffff
--border-soft: rgba(17, 17, 17, 0.08)
--border-strong: rgba(17, 17, 17, 0.14)
--text-primary: #111111
--text-secondary: rgba(17, 17, 17, 0.64)
--accent-primary: #854fff
--input-background: #ffffff

/* Dark Theme */
--bg-window: #0c0b13
--surface-panel: rgba(30, 27, 46, 0.82)
--surface-card: #1e1b2e
--border-soft: rgba(255, 255, 255, 0.1)
--text-primary: rgba(255, 255, 255, 0.94)
--accent-primary: #b89bff
--input-background: rgba(20, 18, 30, 0.85)
```

Theme detection:
```tsx
const useFramerTheme = () => {
    const [theme, setTheme] = useState<ThemeMode>('light')
    
    useEffect(() => {
        const updateTheme = () => {
            setTheme((document.body.dataset.framerTheme || 'light') as ThemeMode)
        }
        updateTheme()
        const observer = new MutationObserver(updateTheme)
        observer.observe(document.body, { attributes: true })
        return () => observer.disconnect()
    }, [])
    
    return theme
}
```

#### Sliders (Range Inputs)
```css
input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 3px;
    background: transparent;
    border-radius: 1.5px;
    margin: 11px 0;
    cursor: pointer;
}

/* Track */
input[type="range"]::-webkit-slider-runnable-track {
    height: 3px;
    background: var(--text-primary);
    opacity: 0.5;
    border-radius: 1.5px;
}

/* Thumb */
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--accent-primary);
    border-radius: 50%;
    border: 2px solid var(--surface-card);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    margin-top: -6.5px;
}

input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
```

Usage with value display:
```tsx
<label className="flexColumn">
    <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}>
        <span>Height</span>
        <span className="rangeValue">{value.toFixed(0)}</span>
    </span>
    <input
        type="range"
        min={1}
        max={50}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
    />
</label>
```

#### Width Sliders
Two approaches for width/thickness controls: standard range inputs and visual sliders.

**Option 1: Standard Range Input with Value Display**
```tsx
<label className="flexColumn">
    <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}>
        <span>Border Width</span>
        <span className="rangeValue">{value.toFixed(1)}</span>
    </span>
    <input
        type="range"
        min={0.5}
        max={8}
        step={0.5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
    />
</label>
```

**Option 2: Visual Slider with Vertical Lines (Recommended for better UX)**
```tsx
const VisualsSlider = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    lineCount = 12,
}: {
    value: number
    onChange: (value: number) => void
    min: number
    max: number
    step?: number
    lineCount?: number
}) => {
    const range = max - min
    const normalizedValue = Math.max(0, Math.min(1, (value - min) / range))
    
    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = event.currentTarget.closest('.visualsSlider-lines')
        if (!container) return
        const rect = container.getBoundingClientRect()
        const percent = (event.clientX - rect.left) / rect.width
        const newValue = min + percent * range
        onChange(Math.max(min, Math.min(max, newValue)))
    }
    
    return (
        <div className="visualsSlider">
            <div className="visualsSlider-lines" onPointerDown={handlePointerDown}>
                <div className="visualsSlider-label">Width</div>
                <div className="visualsSlider-content">
                    {Array.from({ length: lineCount }).map((_, index) => {
                        const linePosition = (index + 1) / lineCount
                        const isActive = linePosition <= normalizedValue
                        const heightPercent = Math.max(15, linePosition * 100)
                        
                        return (
                            <div
                                key={index}
                                className={`visualsSlider-line ${isActive ? "is-active" : ""}`}
                                style={{
                                    height: `${heightPercent}%`,
                                }}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
```

**Visual Slider CSS:**
```css
.visualsSlider {
    position: relative;
    width: 100%;
}

.visualsSlider-lines {
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
    position: relative;
    /* Fine-tune positioning as needed */
    top: -5px;
    left: 5px;
}

.visualsSlider-label {
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 500;
    padding: 6px 2px 0 2px;
    line-height: 1;
    position: relative;
    /* Fine-tune label positioning */
    top: 5px;
    left: -3px;
}

.visualsSlider-content {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 2px;
    height: 20px;
}

.visualsSlider-line {
    flex: 1;
    min-width: 1.5px;
    background: var(--text-tertiary);
    border-radius: 1px;
    transition: background-color 0.15s ease, opacity 0.15s ease;
    opacity: 0.5;
}

.visualsSlider-line.is-active {
    background: var(--accent-primary);
    opacity: 1;
}
```

**Usage Examples:**
```tsx
// Track Thickness (1-8 range, 12 lines)
<label>
    <span>Track Thickness</span>
    <VisualsSlider
        value={controls.trackThickness}
        onChange={(value) => setControls(prev => ({
            ...prev,
            trackThickness: value
        }))}
        min={1}
        max={8}
        step={0.5}
        lineCount={12}
    />
</label>

// Border Width (1-6 range, 16 lines)
<label>
    <span>Border Width</span>
    <VisualsSlider
        value={controls.borderWidth}
        onChange={(value) => setControls(prev => ({
            ...prev,
            borderWidth: value
        }))}
        min={1}
        max={6}
        step={0.5}
        lineCount={16}
    />
</label>
```

**When to Use Each:**
- **Standard Range Input**: When precise numerical feedback is important
- **Visual Slider**: When visual feedback and compact design are preferred (recommended for width/thickness controls)

#### Color Pickers
```css
input[type="color"] {
    width: 100%;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--border-soft);
    padding: 3px;
    background: var(--surface-card);
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
}

input[type="color"]:hover {
    border-color: var(--border-strong);
}

input[type="color"]:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-focus-ring);
}
```

Usage:
```tsx
<label className="flexColumn">
    <span style={{ marginLeft: 5 }}>Fill color</span>
    <input
        type="color"
        value={color}
        onChange={(event) => onChange(event.target.value)}
    />
</label>
```

#### Dropdowns (Select Menus)
```css
select {
    border-radius: 6px;
    border: 1px solid var(--border-soft);
    padding: 8px 10px;
    padding-right: 28px; /* Space for arrow */
    font-size: 13px;
    background: var(--input-background);
    color: var(--text-primary);
    cursor: pointer;
    background-image: url("data:image/svg+xml,..."); /* Custom arrow */
    background-repeat: no-repeat;
    background-position: right 8px center;
    -webkit-appearance: none;
    appearance: none;
}

select:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-focus-ring);
}
```

#### Font Picker
```tsx
<label>
    <span style={{ marginLeft: 5 }}>Font</span>
    <select
        value={selectedFont}
        onChange={(event) => {
            const fontFamily = event.target.value
            const variants = fontsByFamily.get(fontFamily) ?? []
            const fallbackVariant = variants.find(v => v.style === "normal") ?? variants[0]
            updateFont({
                labelFontFamily: fontFamily,
                labelFontWeight: fallbackVariant?.weight ?? 400,
                labelFont: {
                    fontFamily,
                    fontWeight: fallbackVariant?.weight ?? 400,
                    fontStyle: fallbackVariant?.style === "italic" ? "italic" : "normal",
                },
            })
        }}
    >
        {fontFamilyOptions.map((family) => (
            <option key={family} value={family}>{family}</option>
        ))}
    </select>
</label>
```

#### Background Colors
Background colors use theme tokens:
- `var(--bg-window)` - Main window background
- `var(--surface-panel)` - Panel/section backgrounds
- `var(--surface-card)` - Card backgrounds
- `var(--input-background)` - Input field backgrounds
- `var(--ghost-bg)` - Subtle hover backgrounds

### Text Input Styling

#### Monospace Font for Text Inputs
Apply monospace font to all text inputs and textareas for consistent technical styling:

```css
/* Editor section inputs */
.editor-section input,
.editor-section textarea {
  font-family: monospace;
  font-size: 13px;
}

/* Login form inputs */
.login-field input {
  font-family: monospace;
  font-size: 13px;
}

/* Dropdown/select menus */
.editor-section select,
.input-with-clear select {
  font-family: monospace;
}
```

Usage notes:
- Applied to accessibility checker inputs for document title, language, labels, alt text, and media descriptions
- Applied to login form email and access code fields
- Applied to dropdown/select menus for role selection and tag filtering
- Maintains consistent spacing and readability across all text entry fields

### Number Input with +/- Stepper Buttons

Number inputs with custom +/- stepper buttons for better UX and visual consistency.

#### CSS Styling
```css
/* NumberInput w/ +/- stepper (cheatsheet-style) */
.numberStepper {
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border-soft);
  background: var(--input-background);
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.numberStepper:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-focus-ring);
}

.numberStepper input[type="number"] {
  flex: 1 1 auto;
  border: none;
  background: transparent;
  box-shadow: none !important;
  outline: none !important;
  padding: 8px 10px;
  text-align: left;
}

.numberStepper input[type="number"]:focus-visible {
  box-shadow: none !important;
  outline: none !important;
}

.numberStepper-controls {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 10px 0 0;
  flex: 0 0 auto;
}

.numberStepper-sep {
  color: var(--text-secondary);
  opacity: 0.75;
  font-size: 13px;
  line-height: 1;
  user-select: none;
}

.numberStepper-btn {
  height: 28px;
  width: 28px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: opacity 0.15s ease;
}

.numberStepper-btn:hover:not(:disabled),
.numberStepper-btn:active:not(:disabled),
.numberStepper-btn:focus:not(:disabled) {
  background: transparent;
  outline: none;
}

.numberStepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Remove browser spinner chrome from number inputs */
input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```

#### Component Usage
```tsx
<label className="widgetLauncher-field">
    <span>Padding</span>
    <div className="numberStepper">
        <input
            type="number"
            min={6}
            max={24}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={e => onChange(Number(e.target.value) || defaultValue)}
            aria-label="Padding"
        />
        <div className="numberStepper-controls" aria-hidden={false}>
            <button
                type="button"
                className="numberStepper-btn"
                aria-label="Decrease padding"
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
            >
                -
            </button>
            <span className="numberStepper-sep" aria-hidden>
                |
            </span>
            <button
                type="button"
                className="numberStepper-btn"
                aria-label="Increase padding"
                onClick={() => onChange(Math.min(max, value + 1))}
                disabled={value >= max}
            >
                +
            </button>
        </div>
    </div>
</label>
```

#### Key Features
- **Container**: `.numberStepper` wraps the input and controls in a single bordered container
- **Input**: Borderless, transparent background, flex-grows to fill available space
- **Controls**: Right-aligned buttons with separator (`|`) between them
- **Buttons**: 28x28px transparent buttons with `-` and `+` symbols, disabled state at min/max
- **Focus**: Container shows focus ring when input is focused (`:focus-within`)
- **Accessibility**: Proper `aria-label` attributes on buttons and input
- **Browser spinners**: Removed via CSS (appearance: textfield, webkit spinner removal)

#### Behavior
- Buttons automatically disable when value reaches `min` or `max`
- Uses `Math.max()` and `Math.min()` to enforce bounds
- Input accepts direct typing and respects min/max/step attributes
- Container border changes color on focus (accent-primary with focus ring)
- Buttons have no background on hover/active (transparent), only opacity change on disabled

### Visual Slider with Vertical Lines
Custom slider component that displays vertical lines scaling based on value, providing visual feedback without numerical display.

#### Component Template
```tsx
const VisualsSlider = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    lineCount = 12,
}: {
    value: number
    onChange: (value: number) => void
    min: number
    max: number
    step?: number
    lineCount?: number
}) => {
    const range = max - min
    const normalizedValue = Math.max(0, Math.min(1, (value - min) / range))
    
    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = event.currentTarget.closest('.visualsSlider-lines')
        if (!container) return
        const rect = container.getBoundingClientRect()
        const percent = (event.clientX - rect.left) / rect.width
        const newValue = min + percent * range
        onChange(Math.max(min, Math.min(max, newValue)))
    }
    
    return (
        <div className="visualsSlider">
            <div className="visualsSlider-lines" onPointerDown={handlePointerDown}>
                <div className="visualsSlider-label">Width</div>
                <div className="visualsSlider-content">
                    {Array.from({ length: lineCount }).map((_, index) => {
                        const linePosition = (index + 1) / lineCount
                        const isActive = linePosition <= normalizedValue
                        const heightPercent = Math.max(15, linePosition * 100)
                        
                        return (
                            <div
                                key={index}
                                className={`visualsSlider-line ${isActive ? "is-active" : ""}`}
                                style={{
                                    height: `${heightPercent}%`,
                                }}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
```

#### CSS Styling
```css
/* Visual Slider with Vertical Lines */
.visualsSlider {
    position: relative;
    width: 100%;
}

.visualsSlider-lines {
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
    position: relative;
    /* Fine-tune positioning as needed */
    top: -5px;
    left: 5px;
}

.visualsSlider-label {
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 500;
    padding: 6px 2px 0 2px;
    line-height: 1;
    position: relative;
    /* Fine-tune label positioning */
    top: 5px;
    left: -3px;
}

.visualsSlider-content {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 2px;
    height: 20px;
}

.visualsSlider-line {
    flex: 1;
    min-width: 1.5px;
    background: var(--text-tertiary);
    border-radius: 1px;
    transition: background-color 0.15s ease, opacity 0.15s ease;
    opacity: 0.5;
}

.visualsSlider-line.is-active {
    background: var(--accent-primary);
    opacity: 1;
}
```

#### Usage Example
```tsx
// In your settings component
<label>
    <span>Track Thickness</span>
    <VisualsSlider
        value={controls.trackThickness}
        onChange={(value) => setControls(prev => ({
            ...prev,
            trackThickness: value
        }))}
        min={1}
        max={8}
        step={0.5}
        lineCount={12}
    />
</label>

<label>
    <span>Border Width</span>
    <VisualsSlider
        value={controls.borderWidth}
        onChange={(value) => setControls(prev => ({
            ...prev,
            borderWidth: value
        }))}
        min={1}
        max={6}
        step={0.5}
        lineCount={16}
    />
</label>
```

#### Key Features
- **Visual Feedback**: Vertical lines scale proportionally based on value
- **Active State**: Lines at or below current value show full height in accent color
- **Inactive State**: Lines above current value show proportional height in muted color
- **Direct Interaction**: Click anywhere on the lines to set value
- **Compact Design**: Integrated label, no numerical display, matches other form controls
- **Responsive**: Works with different line counts and value ranges

#### Positioning Strategy
Use relative positioning for fine-tuned layout adjustments:
- `.visualsSlider-lines`: Position the interactive lines container
- `.visualsSlider-label`: Position the label independently
- Allows overlapping and precise alignment without affecting container size

#### Customization Options
- `lineCount`: Number of vertical lines (12-16 recommended)
- `min/max/step`: Value range and increment
- Label text: Customize by changing the content of `.visualsSlider-label`
- Heights: Adjust `heightPercent` calculation for different visual effects
- Colors: Uses theme variables (`--accent-primary`, `--text-tertiary`)

### Menu Organization

#### SettingsGroup Component
Collapsible section with toggle button:

```tsx
function SettingsGroup({ title, children, icon, open, onToggle }: SettingsGroupProps) {
    return (
        <section className={`settingsGroup ${open ? "is-open" : "is-closed"}`}>
            <button
                type="button"
                className="settingsGroup-toggle"
                onClick={onToggle}
                aria-expanded={open}
            >
                <span className="settingsGroup-label">
                    {icon && <span className="settingsGroup-icon">{icon}</span>}
                    {title}
                </span>
                <ChevronIcon className="settingsGroup-chevron" />
            </button>
            {open && <div className="settingsGrid">{children}</div>}
        </section>
    )
}
```

#### CSS Classes
- `.settingsGroup` - Container (transparent background, no border)
- `.settingsGroup-toggle` - Toggle button (padding: 14px 16px, hover: ghost-bg)
- `.settingsGroup-label` - Label container (flex, gap: 10px)
- `.settingsGroup-icon` - Icon styling (accent-primary color, opacity: 0.85, full opacity when open)
- `.settingsGroup-chevron` - Chevron icon (rotates 180deg when open)
- `.settingsGrid` - Content container (flex column, gap: 12px, padding: 14px 16px)

### Row Logic for Multiple Items

#### SettingsRow Component
Flex container that prefers multiple items per row:

```css
.settingsRow {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    width: 100%;
    margin: 0;
}

.settingsRow > label {
    flex: 1 1 0;
    min-width: 100px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text-secondary);
}
```

#### Row Variants

**Two items per row:**
```tsx
<div className="settingsRow settingsRow--two">
    <label>Item 1</label>
    <label>Item 2</label>
</div>
```
```css
.settingsRow.settingsRow--two {
    justify-content: flex-start;
    gap: 8px;
    align-items: center;
}
```

**Three items per row:**
```tsx
<div className="settingsRow settingsRow--triple">
    <label className="inlineLabel">
        <span>Minimum</span>
        <NumberInput value={min} onChange={setMin} />
    </label>
    <label className="inlineLabel">
        <span>Maximum</span>
        <NumberInput value={max} onChange={setMax} />
    </label>
    <label className="inlineLabel">
        <span>Default</span>
        <NumberInput value={default} onChange={setDefault} />
    </label>
</div>
```
```css
.settingsRow.settingsRow--triple > label {
    flex: 1 1 0;
    min-width: 80px;
}
```

**No wrap (single row):**
```tsx
<div className="settingsRow" style={{ flexWrap: "nowrap" }}>
    <label style={{ flex: "1 1 0", minWidth: 0 }}>Item 1</label>
    <label style={{ flex: "1 1 0", minWidth: 0 }}>Item 2</label>
</div>
```

**Flex column layout:**
```tsx
<label className="flexColumn">
    <span style={{ marginLeft: 5 }}>Label</span>
    <input type="color" value={color} onChange={onChange} />
</label>
```
```css
.flexColumn {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
}
```

### Heading Styling

#### SettingsGroup Headings
The toggle button acts as the heading:

```css
.settingsGroup-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
}

.settingsGroup-toggle:hover {
    background: var(--ghost-bg);
}
```

#### Label Styling
Labels within settings rows:

```css
label {
    font-size: 11px;
    font-weight: 500;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.settingsRow > label {
    flex: 1 1 0;
    min-width: 100px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text-secondary);
}
```

#### Inline Labels
For labels that appear inline with inputs:

```css
.inlineLabel {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex: 1 1 0;
    min-width: 0;
}

.inlineLabel span {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text-secondary);
}
```

### Checkbox Styling

```css
.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    text-transform: none;
    letter-spacing: 0;
    font-size: 13px;
}

.checkbox input[type="checkbox"] {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    min-width: 18px;
    border: 1.5px solid var(--checkbox-border);
    border-radius: 5px;
    background: var(--input-background);
    cursor: pointer;
    transition: all 0.15s ease;
}

.checkbox input[type="checkbox"]:checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
}

.checkbox input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 5px;
    height: 9px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}
```

### Access Code Formatting (0000-0000)

For plugins that require access codes in the format `0000-0000`, use this formatting function:

```tsx
// Format access code to 0000-0000 format
function formatAccessCode(value: string): string {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "")
    // Limit to 8 digits
    const limited = digits.slice(0, 8)
    // Format as 0000-0000
    if (limited.length <= 4) {
        return limited
    }
    return `${limited.slice(0, 4)}-${limited.slice(4)}`
}

// Usage in input field with autofill memory
<label className="login-field">
    <span>Email</span>
    <input
        type="email"
        name="email"
        id="login-email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        autoComplete="username"
        autoFocus
    />
</label>
<label className="login-field">
    <span>Access Code</span>
    <input
        type="text"
        name="access-code"
        id="login-access-code"
        value={accessCode}
        onChange={e => {
            const formatted = formatAccessCode(e.target.value)
            setAccessCode(formatted)
        }}
        placeholder="0000-0000"
        autoComplete="current-password"
        maxLength={9}
        onKeyDown={e => {
            if (e.key === "Enter") {
                handleLogin()
            }
        }}
        style={{ fontFamily: "monospace", letterSpacing: "2px" }}
    />
</label>

// In login handler, remove dashes before validation
const accessCode = authAccessCode.trim().replace(/-/g, "")
```

**Key points:**
- Strips all non-digit characters automatically
- Limits to 8 digits maximum
- Adds dash after 4th digit
- `maxLength={9}` prevents over-typing
- Remove dashes in validation: `accessCode.replace(/-/g, "")`

**Autofill Memory Setup:**
- Add `name` and `id` attributes to inputs for browser recognition
- Email field: `autoComplete="username"` (browsers recognize this for credential autofill)
- Access code field: 
  - Use `type="text"` (visible, not hidden)
  - `autoComplete="current-password"` (treats it as a credential to remember, even with text type)
  - Add `style={{ fontFamily: "monospace", letterSpacing: "2px" }}` for better readability of formatted code
  - The combination of `name`, `id`, and `autoComplete="current-password"` enables browser autofill memory
- Browser will remember and suggest previously entered email/access code combinations
- Use `autoFocus` on email field for better UX
- The `name` and `id` attributes combined with `autoComplete="current-password"` ensure browsers remember the access code even though it's a text field

## Horizontal Layout with Live Preview

### Overview
Advanced horizontal layout pattern for plugins with live preview and positioned overlay controls. Perfect for visual components that need real-time feedback.

### Core Architecture

#### Layered Container System
```tsx
{/* Live Preview Container - Base Layer */}
<div
    className="preview"
    style={{
        background: "transparent",
        position: "absolute",
        top: "0px",
        left: "0",
        right: "0",
        zIndex: "0",
        width: "98%",
        margin: "0 auto",
        height: "300px",
        overflow: "visible",
    }}
>
    <svg width="100%" height="100%" viewBox="-150 -150 1500 1375">
        {/* Your live preview content */}
        <defs>
            <linearGradient id="previewGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colorStart} />
                <stop offset="50%" stopColor={colorEnd} />
                <stop offset="100%" stopColor={colorStart} />
            </linearGradient>
        </defs>
        {/* Preview component */}
    </svg>
</div>

{/* Overlay Container for Controls - Middle Layer */}
<div
    style={{
        position: "absolute",
        top: "0px",
        left: "0",
        right: "0",
        width: "98%",
        margin: "0 auto",
        height: "300px",
        pointerEvents: "none", // Disable all pointer events
        zIndex: 1
    }}
>
    {/* Individual controls with pointerEvents: "auto" */}
    <button style={{ pointerEvents: "auto" }}>Insert</button>
    <div style={{ pointerEvents: "auto" }}>Mode Toggle</div>
</div>
```

### Key Components

#### Multi-Color Picker Grid
```tsx
function MultiColorPicker({ 
    colorStart, 
    colorEnd, 
    onChange 
}: { 
    colorStart: string
    colorEnd: string
    onChange: (type: 'colorStart' | 'colorEnd', value: string) => void 
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <label className="formLabel">Colors</label>
            
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "0",
                borderRadius: "6px",
                overflow: "hidden",
                height: "32px",
                boxSizing: "border-box"
            }}>
                {/* Color Start */}
                <div style={{ 
                    position: "relative", 
                    height: "100%",
                    overflow: "hidden"
                }}>
                    <input
                        type="color"
                        value={colorStart}
                        onChange={(e) => onChange('colorStart', e.target.value)}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            opacity: 0,
                            cursor: "pointer",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            zIndex: 2
                        }}
                    />
                    <div
                        style={{
                            backgroundColor: colorStart,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRight: "1px solid var(--border-soft)",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                            zIndex: 1
                        }}
                    />
                </div>
                
                {/* Color End */}
                <div style={{ 
                    position: "relative", 
                    height: "100%",
                    overflow: "hidden"
                }}>
                    <input
                        type="color"
                        value={colorEnd}
                        onChange={(e) => onChange('colorEnd', e.target.value)}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            opacity: 0,
                            cursor: "pointer",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            zIndex: 2
                        }}
                    />
                    <div
                        style={{
                            backgroundColor: colorEnd,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                            zIndex: 1
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
```

#### Vertical Slider Component
```tsx
function VerticalSlider({ 
    value, 
    onChange, 
    min = -400, 
    max = 400, 
    step = 5 
}: {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
}) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            width: "32px",
        }}>
            <span style={{
                fontSize: "12px",
                color: "var(--text-primary)",
                fontWeight: "600",
            }}>
                +
            </span>
            <input
                type="range"
                className="slider-vertical"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                min={min}
                max={max}
                step={step}
                style={{
                    width: "3px",
                    height: "60px",
                    outline: "none",
                    cursor: "pointer",
                    writingMode: "vertical-lr", // Standard CSS
                    WebkitAppearance: "slider-vertical", // WebKit
                    // Invert progress for intuitive up=more behavior
                    ["--slider-progress" as any]: `${100 - Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`,
                }}
            />
        </div>
    )
}
```

#### Mode Toggle Overlay
```tsx
function ModeToggle({ mode, onChange }: {
    mode: string
    onChange: (mode: string) => void
}) {
    return (
        <div style={{
            position: "absolute",
            bottom: "93px",
            left: "15px",
            transform: "translateY(40px)",
            display: "flex",
            background: "var(--border-soft)",
            borderRadius: "6px",
            padding: "2px",
            gap: "4px",
            zIndex: 1,
            height: "32px",
            pointerEvents: "auto"
        }}>
            <button
                onClick={() => onChange("mode1")}
                style={{
                    flex: 1,
                    padding: "6px",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "14px",
                    cursor: "pointer",
                    background: mode === "mode1" ? "var(--accent-primary)" : "transparent",
                    color: mode === "mode1" ? "white" : "var(--text-primary)",
                    transition: "all 0.2s",
                    height: "28px"
                }}
            >
                <Mode1Icon />
            </button>
            <button
                onClick={() => onChange("mode2")}
                style={{
                    flex: 1,
                    padding: "6px",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "14px",
                    cursor: "pointer",
                    background: mode === "mode2" ? "var(--accent-primary)" : "transparent",
                    color: mode === "mode2" ? "white" : "var(--text-primary)",
                    transition: "all 0.2s",
                    height: "28px"
                }}
            >
                <Mode2Icon />
            </button>
        </div>
    )
}
```

#### Controls Grid Layout
```tsx
<div className="controlsGrid" style={{ marginTop: "210px" }}>
    <div className="controlGroup">
        <MultiColorPicker
            colorStart={controls.colorStart}
            colorEnd={controls.colorEnd}
            onChange={(type, value) => updateControl(type, value)}
        />
    </div>
    
    <div className="controlGroup">
        <label className="formLabel">Property</label>
        <NumberInput
            value={controls.property}
            onChange={(value) => updateControl("property", value)}
            min={10}
            max={200}
            step={1}
        />
    </div>
    
    <div className="controlGroup">
        <label className="formLabel">Visual Property</label>
        <div style={{
            height: "32px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
            cursor: "pointer",
            position: "relative"
        }}
        onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percent = Math.max(0, Math.min(1, x / rect.width))
            const value = min + percent * (max - min)
            updateControl("property", Math.round(value / step) * step)
        }}
        >
            {[...Array(20)].map((_, i) => {
                const percent = i / 19
                const isActive = percent <= (controls.property - min) / (max - min)
                const height = 20 + percent * 80 // Visual height mapping
                return (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: `${height}%`,
                            background: isActive ? "var(--accent-primary)" : "var(--border-soft)",
                            borderRadius: "2px",
                            transition: "all 0.2s"
                        }}
                    />
                )
            })}
        </div>
    </div>
</div>
```

### CSS Classes

```css
.controlsGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 0 20px;
}

.controlGroup {
    display: flex;
    flex-direction: "column";
    gap: 8px;
}

.controlGroup--wide {
    grid-column: span 2;
}

.slider-vertical {
    writing-mode: vertical-lr;
    WebkitAppearance: slider-vertical;
    background: linear-gradient(
        to top,
        var(--accent-primary) var(--slider-progress),
        var(--border-soft) var(--slider-progress)
    );
}

.slider-vertical::-webkit-slider-track {
    background: transparent;
}

.slider-vertical::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: var(--accent-primary);
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

### Positioning Strategy

#### Common Overlay Positions
```tsx
// Top-right: Primary actions
<button style={{
    position: "absolute",
    top: "20px",
    right: "20px",
    pointerEvents: "auto"
}}>Insert</button>

// Bottom-left: Mode selection
<div style={{
    position: "absolute",
    bottom: "93px",
    left: "15px",
    pointerEvents: "auto"
}}>Mode Toggle</div>

// Right edge: Fine controls
<div style={{
    position: "absolute",
    bottom: "53px",
    right: "20px",
    pointerEvents: "auto"
}}>Vertical Slider</div>

// Below preview: Detailed controls
<div style={{ marginTop: "210px" }}>
    <div className="controlsGrid">
        {/* Grid controls */}
    </div>
</div>
```

### Responsive Considerations

```tsx
// Responsive width for different screen sizes
const previewWidth = window.innerWidth < 600 ? "100%" : "98%"

// Adjust control positions for mobile
const isMobile = window.innerWidth < 768
const controlPositions = isMobile ? {
    top: "10px",
    right: "10px",
    bottom: "50px",
    left: "10px"
} : {
    top: "20px",
    right: "20px",
    bottom: "93px",
    left: "15px"
}
```

### Performance Tips

1. **Use requestAnimationFrame** for smooth animations
2. **Debounce control updates** to prevent excessive re-renders
3. **Optimize SVG viewBox** for negative padding scenarios
4. **Use CSS transforms** instead of changing position properties

```tsx
// Debounced control update
const debouncedUpdate = useMemo(
    () => debounce((key, value) => {
        setControls(prev => ({ ...prev, [key]: value }))
    }, 16), // 60fps
    []
)

// Smooth animation loop
useEffect(() => {
    let frame: number
    const start = performance.now()
    
    const loop = (now: number) => {
        const t = (now - start) / 1000
        setPhase(t * controls.speed)
        frame = requestAnimationFrame(loop)
    }
    
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
}, [controls.speed])
```

### Integration Checklist

- [ ] Set up layered container system with proper z-index
- [ ] Implement pointer events management (none on container, auto on controls)
- [ ] Create responsive width with margin auto
- [ ] Position controls absolutely relative to preview
- [ ] Use Framer CSS custom properties for theming
- [ ] Add smooth transitions for interactive elements
- [ ] Implement proper focus management
- [ ] Test with different preview sizes and content
- [ ] Ensure accessibility with proper labels and keyboard navigation

## Horizontal Layout Patterns

Two main approaches for horizontal plugin layouts: simple single-page and multi-tab systems.

### Option 1: Simple Single-Page Layout
Best for plugins with focused functionality and minimal controls.

**Structure:**
```tsx
function SimpleHorizontalPlugin() {
    return (
        <div className="pluginRoot">
            {/* Header */}
            <header className="pluginHeader">
                <h1>Plugin Name</h1>
                <p>Brief description</p>
            </header>

            {/* Main Content - Side by Side */}
            <main className="pluginBody">
                {/* Left: Preview */}
                <section className="previewPanel">
                    <div className="previewCanvas">
                        {/* Your live preview component */}
                    </div>
                </section>

                {/* Right: Controls */}
                <section className="settingsPanel">
                    <div className="settingsGroup">
                        <h3>Basic Settings</h3>
                        <div className="settingsGrid">
                            {/* Your controls */}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer Actions */}
            <footer className="pluginActionBar">
                <button className="primary">Insert Component</button>
            </footer>
        </div>
    )
}
```

**CSS for Simple Layout:**
```css
.pluginRoot {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 12px;
    box-sizing: border-box;
}

.pluginHeader {
    text-align: center;
    margin-bottom: 20px;
}

.pluginBody {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    flex: 1;
    min-height: 0;
}

.previewPanel,
.settingsPanel {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
}

.previewCanvas {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-panel);
    border-radius: 8px;
    min-height: 200px;
}
```

### Option 2: Multi-Tab Layout (Current Loading Plugin Approach)
Best for complex plugins with organized feature categories.

**Structure:**
```tsx
function MultiTabHorizontalPlugin() {
    const [activeTab, setActiveTab] = useState('preview')
    
    return (
        <div className="pluginRoot">
            {/* Header with Tabs */}
            <header className="pluginHeader">
                <nav className="pluginTabs">
                    <button 
                        className={`pluginTab ${activeTab === 'preview' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('preview')}
                    >
                        Preview
                    </button>
                    <button 
                        className={`pluginTab ${activeTab === 'settings' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                    <button 
                        className={`pluginTab ${activeTab === 'advanced' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('advanced')}
                    >
                        Advanced
                    </button>
                </nav>
            </header>

            {/* Tab Content */}
            <main className="pluginBody">
                {activeTab === 'preview' && (
                    <div className="tabContent">
                        <div className="previewPanel">
                            <div className="previewCanvas">
                                {/* Live preview */}
                            </div>
                        </div>
                        <div className="settingsPanel">
                            {/* Quick controls for preview */}
                        </div>
                    </div>
                )}
                
                {activeTab === 'settings' && (
                    <div className="tabContent">
                        <div className="settingsPanel full-width">
                            {/* Detailed settings */}
                        </div>
                    </div>
                )}
                
                {activeTab === 'advanced' && (
                    <div className="tabContent">
                        <div className="settingsPanel full-width">
                            {/* Advanced options */}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Actions */}
            <footer className="pluginActionBar">
                <button className="primary">Insert Component</button>
            </footer>
        </div>
    )
}
```

**CSS for Multi-Tab Layout:**
```css
.pluginTabs {
    display: flex;
    gap: 8px;
    padding: 6px 0 10px;
    margin: 0 0 6px;
    border-bottom: 1px solid var(--border-soft);
    overflow-x: auto;
}

.pluginTab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 4px;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
}

.pluginTab:hover {
    color: var(--text-primary);
    border-bottom-color: var(--border-strong);
}

.pluginTab.is-active {
    color: var(--text-primary);
    border-bottom-color: var(--accent-primary);
    font-weight: 700;
}

.tabContent {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    height: 100%;
}

.tabContent .settingsPanel.full-width {
    grid-column: 1 / -1;
}

@media (max-width: 720px) {
    .tabContent {
        grid-template-columns: 1fr;
    }
}
```

### When to Use Each Approach

**Simple Single-Page:**
- Few controls (5-10 settings)
- Single focused feature
- Quick setup and interaction
- Minimal learning curve
- Examples: Color picker, simple generator, basic configurator

**Multi-Tab Layout:**
- Many controls (15+ settings)
- Multiple feature categories
- Complex configuration options
- Need for organization and clarity
- Examples: Advanced component builders, theme generators, animation editors

### Hybrid Approach
Combine both benefits with a primary preview tab and secondary settings tabs:

```tsx
// Primary tab shows preview + essential controls
// Secondary tabs organize advanced settings
// Keeps focus on visual feedback while providing depth
```

---

**Remember**: This contains proprietary workflows and shortcuts. Never share this file publicly or include it in plugin packages.
