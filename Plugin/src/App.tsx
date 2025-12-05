/**
 * Loading Gate Framer Plugin
 * - Authenticates via Google Apps Script (same flow as Mojave Globe reference)
 * - Provides a two-step flow: Start page (license) → builder interface
 * - Inserts the local Loading code component via its compiled module URL
 */

import { framer } from "framer-plugin"
import {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useLayoutEffect,
    FormEvent,
    ReactNode,
    useRef,
    CSSProperties,
} from "react"
import { createPortal } from "react-dom"
import { Barricade, SpinnerGap, TextT } from "@phosphor-icons/react"
import "./App.css"

type ThemeMode = "light" | "dark"
type ThemeTokens = Record<string, string>

type FontControlValue = {
    fontFamily?: string
    family?: string
    fontWeight?: string | number
    weight?: string | number
    fontStyle?: string
    style?: string
    fontSize?: number | string
    letterSpacing?: number | string
    lineHeight?: number | string
}

type FontPreset = {
    id: string
    label: string
    family: string
    weights: Array<string | number>
}

const useFramerTheme = (): ThemeMode => {
    const [theme, setTheme] = useState<ThemeMode>(() => {
        if (typeof document === "undefined") return "light"
        return (document.body.dataset.framerTheme as ThemeMode) || "light"
    })

    useEffect(() => {
        if (typeof document === "undefined") return

        const handleThemeChange = () => {
            const nextTheme = (document.body.dataset.framerTheme as ThemeMode) || "light"
            setTheme(nextTheme)
        }

        handleThemeChange()

        const observer = new MutationObserver(handleThemeChange)
        observer.observe(document.body, { attributes: true, attributeFilter: ["data-framer-theme"] })

        return () => observer.disconnect()
    }, [])

    return theme
}

const lightTheme: ThemeTokens = {
    "bg-window": "#ffffff",
    "surface-panel": "rgba(255, 255, 255, 0.8)",
    "surface-card": "#ffffff",
    "border-soft": "rgba(17, 17, 17, 0.08)",
    "border-strong": "rgba(17, 17, 17, 0.14)",
    "text-primary": "#111111",
    "text-secondary": "rgba(17, 17, 17, 0.64)",
    "text-tertiary": "rgba(17, 17, 17, 0.60)",
    "text-subtle": "rgba(17, 17, 17, 0.72)",
    "accent-primary": "#854fff",
    "accent-glow": "0 12px 30px rgba(133, 79, 255, 0.35)",
    "ghost-bg": "rgba(17, 17, 17, 0.04)",
    "ghost-border": "rgba(17, 17, 17, 0.08)",
    "ghost-text": "#111111",
    "badge-bg": "rgba(133, 79, 255, 0.12)",
    "badge-text": "#854fff",
    "input-background": "#ffffff",
    "error-text": "#c0392b",
    "preview-border": "rgba(17, 17, 17, 0.05)",
    "settings-border": "rgba(17, 17, 17, 0.05)",
    "checkbox-border": "rgba(17, 17, 17, 0.14)",
    "card-shadow": "0 24px 50px rgba(17, 17, 17, 0.1)",
}

const darkTheme: ThemeTokens = {
    "bg-window": "#0c0b13",
    "surface-panel": "rgba(30, 27, 46, 0.82)",
    "surface-card": "#1e1b2e",
    "border-soft": "rgba(255, 255, 255, 0.1)",
    "border-strong": "rgba(255, 255, 255, 0.18)",
    "text-primary": "rgba(255, 255, 255, 0.94)",
    "text-secondary": "rgba(255, 255, 255, 0.72)",
    "text-tertiary": "rgba(255, 255, 255, 0.7)",
    "text-subtle": "rgba(255, 255, 255, 0.82)",
    "accent-primary": "#b89bff",
    "accent-glow": "0 12px 30px rgba(184, 155, 255, 0.45)",
    "ghost-bg": "rgba(255, 255, 255, 0.08)",
    "ghost-border": "rgba(255, 255, 255, 0.16)",
    "ghost-text": "rgba(255, 255, 255, 0.92)",
    "badge-bg": "rgba(184, 155, 255, 0.18)",
    "badge-text": "#e2d9ff",
    "input-background": "rgba(20, 18, 30, 0.85)",
    "error-text": "#ff9f9f",
    "preview-border": "rgba(255, 255, 255, 0.08)",
    "settings-border": "rgba(255, 255, 255, 0.08)",
    "checkbox-border": "rgba(255, 255, 255, 0.18)",
    "card-shadow": "0 24px 50px rgba(0, 0, 0, 0.55)",
}

const themeTokenMap: Record<ThemeMode, ThemeTokens> = {
    light: lightTheme,
    dark: darkTheme,
}

const normalizeFontFamily = (value: string) => value.replace(/["']/g, "").replace(/\s+/g, " ").trim().toLowerCase()

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Custom NumberInput component with +/- buttons
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
    const handleDecrement = () => {
        const newValue = clampNumber(value - step, min, max)
        onChange(newValue)
    }
    
    const handleIncrement = () => {
        const newValue = clampNumber(value + step, min, max)
        onChange(newValue)
    }
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = Number(e.target.value)
        if (!isNaN(numValue)) {
            onChange(clampNumber(numValue, min, max))
        }
    }
    
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid var(--border-soft)",
                borderRadius: "6px",
                background: "var(--input-background)",
                overflow: "hidden",
                boxSizing: "border-box",
                width: "100%",
                maxWidth: "100%",
                ...style,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", flex: 1, gap: "4px", padding: "8px 10px", minWidth: 0 }}>
                <input
                    type="number"
                    value={value}
                    onChange={handleInputChange}
                    min={min}
                    max={max}
                    step={step}
                    className="custom-number-input"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        width: "100%",
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        textAlign: "left",
                        WebkitAppearance: "none",
                        MozAppearance: "textfield",
                        outline: "none",
                        fontFamily: "inherit",
                    }}
                />
            </div>
            <div
                style={{
                    width: "1px",
                    height: "18px",
                    background: "var(--border-soft)",
                    flexShrink: 0,
                }}
            />
            <button
                type="button"
                onClick={handleDecrement}
                disabled={value <= min}
                style={{
                    width: "20px",
                    height: "100%",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-primary)",
                    cursor: value <= min ? "not-allowed" : "pointer",
                    opacity: value <= min ? 0.5 : 1,
                    flexShrink: 0,
                }}
            >
                −
            </button>
            <div
                style={{
                    width: "1px",
                    height: "18px",
                    background: "var(--border-soft)",
                    flexShrink: 0,
                }}
            />
            <button
                type="button"
                onClick={handleIncrement}
                disabled={value >= max}
                style={{
                    width: "20px",
                    height: "100%",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-primary)",
                    cursor: value >= max ? "not-allowed" : "pointer",
                    opacity: value >= max ? 0.5 : 1,
                    flexShrink: 0,
                }}
            >
                +
            </button>
        </div>
    )
}

type LabelPosition = "left" | "center" | "right"
type LabelPlacement = "inside" | "outside" | "inline" | "hidden"
type LabelOutsideDirection = "top" | "center" | "bottom"

type LoadBarControls = {
    animationStyle: "bar" | "circle" | "text"
    fillStyle: "solid" | "lines"
    textFillStyle?: "static" | "dynamic" | "oneByOne"
    textFillColor?: string
    textPerpetual?: boolean
    textReverse?: boolean
    textDisplayMode?: "textOnly" | "textAndNumber" | "numberOnly"
    lineWidth: number
    perpetual: boolean
    perpetualGap: number
    barRadius: number
    barColor: string
    width: number
    trackColor: string
    showTrack: boolean
    trackThickness: number
    circleGap: number
    startAtLabel: boolean
    showLabel: boolean
    labelText: string
    labelColor: string
    labelFontSize: number
    labelFontFamily: string
    labelFontWeight: string | number
    labelFont?: FontControlValue
    labelOffsetX: number
    labelOffsetY: number
    labelPosition: LabelPosition
    labelPlacement: LabelPlacement
    labelOutsideDirection: LabelOutsideDirection
    finishDelay: number
    showBorder: boolean
    borderWidth: number
    borderColor: string
}

type LoadingControls = {
    minSeconds: number
    timeoutSeconds: number
    oncePerSession: boolean
    runInPreview: boolean
    hideWhenComplete: boolean
    loadBar: LoadBarControls
}
type ProjectFont = {
    selector: string
    family: string
    weight: number | null
    style: "normal" | "italic" | null
}

type BuilderState = {
    controls: LoadingControls
    width: number
    height: number
}

type AuthStatus = "unknown" | "authorized" | "denied"
type AuthSnapshot = { email: string; projectName: string; expiresAt: number }
type StoredSession = { uid: string; email: string; projectName: string; exp: number }

type VerifyAccessResponse = {
    ok?: boolean | string
    valid?: boolean | string
    bound?: boolean | string
    project_name?: string
    error?: string
    reason?: string
    action?: string
}

const DEFAULT_LOAD_BAR: LoadBarControls = {
    animationStyle: "bar",
    fillStyle: "solid",
    lineWidth: 30,
    perpetual: false,
    perpetualGap: 0.5,
    barRadius: 999,
    barColor: "#854FFF",
    width: 600,
    trackColor: "rgba(0,0,0,.12)",
    showTrack: true,
    trackThickness: 2,
    circleGap: 12,
    startAtLabel: false,
    textFillStyle: "dynamic",
    textFillColor: "#854FFF",
    textPerpetual: false,
    textReverse: false,
    textDisplayMode: "textAndNumber",
    showLabel: true,
    labelText: "Loading",
    labelColor: "#ffffff",
    labelFontSize: 12,
    labelFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    labelFontWeight: 600,
    labelOffsetX: 0,
    labelOffsetY: 0,
    labelPosition: "right",
    labelPlacement: "inside",
    labelOutsideDirection: "bottom",
    finishDelay: 0.12,
    showBorder: false,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,.24)",
}

const createDefaultControls = (): LoadingControls => ({
    minSeconds: 0.6,
    timeoutSeconds: 12,
    oncePerSession: false,
    runInPreview: true,
    hideWhenComplete: false,
    loadBar: { ...DEFAULT_LOAD_BAR },
})

const createDefaultBuilderState = (): BuilderState => ({
    controls: createDefaultControls(),
    width: 600,
    height: 48,
})

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

const getEnv = (key: string): string | undefined => {
    try {
        const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env
        return env ? (env as Record<string, string>)[key] : undefined
    } catch {
        return undefined
    }
}

// Try with version ID first, fallback to latest version if needed
const DEFAULT_COMPONENT_URL = () =>
    "https://framer.com/m/Loading-v5jr.js@Mh2kzzzjgwqqp8y6SYsN"

const COMPONENT_URL =
    getEnv("VITE_LOADING_COMPONENT_URL") || DEFAULT_COMPONENT_URL()
// Alternative without version ID (latest version): "https://framer.com/m/Loading-v5jr.js"

const USER_GUIDE_URL =
    getEnv("VITE_LOADING_USER_GUIDE_URL") || "https://github.com/mojavestudio/Loading#readme"

const AUTH_STORAGE_ID = "loading_gate_auth_v1"
const AUTH_JSONP_ENDPOINT =
    getEnv("VITE_LOADING_JSONP_ENDPOINT") ||
    "https://script.google.com/macros/s/AKfycbzKpuHfVwZ9zNejdPC97Zs-mHSd-_fO2wv4eHuvQtkY1-bcUe9qq5dVNRdzHHarzAz8/exec"
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000
const SESSION_LOCAL_KEY = "loading_gate_session"
const SESSION_FORCE_FRESH_KEY = "loading_gate_force_fresh"
const LEGACY_SESSION_KEY = "loading_gate_legacy_session"
const __isLocal = typeof window !== "undefined" && window.location?.hostname === "localhost"

let pluginDataPermissionWarningShown = false

const setPluginDataSafely = async (key: string, value: string | null, context?: string): Promise<boolean> => {
    let allowed = true
    try {
        if (typeof framer.isAllowedTo === "function") {
            const result = framer.isAllowedTo("setPluginData")
            allowed = typeof result === "boolean" ? result : await result
        }
    } catch (error) {
        if (__isLocal && !pluginDataPermissionWarningShown) {
            console.warn("[Loading Plugin] Plugin data permission check failed", error)
            pluginDataPermissionWarningShown = true
        }
        allowed = false
    }

    if (!allowed) {
        if (__isLocal && !pluginDataPermissionWarningShown) {
            console.warn("[Loading Plugin] Missing setPluginData permission", context)
            pluginDataPermissionWarningShown = true
        }
        return false
    }

    try {
        await framer.setPluginData(key, value)
        return true
    } catch (error) {
        if (__isLocal) {
            console.warn("[Loading Plugin] Failed to set plugin data", context, error)
        }
        return false
    }
}

const safeGetCurrentUser = async () => {
    if (typeof framer.getCurrentUser !== "function") {
        if (__isLocal) console.warn("[Loading Plugin] framer.getCurrentUser is not a function. framer object:", framer)
        return null
    }
    try {
        const user = await framer.getCurrentUser()
        if (__isLocal) {
            console.log("[Loading Plugin] getCurrentUser result:", user)
            if (user && !user.id) {
                console.warn("[Loading Plugin] User object missing id property. Available properties:", Object.keys(user || {}), "Full user:", JSON.stringify(user, null, 2))
            }
        }
        return user
    } catch (error) {
        if (__isLocal) console.warn("[Loading Plugin] getCurrentUser failed", error)
        return null
    }
}

const readUserScopedPluginData = async (key: string): Promise<string | null> => {
    try {
        const user = await safeGetCurrentUser()
        const userId = user?.id ?? "unknown"
        const scopedKey = `${key}:${userId}`
        const value = await framer.getPluginData(scopedKey)
        return value ?? null
    } catch (error) {
        if (__isLocal) console.warn("[Loading Plugin] Failed to read plugin data", error)
        return null
    }
}

const writeUserScopedPluginData = async (key: string, value: string | null) => {
    try {
        const user = await safeGetCurrentUser()
        const userId = user?.id ?? "unknown"
        const scopedKey = `${key}:${userId}`
        await setPluginDataSafely(scopedKey, value, `writeUserScopedPluginData:${key}`)
    } catch (error) {
        if (__isLocal) console.warn("[Loading Plugin] Failed to write plugin data", error)
    }
}

const getSessionFromLocal = (): StoredSession | null => {
    if (typeof window === "undefined") return null
    try {
        const raw = window.localStorage.getItem(SESSION_LOCAL_KEY)
        if (!raw) return null
        return JSON.parse(raw) as StoredSession
    } catch {
        return null
    }
}

const saveSessionLocal = (session: StoredSession) => {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(SESSION_LOCAL_KEY, JSON.stringify(session))
    } catch {
        // ignore
    }
}

const clearSessionLocal = () => {
    if (typeof window === "undefined") return
    try {
        window.localStorage.removeItem(SESSION_LOCAL_KEY)
    } catch {
        // ignore
    }
}

const consumeForceFreshFlag = (): boolean => {
    if (typeof window === "undefined") return false
    let forceFresh = false
    try {
        forceFresh = window.localStorage.getItem(SESSION_FORCE_FRESH_KEY) === "1"
        window.localStorage.removeItem(SESSION_FORCE_FRESH_KEY)
    } catch {
        // ignore
    }
    return forceFresh
}

const loadStoredAuthSnapshot = (): AuthSnapshot | null => {
    if (typeof window === "undefined") return null
    try {
        const raw = window.localStorage.getItem(AUTH_STORAGE_ID)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const email = typeof parsed?.email === "string" ? parsed.email : ""
        const projectName = typeof parsed?.projectName === "string" ? parsed.projectName : ""
        const expiresAt = typeof parsed?.expiresAt === "number" ? parsed.expiresAt : 0
        if (!email || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null
        return { email, projectName, expiresAt }
    } catch {
        return null
    }
}

const persistAuthSnapshot = (snapshot: AuthSnapshot | null) => {
    if (typeof window === "undefined") return
    try {
        if (!snapshot) {
            window.localStorage.removeItem(AUTH_STORAGE_ID)
        } else {
            window.localStorage.setItem(AUTH_STORAGE_ID, JSON.stringify(snapshot))
        }
    } catch {
        // ignore
    }
}

    const persistValidatedSession = async (email: string, projectName: string): Promise<AuthSnapshot> => {
        const expiresAt = Date.now() + SESSION_LIFETIME_MS
        const snapshot: AuthSnapshot = { email, projectName, expiresAt }
        persistAuthSnapshot(snapshot)

        try {
            const user = await safeGetCurrentUser()
            const uid = user?.id ?? "unknown"
            const session: StoredSession = { uid, email, projectName, exp: expiresAt }
            saveSessionLocal(session)
            await writeUserScopedPluginData("session", JSON.stringify(session))
            await setPluginDataSafely(
            LEGACY_SESSION_KEY,
            JSON.stringify({ isAuthenticated: true, email, projectName }),
            "persistValidatedSession:legacy"
        )
    } catch (error) {
        if (__isLocal) console.warn("[Loading Plugin] Failed to persist session", error)
    }

    try {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(SESSION_FORCE_FRESH_KEY)
        }
    } catch {
        // ignore
    }

    return snapshot
}

const clearStoredSession = async () => {
    persistAuthSnapshot(null)
    clearSessionLocal()
    try {
        await writeUserScopedPluginData("session", "")
        await setPluginDataSafely("session", "", "clearStoredSession:unscoped")
    } catch {}
    await setPluginDataSafely(LEGACY_SESSION_KEY, null, "clearStoredSession:legacy")
    if (typeof window !== "undefined") {
        try {
            window.localStorage.setItem(SESSION_FORCE_FRESH_KEY, "1")
        } catch {
            // ignore
        }
    }
}

const restoreStoredSession = async (): Promise<AuthSnapshot | null> => {
    const forceFresh = consumeForceFreshFlag()
    let session: StoredSession | null = forceFresh ? null : getSessionFromLocal()

    if (!session) {
        const raw = await readUserScopedPluginData("session")
        if (raw) {
            try {
                session = JSON.parse(raw) as StoredSession
            } catch {
                session = null
            }
        }
    }

    if (!session) {
        try {
            const legacyRaw = await framer.getPluginData(LEGACY_SESSION_KEY)
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw)
                if (legacy?.isAuthenticated) {
                    session = {
                        uid: "legacy",
                        email: legacy.email,
                        projectName: legacy.projectName,
                        exp: Date.now() + SESSION_LIFETIME_MS,
                    }
                }
            }
        } catch (error) {
            if (__isLocal) console.warn("[Loading Plugin] Failed to read legacy session", error)
        }
    }

    const valid = !!session && typeof session.exp === "number" && session.exp > Date.now()
    if (valid && !forceFresh) {
        const snapshot: AuthSnapshot = {
            email: session!.email,
            projectName: session!.projectName,
            expiresAt: session!.exp,
        }
        persistAuthSnapshot(snapshot)
        return snapshot
    }

    return null
}

const verifyAccessJSONP = (
    email: string,
    invoice: string,
    { bind }: { bind?: boolean } = { bind: true }
): Promise<VerifyAccessResponse> => {
    return new Promise(async (resolve) => {
        if (typeof window === "undefined") {
            resolve({ ok: false, error: "Unavailable runtime." })
            return
        }

        const callbackName = `loadingPluginVerify_${Math.random().toString(36).slice(2)}`
        let framerUserId = ""
        try {
            // Try to get Framer user ID - if it fails, we'll proceed without it
            // Server logic: if framer_user_id is empty, it binds; if filled, it verifies the user ID matches
            if (typeof framer.getCurrentUser === "function") {
                const user = await framer.getCurrentUser()
                framerUserId = user?.id ?? ""
                if (__isLocal && bind) {
                    if (framerUserId) {
                        console.log("[Loading Plugin] Got Framer user ID for binding:", framerUserId.substring(0, 8) + "...")
                    } else {
                        console.log("[Loading Plugin] No Framer user ID in response - server will bind on first use")
                    }
                }
            }
        } catch (error) {
            // Failed to get Framer user ID - that's okay, server will handle it
            framerUserId = ""
            if (__isLocal && bind) {
                console.log("[Loading Plugin] Could not get Framer user ID (this is okay):", error instanceof Error ? error.message : String(error))
            }
        }

        const cleanup = (script?: HTMLScriptElement) => {
            try {
                delete (window as any)[callbackName]
            } catch {}
            if (script && script.parentNode) {
                script.parentNode.removeChild(script)
            }
        }

        let timeoutId: number | undefined
        const handleTimeout = () => {
            cleanup(script)
            resolve({ ok: false, error: "Request timed out. Please check your internet connection." })
        }

        timeoutId = window.setTimeout(handleTimeout, 15000)

        const script = document.createElement("script")

        ;(window as any)[callbackName] = (raw: VerifyAccessResponse) => {
            if (timeoutId) window.clearTimeout(timeoutId)
            const res = { ...(raw || {}) }
            try {
                if (typeof res.ok === "string") res.ok = res.ok === "true" || res.ok === "1"
                if (typeof res.valid === "string") res.valid = res.valid === "true" || res.valid === "1"
                if (typeof res.bound === "string") res.bound = res.bound === "true" || res.bound === "1"
            } catch {}
            cleanup(script)
            if (__isLocal) {
                console.log("[Loading Plugin] JSONP response", res)
            }
            resolve(res)
        }

        script.onerror = () => {
            if (timeoutId) window.clearTimeout(timeoutId)
            cleanup(script)
            if (__isLocal) {
                console.warn("[Loading Plugin] JSONP error for", url)
            }
            resolve({ ok: false, error: "Failed to reach verification service. Please try again." })
        }

        const params = new URLSearchParams({
            email,
            access_code: invoice,
            callback: callbackName,
        })
        if (framerUserId) params.set("framer_user_id", framerUserId)
        if (bind) params.set("bind", "1")
        params.set("plugin_name", "Loading")
        params.set("nocache", "1")

        const url = `${AUTH_JSONP_ENDPOINT}?${params.toString()}`
        if (__isLocal) {
            console.log("[Loading Plugin] JSONP request URL:", url)
            console.log("[Loading Plugin] Request params:", {
                email,
                access_code: invoice,
                framer_user_id: framerUserId || "(empty)",
                bind: bind ? "1" : "not set",
                plugin_name: "Loading",
            })
        }
        script.src = url
        document.head.appendChild(script)
    })
}

const formatPercent = (value: number) => `${Math.min(99, Math.max(0, value)).toFixed(0)}%`
const formatFontWeightLabel = (weight: number | null) => {
    if (typeof weight !== "number") return "Regular"
    const lookup: Record<number, string> = {
        100: "Thin",
        200: "Extra light",
        300: "Light",
        400: "Regular",
        500: "Medium",
        600: "Semibold",
        700: "Bold",
        800: "Extra bold",
        900: "Black",
    }
    return `${lookup[weight] ?? "Weight"} (${weight})`
}

export function App() {
    const initialSnapshot = loadStoredAuthSnapshot()
    const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot | null>(initialSnapshot)
    const [authStatus, setAuthStatus] = useState<AuthStatus>(initialSnapshot ? "authorized" : "unknown")
    const [projectName, setProjectName] = useState<string | null>(initialSnapshot?.projectName ?? null)
    const [authEmail, setAuthEmail] = useState(initialSnapshot?.email ?? "")
    const [authReceipt, setAuthReceipt] = useState("")
    const [authError, setAuthError] = useState<string | null>(null)
    const [authLoading, setAuthLoading] = useState(false)
    const [initializing, setInitializing] = useState(!initialSnapshot)

    const themeMode = useFramerTheme()
    const [insertTarget, setInsertTarget] = useState<"current" | "new">("current")

    const [builder, setBuilder] = useState<BuilderState>(() => createDefaultBuilderState())
    const [openSettingsGroup, setOpenSettingsGroup] = useState<string | null>("gate")
    const [projectFonts, setProjectFonts] = useState<ProjectFont[]>([])

    useEffect(() => {
        if (typeof document === "undefined") return
        const root = document.documentElement
        const tokens = themeTokenMap[themeMode]
        Object.entries(tokens).forEach(([token, value]) => root.style.setProperty(`--${token}`, value))
    }, [themeMode])

    useEffect(() => {
        if (initialSnapshot) {
            setInitializing(false)
            return
        }

        let cancelled = false
        ;(async () => {
            const restored = await restoreStoredSession()
            if (cancelled) return
            if (restored) {
                setAuthSnapshot(restored)
                setAuthStatus("authorized")
                setProjectName(restored.projectName ?? null)
                setAuthEmail(restored.email)
            } else {
                setAuthStatus("unknown")
            }
            setInitializing(false)
        })()

        return () => {
            cancelled = true
        }
    }, [initialSnapshot])

    const readyForApp = authStatus === "authorized"

    const themeClass = themeMode === "dark" ? "theme-dark" : "theme-light"

    const resolvedLoadBar = useMemo(
        () => ({ ...DEFAULT_LOAD_BAR, ...(builder.controls.loadBar || {}) }),
        [builder.controls.loadBar]
    )

    const loadingControls = useMemo<LoadingControls>(
        () => ({
            ...builder.controls,
            loadBar: resolvedLoadBar,
        }),
        [builder.controls, resolvedLoadBar]
    )

    useEffect(() => {
        let mounted = true
        const loadFonts = async () => {
            if (typeof framer.getFonts !== "function") return
            try {
                const fonts = await framer.getFonts()
                if (!mounted || !Array.isArray(fonts)) return
                const normalized: ProjectFont[] = fonts
                    .map((font: any): ProjectFont | null => {
                        const family = typeof font?.family === "string" ? font.family : null
                        if (!family) return null
                        const weight = typeof font?.weight === "number" ? font.weight : null
                        const style = font?.style === "italic" ? "italic" : "normal"
                        return {
                            selector: typeof font?.selector === "string" ? font.selector : `${family}-${weight ?? "regular"}-${style}`,
                            family,
                            weight,
                            style,
                        }
                    })
                    .filter(Boolean) as ProjectFont[]
                normalized.sort((a, b) => a.family.localeCompare(b.family))
                setProjectFonts(normalized)
            } catch (error) {
                if (__isLocal) console.warn("[Loading Plugin] Failed to load fonts", error)
            }
        }
        void loadFonts()
        return () => {
            mounted = false
        }
    }, [])

    const fontsByFamily = useMemo(() => {
        const map = new Map<string, ProjectFont[]>()
        projectFonts.forEach((font) => {
            if (!map.has(font.family)) map.set(font.family, [])
            map.get(font.family)!.push(font)
        })
        Array.from(map.values()).forEach((variants) =>
            variants.sort((a, b) => {
                const weightDiff = (a.weight ?? 0) - (b.weight ?? 0)
                if (weightDiff !== 0) return weightDiff
                return (a.style ?? "normal").localeCompare(b.style ?? "normal")
            })
        )
        return map
    }, [projectFonts])

    const fontFamilyOptions = useMemo(() => Array.from(fontsByFamily.keys()).sort((a, b) => a.localeCompare(b)), [fontsByFamily])

    const matchedFontFamily = useMemo(() => {
        const current = normalizeFontFamily(resolvedLoadBar.labelFontFamily)
        for (const family of fontFamilyOptions) {
            if (normalizeFontFamily(family) === current) return family
        }
        return null
    }, [fontFamilyOptions, resolvedLoadBar.labelFontFamily])

    const usingProjectFont = !!matchedFontFamily && fontsByFamily.has(matchedFontFamily)
    const currentFontFamily = usingProjectFont ? matchedFontFamily! : builder.controls.loadBar.labelFontFamily
    const availableVariants = currentFontFamily ? fontsByFamily.get(currentFontFamily) ?? [] : []
    const availableStyles = Array.from(
        new Set(availableVariants.map((variant) => (variant.style === "italic" ? "italic" : "normal")))
    ) as Array<"normal" | "italic">
    const currentFontStyle = (builder.controls.loadBar.labelFont?.fontStyle === "italic" ? "italic" : "normal") as
        | "normal"
        | "italic"
    const resolvedFontStyle =
        availableStyles.length > 0 ? (availableStyles.includes(currentFontStyle) ? currentFontStyle : availableStyles[0]) : currentFontStyle
    const availableWeightsForStyle = availableVariants
        .filter((variant) => (variant.style === "italic" ? "italic" : "normal") === resolvedFontStyle)
        .map((variant) => variant.weight ?? null)
    const uniqueWeightOptions = Array.from(new Set(availableWeightsForStyle)) as Array<number | null>
    const currentNumericWeight =
        typeof builder.controls.loadBar.labelFontWeight === "number"
            ? builder.controls.loadBar.labelFontWeight
            : Number(builder.controls.loadBar.labelFontWeight) || 400

    const isCircleMode = loadingControls.loadBar.animationStyle === "circle"
    const circleDimension = Math.max(1, Math.max(builder.width, builder.height) - 30)
    const effectiveWidth = isCircleMode ? circleDimension : builder.width
    const effectiveHeight = isCircleMode ? circleDimension : builder.height

    const updateControls = useCallback(
        <K extends keyof LoadingControls>(key: K, value: LoadingControls[K]) => {
            setBuilder((prev) => ({
                ...prev,
                controls: {
                    ...prev.controls,
                    [key]: value,
                },
            }))
        },
        []
    )

    const updateLoadBar = useCallback((partial: Partial<LoadBarControls>) => {
        setBuilder((prev) => ({
            ...prev,
            controls: {
                ...prev.controls,
                loadBar: {
                    ...prev.controls.loadBar,
                    ...partial,
                },
            },
        }))
    }, [])

    const handleSignOut = useCallback(async () => {
        try {
            await clearStoredSession()
        } catch (error) {
            if (__isLocal) console.warn("[Loading Plugin] Sign out failed during storage clear", error)
        } finally {
            setAuthSnapshot(null)
            setAuthStatus("unknown")
            setProjectName(null)
            setAuthError(null)
            setAuthLoading(false)
            setInitializing(false)
            setAuthEmail("")
            setAuthReceipt("")
            if (__isLocal) {
                console.log("[Loading Plugin] Signed out and returned to login")
            }
        }
    }, [])

    const sanitizeReceipt = useCallback((value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 8)
        if (digits.length <= 4) return digits
        return `${digits.slice(0, 4)}-${digits.slice(4)}`
    }, [])

    const handleSignIn = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (authLoading) return
            const email = authEmail.trim().toLowerCase()
        const receipt = authReceipt.trim()
            if (!email || !receipt || !/^\d{4}-\d{4}$/.test(receipt)) {
                setAuthError("Email and receipt number are required.")
                setAuthStatus("denied")
                return
            }

            setAuthLoading(true)
            setAuthError(null)
            try {
                try {
                    await writeUserScopedPluginData("session", "")
                } catch {}
                clearSessionLocal()
                const precheck = await verifyAccessJSONP(email, receipt, { bind: false })

                if (__isLocal) {
                    console.log("[Loading Plugin] Precheck response:", precheck)
                }

                if (!precheck || precheck.ok === false) {
                    setAuthError(precheck?.error || "Verification failed. Please try again.")
                    setAuthStatus("denied")
                    return
                }

                if (precheck.reason === "wrong_plugin") {
                    setAuthError("License configuration error. Please contact support.")
                    setAuthStatus("denied")
                    return
                }

                if (precheck.reason === "not_found") {
                    setAuthError("No license found for this email + invoice number.")
                    setAuthStatus("denied")
                    return
                }

                if (precheck.valid === false) {
                    if (__isLocal) {
                        console.error("[Loading Plugin] License validation failed. Response:", precheck)
                    }
                    setAuthError(precheck?.error || "License is not valid for this plugin.")
                    setAuthStatus("denied")
                    return
                }

                // Precheck passed, proceeding with bind
                const response = await verifyAccessJSONP(email, receipt, { bind: true })

                if (!response || response.ok === false) {
                    setAuthError(response?.error || "Verification failed. Please try again.")
                    setAuthStatus("denied")
                    return
                }

                if (response.reason === "wrong_plugin") {
                    setAuthError("License configuration error. Please contact support.")
                    setAuthStatus("denied")
                    return
                }

                if (response.reason === "not_found") {
                    setAuthError("No license found for this email + invoice number.")
                    setAuthStatus("denied")
                    return
                }

                if (response.reason === "bound_to_other") {
                    setAuthError("This license is bound to a different Framer account.")
                    setAuthStatus("denied")
                    return
                }

                if (response.reason === "bound_requires_user_id") {
                    setAuthError("We verified your license, but need your Framer user id to bind it. Please sign into Framer and try again.")
                    setAuthStatus("denied")
                    return
                }

                if (response.valid && response.bound) {
                    const licenseProjectName = (response.project_name || "").trim()
                    const nextProjectName = licenseProjectName || projectName || ""
                    const snapshot = await persistValidatedSession(email, nextProjectName)
                    setAuthSnapshot(snapshot)
                    setAuthStatus("authorized")
                    setAuthError(null)
                    setProjectName(nextProjectName || null)
                    setAuthReceipt("")
                    if (nextProjectName) {
                        framer.notify?.(`✅ ${nextProjectName} is active.`, { variant: "success" })
                    } else {
                        framer.notify?.("✅ License verified.", { variant: "success" })
                    }
                    return
                }

                if (response.valid && !response.bound) {
                    setAuthError("We verified your license. Please try again in a moment while we finalize the binding.")
                    setAuthStatus("authorized")
                    const licenseProjectName = (response.project_name || "").trim()
                    const nextProjectName = licenseProjectName || projectName || ""
                    const snapshot = await persistValidatedSession(email, nextProjectName)
                    setAuthSnapshot(snapshot)
                    setProjectName(nextProjectName || null)
                    return
                }

                setAuthError(response?.error || "Unexpected response. Please contact support.")
                setAuthStatus("denied")
            } catch (error) {
                if (__isLocal) {
                    console.error("[Loading Plugin] Sign in error:", error)
                }
                const errorMessage = error instanceof Error ? error.message : String(error)
                setAuthError(`Verification failed: ${errorMessage}. Please check your internet connection and try again.`)
                setAuthStatus("denied")
            } finally {
                setAuthLoading(false)
            }
        },
        [authEmail, authReceipt, authLoading, projectName, sanitizeReceipt]
    )

    const handleResetBuilder = useCallback(() => {
        setBuilder(createDefaultBuilderState())
    }, [])


    const handleDimensionsChange = (key: "width" | "height", value: string) => {
        const numeric = Number(value)
        if (!Number.isFinite(numeric) || numeric <= 0) return
        setBuilder((prev) => ({ ...prev, [key]: Math.max(16, Math.min(2000, Math.round(numeric))) }))
    }

    const tryFallbackInsert = useCallback(async () => {
        const fallbackInsertionSize = getInsertionSize(loadingControls.loadBar.animationStyle)
        try {
            // Check permissions - isAllowedTo may return a promise
            let canCreateFrame = false
            if (typeof framer.isAllowedTo === "function") {
                const permissionResult = framer.isAllowedTo("createFrameNode")
                canCreateFrame = typeof permissionResult === "boolean" ? permissionResult : await permissionResult
            }
            const createFrameNode = (framer as any).createFrameNode
            if (!canCreateFrame || typeof createFrameNode !== "function") {
                return false
            }

            const fallbackNode = await createFrameNode({
                width: fallbackInsertionSize.width,
                height: fallbackInsertionSize.height,
            })

            if (!fallbackNode) return false

            const loadBar = loadingControls.loadBar
            const node: any = fallbackNode

            if (typeof node.setAttributes === "function") {
                await node.setAttributes({
                    name: "Loading Gate Placeholder",
                    width: fallbackInsertionSize.width,
                    height: fallbackInsertionSize.height,
                    cornerRadius: loadBar.barRadius,
                    fills: loadBar.showTrack
                        ? [
                              {
                                  type: "solid",
                                  color: loadBar.trackColor,
                              },
                          ]
                        : [],
                    stroke: loadBar.showBorder
                        ? {
                              type: "solid",
                              color: loadBar.borderColor,
                              width: loadBar.borderWidth,
                          }
                        : undefined,
                } as any)
            } else {
                node.name = "Loading Gate Placeholder"
                node.width = fallbackInsertionSize.width
                node.height = fallbackInsertionSize.height
            }

            if (typeof node.setPluginData === "function") {
                await node.setPluginData(
                    "loading-gate-placeholder",
                    JSON.stringify({
                        insertedAt: Date.now(),
                        reason: "addComponentInstance_permission_denied",
                    })
                )
            }

            return true
        } catch (error) {
            if (__isLocal) console.warn("[Loading Plugin] Fallback insert failed", error)
            return false
        }
    }, [loadingControls])

    const handleInsert = useCallback(async () => {
        if (!COMPONENT_URL) {
            await framer.notify("Component URL missing. Set VITE_LOADING_COMPONENT_URL or include Loading.component.js.", {
                variant: "error",
            })
            return
        }

        const insertionSize = getInsertionSize(loadingControls.loadBar.animationStyle)
        const isCircle = loadingControls.loadBar.animationStyle === "circle"
        
        // Use the attributes structure as per Framer documentation
        // https://www.framer.com/developers/plugins/working-with-component-instances
        // Match the pattern from example.tsx: width/height as numbers, include autoSize and constraints
        
        // Transform plugin's loadBar structure to match component's property controls:
        // Component expects: bar (animation settings), label (label settings)
        // Plugin has: loadBar (combined)
        const mapControlsToComponentStructure = (controls: LoadingControls) => {
            const { loadBar } = controls
            return {
                // Top-level controls
                minSeconds: controls.minSeconds,
                timeoutSeconds: controls.timeoutSeconds,
                oncePerSession: controls.oncePerSession,
                runInPreview: controls.runInPreview,
                hideWhenComplete: controls.hideWhenComplete,
                // Top-level label props (component checks these first)
                labelOutsideDirection: loadBar.labelOutsideDirection,
                labelPosition: loadBar.labelPosition,
                labelPlacement: loadBar.labelPlacement,
                // bar object - matches component's "bar" property control
                bar: {
                    animationStyle: loadBar.animationStyle,
                    fillStyle: loadBar.fillStyle,
                    lineWidth: loadBar.lineWidth,
                    perpetual: loadBar.perpetual,
                    perpetualGap: loadBar.perpetualGap,
                    barRadius: loadBar.barRadius,
                    barColor: loadBar.barColor,
                    width: loadBar.width,
                    trackColor: loadBar.trackColor,
                    showTrack: loadBar.showTrack,
                    trackThickness: loadBar.trackThickness,
                    circleGap: loadBar.circleGap,
                    startAtLabel: loadBar.startAtLabel,
                    finishDelay: loadBar.finishDelay,
                    showBorder: loadBar.showBorder,
                    borderWidth: loadBar.borderWidth,
                    borderColor: loadBar.borderColor,
                },
                // label object - matches component's "label" property control
                label: {
                    showLabel: loadBar.showLabel,
                    labelText: loadBar.labelText,
                    labelColor: loadBar.labelColor,
                    labelFontSize: loadBar.labelFontSize,
                    labelFontFamily: loadBar.labelFontFamily,
                    labelFontWeight: loadBar.labelFontWeight,
                    labelFont: loadBar.labelFont,
                    labelPosition: loadBar.labelPosition,
                    labelPlacement: loadBar.labelPlacement,
                    labelOutsideDirection: loadBar.labelOutsideDirection,
                    labelOffsetX: loadBar.labelOffsetX,
                    labelOffsetY: loadBar.labelOffsetY,
                },
                // Also include loadBar for backward compatibility with component's coalesce fallback
                loadBar: {
                    ...loadBar,
                },
            }
        }
        
        const mappedControls = mapControlsToComponentStructure(loadingControls)
        
        const insertAttrs = {
            width: insertionSize.width,
            height: insertionSize.height,
            // Prevent auto-sizing jitter on insert
            autoSize: false,
            constraints: { autoSize: "none" as const },
            // Property control values must live under controls
            controls: mappedControls,
        } as any

        try {
            // According to Framer component sharing docs, component URLs can be used directly
            if (__isLocal) {
                console.log("[Loading Plugin] Attempting to insert component", {
                    url: COMPONENT_URL,
                    attributes: insertAttrs,
                    insertionSize,
                    animationStyle: loadingControls.loadBar.animationStyle,
                    labelOutsideDirection: loadingControls.loadBar.labelOutsideDirection,
                    fullControls: loadingControls,
                })
            }
            
            const inserted = await framer.addComponentInstance({
                url: COMPONENT_URL,
                attributes: insertAttrs,
            } as any)
            
            if (inserted && typeof (inserted as any).id === "string") {
                const insertedId = (inserted as any).id
                
                // Set parent to canvas root for proper positioning (following example.tsx pattern)
                try {
                    const canSetParent = await framer.isAllowedTo('setParent')
                    const canvasRoot = await framer.getCanvasRoot()
                    if (canSetParent && canvasRoot?.id) {
                        await framer.setParent(insertedId, canvasRoot.id as any)
                    }
                } catch (parentErr) {
                    if (__isLocal) {
                        console.warn("[Loading Plugin] Failed to set parent to canvas root", parentErr)
                    }
                }
                
                // Explicitly enforce the frame size multiple times (component may load asynchronously)
                // Following example.tsx pattern: set width/height/controls after insertion
                try {
                    const canSet = await framer.isAllowedTo('setAttributes')
                    if (canSet) {
                        // Set size and controls immediately using properly mapped structure
                        if (__isLocal) {
                            console.log("[Loading Plugin] Setting attributes with controls", {
                                topLevelLabelOutsideDirection: mappedControls.labelOutsideDirection,
                                nestedLabelOutsideDirection: mappedControls.label.labelOutsideDirection,
                                barSettings: mappedControls.bar,
                                labelSettings: mappedControls.label,
                            })
                        }
                        await (framer as any).setAttributes(insertedId, {
                            width: insertionSize.width as any,
                            height: insertionSize.height as any,
                            constraints: { autoSize: 'none' as const },
                            controls: mappedControls,
                        } as any)
                        
                        // Retry setting size/controls multiple times (component may load asynchronously)
                        // Following example.tsx pattern with multiple retries
                        // IMPORTANT: Use mappedControls to maintain proper structure on retries
                        const retrySetAttributes = async () => {
                            try {
                                await (framer as any).setAttributes(insertedId, {
                                    width: insertionSize.width as any,
                                    height: insertionSize.height as any,
                                    constraints: { autoSize: 'none' as const },
                                    controls: mappedControls,
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
                } catch (err) {
                    if (__isLocal) {
                        console.warn("[Loading Plugin] setAttributes post-insert failed", err)
                    }
                }
                
                // Center circles on the canvas (following example.tsx centering pattern)
                if (isCircle) {
                    try {
                        const canSet = await framer.isAllowedTo('setAttributes')
                        if (canSet) {
                            let centerPercent: number | null = null
                            try {
                                const canvasRoot = await framer.getCanvasRoot()
                                const parentIdForPosition = canvasRoot?.id || null
                                const parentRect = parentIdForPosition ? await framer.getRect(parentIdForPosition) : null
                                const instRect = await framer.getRect(insertedId)
                                const pw = Math.max(1, Math.round((parentRect as any)?.width ?? 0))
                                const iw = Math.max(1, Math.round((instRect as any)?.width ?? insertionSize.width))
                                
                                // Calculate centerPercent: for true centering, we want the instance center to align with parent center
                                // centerPercent = ((instanceCenter - parentCenter) / parentWidth) * 100
                                // For true center: instanceCenter = parentCenter, so centerPercent = 0
                                // But we calculate it properly: ((iw/2 - pw/2) / pw) * 100 = ((iw - pw) / (2 * pw)) * 100
                                // Actually, Framer's centerX: 0 means centered, so we can just use 0
                                centerPercent = 0 // 0 means centered in Framer
                            } catch (rectErr) {
                                if (__isLocal) {
                                    console.warn("[Loading Plugin] Failed to get rect for centering", rectErr)
                                }
                                // Fallback to 0 (centered) if we can't calculate
                                centerPercent = 0
                            }
                            
                            const applyCenter = async () => {
                                try {
                                    await (framer as any).setAttributes(insertedId, {
                                        position: 'absolute' as const,
                                        centerX: (centerPercent != null ? (centerPercent as any) : (null as any)),
                                        centerY: (centerPercent != null ? (centerPercent as any) : (null as any)),
                                        left: null as any,
                                        right: null as any,
                                        top: null as any,
                                        bottom: null as any,
                                    })
                                } catch (centerErr) {
                                    if (__isLocal) {
                                        console.warn("[Loading Plugin] Failed to center component", centerErr)
                                    }
                                }
                            }
                            
                            // Apply centering with retries (component may load asynchronously)
                            await applyCenter()
                            setTimeout(applyCenter, 50)
                            setTimeout(applyCenter, 250)
                            setTimeout(applyCenter, 800)
                        }
                    } catch (centerErr) {
                        if (__isLocal) {
                            console.warn("[Loading Plugin] Centering failed", centerErr)
                        }
                    }
                }
            }
            
            await framer.notify("Loading gate inserted with your settings!", { variant: "success" })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (__isLocal) {
                console.error("[Loading Plugin] Failed to insert component", {
                    error,
                    errorMessage,
                    errorStack: error instanceof Error ? error.stack : undefined,
                    errorName: error instanceof Error ? error.name : typeof error,
                    componentUrl: COMPONENT_URL,
                    insertAttrs,
                    insertionSize,
                })
            }
            const fallbackInserted = await tryFallbackInsert()
            if (fallbackInserted) {
                await framer.notify(
                    `⚠️ Inserted a frame placeholder (${insertionSize.width}×${insertionSize.height}) because component insertion permissions are restricted. To insert the actual component, grant "addComponentInstance" permission in Framer's plugin settings.`,
                    { variant: "warning" }
                )
                return
            }

            // Provide helpful error message based on the error type
            let userMessage = `Error inserting Loading component: ${errorMessage}.`
            if (errorMessage.includes("Permission") || errorMessage.includes("permission") || errorMessage.includes("not allowed")) {
                userMessage += " This may be a plugin permission issue. Try: 1) Paste the component URL directly onto the Framer Canvas to add it manually, or 2) Check Plugins → Developer Tools for permission settings."
            } else if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("404") || errorMessage.includes("Failed to fetch") || errorMessage.includes("module")) {
                userMessage += ` The component URL may not be accessible. Ensure the component is publicly shared in Framer (Assets → Code → right-click component → Copy URL). You can also paste this URL directly onto the Canvas: ${COMPONENT_URL}`
            } else {
                userMessage += ` You can manually add the component by pasting this URL directly onto the Framer Canvas: ${COMPONENT_URL}`
            }
            
            await framer.notify(userMessage, {
                variant: "error",
            })
        }
    }, [COMPONENT_URL, loadingControls, tryFallbackInsert])

    const activeProjectName = projectName || authSnapshot?.projectName || null
    
    // Declare viewportWidth state before using it
    const [viewportWidth, setViewportWidth] = useState<number>(() =>
        typeof window !== "undefined" ? window.innerWidth : 0
    )
    const [gearTriggerWidth, setGearTriggerWidth] = useState(0)
    const headerRef = useRef<HTMLElement | null>(null)
    
    const heroPreviewWidth = Math.max(1, effectiveWidth)
    const heroPreviewHeight = Math.max(1, effectiveHeight)
    const heroScale = 0.3
    const barScale = isCircleMode ? heroScale : heroScale * 1.25
    const extraBarWidth = isCircleMode ? 0 : 10
    const maxWidth = Math.max(1, (viewportWidth || heroPreviewWidth) - 30)
    // Reduce box size slightly to prevent label overlap with menu
    const boxSizeReduction = 20
    const safeHeroWidth = Math.max(
        1,
        Math.min(
            heroPreviewWidth * barScale + extraBarWidth,
            260,
            maxWidth
        ) - (isCircleMode ? boxSizeReduction : 0) // Only reduce for circles
    )
    const heroAspect = heroPreviewWidth > 0 ? heroPreviewHeight / heroPreviewWidth : 1
    const safeHeroHeight = Math.max(1, Math.round(safeHeroWidth * heroAspect) - (isCircleMode ? boxSizeReduction : 0))

    useLayoutEffect(() => {
        if (typeof window === "undefined") return
        const measure = () => setViewportWidth(window.innerWidth)
        measure()
        window.addEventListener("resize", measure)
        return () => window.removeEventListener("resize", measure)
    }, [])

    const handleGearTriggerRef = useCallback((node: HTMLButtonElement | null) => {
        setGearTriggerWidth(node?.getBoundingClientRect().width ?? 0)
    }, [])

    if (!readyForApp) {
        const loginPreviewControls = {
            ...loadingControls,
            loadBar: {
                ...loadingControls.loadBar,
                width: 600,
            },
        }
        return (
            <main className={`pluginRoot ${themeClass}`}>
                <section className="pluginBody loginBody">
                    <article className="previewCard">
                        <LoadingPreview controls={loginPreviewControls} width={340} height={48} />
                    </article>
                    <article className="formCard">
                        <form className="loadingCard-form" onSubmit={handleSignIn}>
                            <label htmlFor="authEmail">License Email</label>
                            <input
                                id="authEmail"
                                type="email"
                                value={authEmail}
                                onChange={(event) => setAuthEmail(event.target.value)}
                                placeholder="you@studio.com"
                                autoComplete="email"
                                required
                            />
                            <label htmlFor="authReceipt">Receipt #</label>
                            <input
                                id="authReceipt"
                                type="text"
                                value={authReceipt}
                                onChange={(event) => setAuthReceipt(sanitizeReceipt(event.target.value))}
                                placeholder="0000-0000"
                                pattern="\d{4}-\d{4}"
                                autoComplete="off"
                                required
                            />
                            {authError && <p className="loadingCard-error">{authError}</p>}
                            <button type="submit" className="primary" disabled={authLoading || initializing}>
                                {authLoading ? "Verifying…" : "Continue"}
                            </button>
                        </form>
                        <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                                window.open("https://buy.stripe.com/dRmeV575Fe3J3U34tT0VO04", "_blank", "noopener,noreferrer")
                            }
                        >
                            Purchase a License
                        </button>
                    </article>
                </section>
                <footer className="loadingFooter">
                    <p>
                        © Mojave Studio LLC — Custom Automated Web Design Experts
                        <br />
                        <a href="https://mojavestud.io" target="_blank" rel="noopener noreferrer">mojavestud.io</a>
                    </p>
                </footer>
            </main>
        )
    }

    // Calculate preview dimensions based on animation style
    const isTextMode = loadingControls.loadBar.animationStyle === "text"
    const gearSize = Math.max(gearTriggerWidth || 24, 16)
    const heroPaddingTop = isCircleMode ? 10 : 20
    const heroPaddingBottom = (isCircleMode ? 4 : 18) + 20 // add breathing room between preview + settings

    return (
        <main className={`pluginRoot ${themeClass}`}>
            <header ref={headerRef} className="pluginHeader" />
            <section 
                className="heroPreviewShell" 
                style={{ 
                    justifyContent: "center", // Always center in the full window width
                    paddingTop: heroPaddingTop + 5, // More top padding for bar
                    paddingBottom: heroPaddingBottom, // Extra spacing between live preview + menu
                }}
            >
                <div
                    className="heroPreviewInner"
                    style={{
                        width: isCircleMode ? safeHeroWidth + 40 : safeHeroWidth,
                        height: safeHeroHeight,
                        justifyContent: isCircleMode ? "center" : "flex-start",
                        marginLeft: 0, // Remove left margin to allow true centering
                        marginTop: isCircleMode ? -5 : 5,
                    }}
                >
                    <LoadingPreview controls={loadingControls} width={safeHeroWidth} height={safeHeroHeight} />
                    <div
                        className="heroGear"
                        style={{
                            width: gearSize,
                            height: gearSize,
                        }}
                    >
                        <SettingsPopover
                            email={authSnapshot?.email}
                            projectName={activeProjectName}
                            onSignOut={handleSignOut}
                            onTriggerRefChange={handleGearTriggerRef}
                        />
                    </div>
                </div>
            </section>
            <section className="pluginBody builderBody">
                <article className="settingsPanel">
                    <section className="loadingSettings">
                        <SettingsGroup 
                            title="Progress animation" 
                            icon={<SpinnerGap size={18} weight="duotone" />}
                            open={openSettingsGroup === "progress"}
                            onToggle={() => setOpenSettingsGroup(openSettingsGroup === "progress" ? null : "progress")}
                        >
                            <div className="settingsRow">
                                <label>
                                    <span style={{ marginLeft: 5 }}>Style</span>
                                    <select
                                        value={builder.controls.loadBar.animationStyle}
                                        onChange={(event) => updateLoadBar({ animationStyle: event.target.value as "bar" | "circle" | "text" })}
                                    >
                                        <option value="bar">Bar</option>
                                        <option value="circle">Circle</option>
                                        <option value="text">Text</option>
                                    </select>
                                </label>
                                <label>
                                    <span style={{ marginLeft: 5 }}>Fill style</span>
                                    {builder.controls.loadBar.animationStyle === "text" ? (
                                        <select
                                            value={
                                                builder.controls.loadBar.textFillStyle === "static"
                                                    ? "static"
                                                    : builder.controls.loadBar.textFillStyle === "oneByOne"
                                                    ? "oneByOne"
                                                    : "dynamic"
                                            }
                                            onChange={(event) =>
                                                updateLoadBar({
                                                    textFillStyle: event.target.value as "static" | "dynamic" | "oneByOne",
                                                })
                                            }
                                        >
                                            <option value="static">Static</option>
                                            <option value="dynamic">Dynamic</option>
                                            <option value="oneByOne">One by One</option>
                                        </select>
                                    ) : (
                                    <select
                                        value={builder.controls.loadBar.fillStyle}
                                        onChange={(event) => updateLoadBar({ fillStyle: event.target.value as "solid" | "lines" })}
                                    >
                                        <option value="solid">Solid</option>
                                        <option value="lines">Lines</option>
                                    </select>
                                    )}
                                </label>
                            </div>
                            {builder.controls.loadBar.animationStyle === "text" &&
                                (builder.controls.loadBar.textFillStyle === "static" ? "static" : "dynamic") ===
                                    "dynamic" && (
                                    <div className="settingsRow" style={{ display: "flex", flexWrap: "nowrap" }}>
                                        <label className="checkbox" style={{ flex: "0 0 auto" }}>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(builder.controls.loadBar.textPerpetual)}
                                                onChange={(event) =>
                                                    updateLoadBar({ textPerpetual: event.target.checked })
                                                }
                                            />
                                            Perpetual
                                        </label>
                                        <label className="checkbox" style={{ flex: "0 0 auto" }}>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(builder.controls.loadBar.textReverse)}
                                                onChange={(event) =>
                                                    updateLoadBar({ textReverse: event.target.checked })
                                                }
                                            />
                                            Reverse
                                        </label>
                                        <label className="checkbox" style={{ flex: "0 0 auto" }}>
                                            <input
                                                type="checkbox"
                                                checked={builder.controls.loadBar.showTrack}
                                                onChange={(event) => updateLoadBar({ showTrack: event.target.checked })}
                                            />
                                            Track
                                        </label>
                                    </div>
                                )}
                            {builder.controls.loadBar.animationStyle === "text" && 
                             builder.controls.loadBar.showTrack && 
                             builder.controls.loadBar.textFillStyle !== "static" && (
                                <div className="settingsRow">
                                    <label className="flexColumn">
                                        <span style={{ marginLeft: 5 }}>Color</span>
                                        <input
                                            type="color"
                                            value={builder.controls.loadBar.trackColor}
                                            onChange={(event) => updateLoadBar({ trackColor: event.target.value })}
                                        />
                                    </label>
                                </div>
                            )}
                            {builder.controls.loadBar.animationStyle === "circle" && (
                                <>
                                    <div className="settingsRow settingsRow--two settingsRow--circleToggles">
                                        <label className="checkbox settingsRow--compressed">
                                            <input
                                                type="checkbox"
                                                checked={builder.controls.loadBar.perpetual}
                                                onChange={(event) => updateLoadBar({ perpetual: event.target.checked })}
                                            />
                                            Perpetual
                                        </label>
                                        <label className="checkbox settingsRow--compressed">
                                            <input
                                                type="checkbox"
                                                checked={builder.controls.loadBar.startAtLabel}
                                                onChange={(event) => updateLoadBar({ startAtLabel: event.target.checked })}
                                            />
                                            Start at label
                                        </label>
                                    </div>
                                    {builder.controls.loadBar.perpetual && (
                                        <label>
                                            <span style={{ marginLeft: 5 }}>Gap between animations (seconds)</span>
                                            <NumberInput
                                                value={builder.controls.loadBar.perpetualGap}
                                                onChange={(value) => updateLoadBar({ perpetualGap: value })}
                                                min={0}
                                                max={5}
                                                step={0.1}
                                            />
                                        </label>
                                    )}
                                </>
                            )}
                            {builder.controls.loadBar.animationStyle !== "text" && (
                                <>
                                    <div className="settingsRow" style={{ flexWrap: "nowrap" }}>
                                        <label className="flexColumn" style={{ flex: "1 1 0", minWidth: 0 }}>
                                            Fill color
                                            <input
                                                type="color"
                                                value={builder.controls.loadBar.barColor}
                                                onChange={(event) => updateLoadBar({ barColor: event.target.value })}
                                            />
                                        </label>
                                        {builder.controls.loadBar.animationStyle === "bar" && (
                                            <label className="flexColumn" style={{ flex: "1 1 0", minWidth: 0 }}>
                                                <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}><span>Height</span><span className="rangeValue">{builder.controls.loadBar.width.toFixed(0)}</span></span>
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={50}
                                                    step={1}
                                                    value={builder.controls.loadBar.width}
                                                    onChange={(event) => updateLoadBar({ width: Number(event.target.value) })}
                                                />
                                            </label>
                                        )}
                                        {builder.controls.loadBar.animationStyle === "bar" ? (
                                            <label className="flexColumn" style={{ flex: "1 1 0", minWidth: 0 }}>
                                                <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}><span>Radius</span><span className="rangeValue">{builder.controls.loadBar.barRadius.toFixed(0)}</span></span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={20}
                                                    value={builder.controls.loadBar.barRadius}
                                                    onChange={(event) => updateLoadBar({ barRadius: Number(event.target.value) })}
                                                />
                                            </label>
                                        ) : (
                                            <>
                                                <label className="flexColumn" style={{ flex: "1 1 0", minWidth: 0 }}>
                                                    <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}><span>Gap</span><span className="rangeValue">{builder.controls.loadBar.circleGap.toFixed(0)}</span></span>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={90}
                                                        step={1}
                                                        value={builder.controls.loadBar.circleGap}
                                                        onChange={(event) => updateLoadBar({ circleGap: Number(event.target.value) })}
                                                    />
                                                </label>
                                                {(builder.controls.loadBar.animationStyle === "circle" || (builder.controls.loadBar.animationStyle === "bar" && builder.controls.loadBar.fillStyle === "lines")) && (
                                                    <label className="flexColumn" style={{ flex: "1 1 0", minWidth: 0 }}>
                                                        <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}><span>Thickness</span><span className="rangeValue">{builder.controls.loadBar.lineWidth.toFixed(0)}</span></span>
                                                        <input
                                                            type="range"
                                                            min={1}
                                                            max={15}
                                                            step={1}
                                                            value={builder.controls.loadBar.lineWidth}
                                                            onChange={(event) => updateLoadBar({ lineWidth: Number(event.target.value) })}
                                                        />
                                                    </label>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {builder.controls.loadBar.animationStyle === "circle" && (
                                        <>
                                            {/* Track checkbox and properties */}
                                            <div className="settingsRow">
                                                <label className="checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={builder.controls.loadBar.showTrack}
                                                        onChange={(event) => updateLoadBar({ showTrack: event.target.checked })}
                                                    />
                                                    Track
                                                </label>
                                            </div>
                                            {builder.controls.loadBar.showTrack && (
                                                <div className="settingsRow">
                                                    <label className="flexColumn">
                                                        Color
                                                        <input
                                                            type="color"
                                                            value={builder.controls.loadBar.trackColor}
                                                            onChange={(event) => updateLoadBar({ trackColor: event.target.value })}
                                                        />
                                                    </label>
                                                    <label className="flexColumn">
                                                        <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}><span>Thickness</span><span className="rangeValue">{builder.controls.loadBar.trackThickness.toFixed(1)}</span></span>
                                                        <input
                                                            type="range"
                                                            min={1}
                                                            max={50}
                                                            step={0.5}
                                                            value={builder.controls.loadBar.trackThickness}
                                                            onChange={(event) =>
                                                                updateLoadBar({ trackThickness: Number(event.target.value) })
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {builder.controls.loadBar.animationStyle === "bar" && (
                                        <>
                                            {/* Track checkbox and properties */}
                                            <div className="settingsRow">
                                                <label className="checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={builder.controls.loadBar.showTrack}
                                                        onChange={(event) => updateLoadBar({ showTrack: event.target.checked })}
                                                    />
                                                    Track
                                                </label>
                                            </div>
                                            {builder.controls.loadBar.showTrack && (
                                                <div className="settingsRow">
                                                    <label className="flexColumn">
                                                        Color
                                                        <input
                                                            type="color"
                                                            value={builder.controls.loadBar.trackColor}
                                                            onChange={(event) => updateLoadBar({ trackColor: event.target.value })}
                                                        />
                                                    </label>
                                                    <label className="flexColumn">
                                                        <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}><span>Thickness</span><span className="rangeValue">{builder.controls.loadBar.trackThickness.toFixed(1)}</span></span>
                                                        <input
                                                            type="range"
                                                            min={1}
                                                            max={50}
                                                            step={0.5}
                                                            value={builder.controls.loadBar.trackThickness}
                                                            onChange={(event) =>
                                                                updateLoadBar({ trackThickness: Number(event.target.value) })
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                            {/* Border checkbox and properties */}
                                            <div className="settingsRow">
                                                <label className="checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={builder.controls.loadBar.showBorder}
                                                        onChange={(event) => updateLoadBar({ showBorder: event.target.checked })}
                                                    />
                                                    Border
                                                </label>
                                            </div>
                                            {builder.controls.loadBar.showBorder && (
                                                <div className="settingsRow">
                                                    <label>
                                                        Color
                                                        <input
                                                            type="color"
                                                            value={builder.controls.loadBar.borderColor}
                                                            onChange={(event) => updateLoadBar({ borderColor: event.target.value })}
                                                        />
                                                    </label>
                                                    <label>
                                                        Thickness <span className="rangeValue">{builder.controls.loadBar.borderWidth.toFixed(0)}</span>
                                                        <input
                                                            type="range"
                                                            min={1}
                                                            max={12}
                                                            step={1}
                                                            value={builder.controls.loadBar.borderWidth}
                                                            onChange={(event) => updateLoadBar({ borderWidth: Number(event.target.value) })}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </SettingsGroup>
                        <SettingsGroup
                            title="Label"
                            icon={<TextT size={18} weight="duotone" />}
                            open={openSettingsGroup === "label"}
                            onToggle={() => setOpenSettingsGroup(openSettingsGroup === "label" ? null : "label")}
                        >
                            <div className="settingsRow">
                                <label style={{ flex: "2 1 0", minWidth: 0 }}>
                                    <span style={{ marginLeft: 5 }}>Display</span>
                                    <select
                                        value={builder.controls.loadBar.textDisplayMode || "textAndNumber"}
                                        onChange={(event) =>
                                            updateLoadBar({
                                                textDisplayMode: event.target.value as
                                                    | "textOnly"
                                                    | "textAndNumber"
                                                    | "numberOnly",
                                            })
                                        }
                                    >
                                        <option value="textOnly">Text Only</option>
                                        <option value="textAndNumber">Text & Numbers</option>
                                        <option value="numberOnly">Numbers Only</option>
                                    </select>
                                </label>
                                {builder.controls.loadBar.animationStyle !== "text" && (
                                    <label style={{ flex: "1 1 0", minWidth: 0 }}>
                                        <span style={{ marginLeft: 5 }}>Placement</span>
                                        <select
                                            value={builder.controls.loadBar.labelPlacement}
                                            onChange={(event) => {
                                                const newPlacement = event.target.value as LabelPlacement
                                                updateLoadBar({
                                                    labelPlacement: newPlacement,
                                                    showLabel: newPlacement !== "hidden",
                                                })
                                            }}
                                        >
                                            <option value="inside">Inside</option>
                                            <option value="outside">Outside</option>
                                            {builder.controls.loadBar.animationStyle === "circle" && (
                                                <option value="inline">Inline</option>
                                            )}
                                            <option value="hidden">Hidden</option>
                                        </select>
                                    </label>
                                )}
                            </div>
                            {builder.controls.loadBar.labelPlacement !== "hidden" && (
                                <>
                                    <div className="settingsRow">
                                        <label style={{ flex: "1 1 0", minWidth: 0 }}>
                                            <span style={{ marginLeft: 5 }}>{builder.controls.loadBar.animationStyle === "text" ? "Fill color" : "Color"}</span>
                                            <input
                                                type="color"
                                                value={builder.controls.loadBar.labelColor}
                                                onChange={(event) => updateLoadBar({ labelColor: event.target.value })}
                                            />
                                        </label>
                                        <label style={{ flex: "2 1 0", minWidth: 0 }}>
                                            <span style={{ marginLeft: 5 }}>Loading text</span>
                                            <input
                                                type="text"
                                                value={builder.controls.loadBar.labelText}
                                                onChange={(event) => updateLoadBar({ labelText: event.target.value })}
                                                placeholder="Loading"
                                            />
                                        </label>
                                    </div>
                                    <div className="settingsRow">
                                        <label>
                                            <span style={{ marginLeft: 5 }}>Font</span>
                                            {fontFamilyOptions.length > 0 ? (
                                                <select
                                                    value={matchedFontFamily ?? fontFamilyOptions[0] ?? ""}
                                                    onChange={(event) => {
                                                        const nextValue = event.target.value
                                                        const variants = fontsByFamily.get(nextValue) ?? []
                                                        const fallbackVariant =
                                                            variants.find((variant) => (variant.style ?? "normal") === "normal") ??
                                                            variants[0]
                                                        const nextWeight =
                                                            fallbackVariant?.weight ?? builder.controls.loadBar.labelFontWeight
                                                        const nextStyle = fallbackVariant?.style === "italic" ? "italic" : "normal"
                                                        updateLoadBar({
                                                            labelFontFamily: nextValue,
                                                            labelFontWeight: nextWeight ?? builder.controls.loadBar.labelFontWeight,
                                                            labelFont: {
                                                                fontFamily: nextValue,
                                                                fontWeight: nextWeight ?? builder.controls.loadBar.labelFontWeight,
                                                                fontStyle: nextStyle === "italic" ? "italic" : "normal",
                                                            },
                                                        })
                                                    }}
                                                >
                                                    {fontFamilyOptions.map((family) => (
                                                        <option key={family} value={family}>
                                                            {family}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={builder.controls.loadBar.labelFontFamily}
                                                    onChange={(event) =>
                                                        updateLoadBar({
                                                            labelFontFamily: event.target.value,
                                                            labelFont: {
                                                                ...(builder.controls.loadBar.labelFont || {}),
                                                                fontFamily: event.target.value,
                                                            },
                                                        })
                                                    }
                                                    placeholder='Inter, "Helvetica Neue", sans-serif'
                                                />
                                            )}
                                        </label>
                                        <label>
                                            <span style={{ marginLeft: 5 }}>Font size</span>
                                            <NumberInput
                                                value={builder.controls.loadBar.labelFontSize}
                                                onChange={(value) => updateLoadBar({ labelFontSize: value })}
                                                min={8}
                                                max={24}
                                                step={1}
                                            />
                                        </label>
                                        <label style={{ flex: "1 1 0", minWidth: 0 }}>
                                            <span style={{ marginLeft: 0, display: "flex", justifyContent: "space-between", width: "100%" }}><span>Weight</span>{!usingProjectFont && <span className="rangeValue" style={{ marginRight: 0 }}>{Number(builder.controls.loadBar.labelFontWeight) || 400}</span>}</span>
                                            {usingProjectFont ? (
                                                <select
                                                    value={String(currentNumericWeight)}
                                                    onChange={(event) => {
                                                        const numeric = Number(event.target.value)
                                                        const variants = fontsByFamily.get(matchedFontFamily ?? "") ?? []
                                                        const variantMatch = variants.find(
                                                            (variant) =>
                                                                (variant.style === "italic" ? "italic" : "normal") === resolvedFontStyle &&
                                                                (variant.weight ?? null) === (Number.isFinite(numeric) ? numeric : null)
                                                        )
                                                        const nextWeight = Number.isFinite(numeric) ? numeric : currentNumericWeight
                                                        updateLoadBar({
                                                            labelFontWeight: nextWeight,
                                                            labelFont: {
                                                                ...(builder.controls.loadBar.labelFont || {}),
                                                                fontFamily: matchedFontFamily ?? builder.controls.loadBar.labelFontFamily,
                                                                fontWeight: nextWeight,
                                                                fontStyle:
                                                                    (variantMatch?.style === "italic" ? "italic" : resolvedFontStyle) ===
                                                                    "italic"
                                                                        ? "italic"
                                                                        : "normal",
                                                            },
                                                        })
                                                    }}
                                                >
                                                    {uniqueWeightOptions.length > 0 ? (
                                                        uniqueWeightOptions.map((weight) => (
                                                            <option key={weight ?? "regular"} value={weight ?? 400}>
                                                                {formatFontWeightLabel(weight ?? null)}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option value={currentNumericWeight}>Regular</option>
                                                    )}
                                                </select>
                                            ) : (
                                                <>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={900}
                                                        step={100}
                                                        value={Number(builder.controls.loadBar.labelFontWeight) || 400}
                                                        onChange={(event) =>
                                                            updateLoadBar({
                                                                labelFontWeight: Number(event.target.value),
                                                                labelFont: {
                                                                    ...(builder.controls.loadBar.labelFont || {}),
                                                                    fontWeight: Number(event.target.value),
                                                                },
                                                            })
                                                        }
                                                    />
                                                </>
                                            )}
                                        </label>
                                    </div>
                                    {fontFamilyOptions.length > 0 && (
                                        <>
                                            {usingProjectFont && availableStyles.length > 1 && (
                                                <label>
                                                    <span style={{ marginLeft: 5 }}>Style</span>
                                                    <select
                                                        value={resolvedFontStyle}
                                                        onChange={(event) => {
                                                            const nextStyle = event.target.value === "italic" ? "italic" : "normal"
                                                            const variants = fontsByFamily.get(matchedFontFamily ?? "") ?? []
                                                            const styleVariants = variants.filter(
                                                                (variant) => (variant.style === "italic" ? "italic" : "normal") === nextStyle
                                                            )
                                                            const variantForStyle = styleVariants[0]
                                                            const weightForStyle =
                                                                variantForStyle?.weight ?? builder.controls.loadBar.labelFontWeight
                                                            updateLoadBar({
                                                                labelFontWeight: weightForStyle ?? builder.controls.loadBar.labelFontWeight,
                                                                labelFont: {
                                                                    ...(builder.controls.loadBar.labelFont || {}),
                                                                    fontFamily: matchedFontFamily ?? builder.controls.loadBar.labelFontFamily,
                                                                    fontWeight: weightForStyle ?? builder.controls.loadBar.labelFontWeight,
                                                                    fontStyle: nextStyle === "italic" ? "italic" : "normal",
                                                                },
                                                            })
                                                        }}
                                                    >
                                                        {availableStyles.map((style) => (
                                                            <option key={style} value={style}>
                                                                {style === "italic" ? "Italic" : "Normal"}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )}
                                        </>
                                    )}
                                    {builder.controls.loadBar.animationStyle !== "text" && (
                                        <div className="alignmentRow">
                                            <label>
                                                <span style={{ marginLeft: 5 }}>X</span>
                                                <select
                                                    value={builder.controls.loadBar.labelPosition}
                                                    onChange={(event) =>
                                                        updateLoadBar({ labelPosition: event.target.value as LabelPosition })
                                                    }
                                                >
                                                    <option value="left">Left</option>
                                                    <option value="center">Center</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </label>
                                            <label>
                                                <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}><span>X offset</span><span className="rangeValue">{(builder.controls.loadBar.labelOffsetX ?? 0).toFixed(0)}</span></span>
                                                <input
                                                    type="range"
                                                    min={-100}
                                                    max={100}
                                                    className="rangeWithZero"
                                                    value={builder.controls.loadBar.labelOffsetX ?? 0}
                                                    onChange={(event) =>
                                                        updateLoadBar({
                                                            labelOffsetX: Number(event.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                    )}
                                    {builder.controls.loadBar.animationStyle !== "text" &&
                                        (builder.controls.loadBar.labelPlacement === "inside" ||
                                            builder.controls.loadBar.labelPlacement === "outside" ||
                                            (builder.controls.loadBar.labelPlacement === "inline" &&
                                                builder.controls.loadBar.animationStyle === "circle")) && (
                                            <div className="alignmentRow">
                                                <label>
                                                    <span style={{ marginLeft: 5 }}>Y</span>
                                                    <select
                                                        value={builder.controls.loadBar.labelOutsideDirection}
                                                        onChange={(event) =>
                                                            updateLoadBar({
                                                                labelOutsideDirection: event.target.value as LabelOutsideDirection,
                                                            })
                                                        }
                                                    >
                                                        <option value="top">Top</option>
                                                        <option value="center">Center</option>
                                                        <option value="bottom">Bottom</option>
                                                    </select>
                                                </label>
                                                <label>
                                                    <span style={{ marginLeft: 5, display: "flex", justifyContent: "space-between", width: "100%" }}><span>Y offset</span><span className="rangeValue">{(builder.controls.loadBar.labelOffsetY ?? 0).toFixed(0)}</span></span>
                                                    <input
                                                        type="range"
                                                        min={-25}
                                                        max={25}
                                                        className="rangeWithZero"
                                                        value={builder.controls.loadBar.labelOffsetY ?? 0}
                                                        onChange={(event) =>
                                                            updateLoadBar({
                                                                labelOffsetY: Number(event.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        )}
                                </>
                                )}
                        </SettingsGroup>
                        <SettingsGroup 
                            title="Gate behavior" 
                            icon={<Barricade size={18} weight="duotone" />}
                            open={openSettingsGroup === "gate"}
                            onToggle={() => setOpenSettingsGroup(openSettingsGroup === "gate" ? null : "gate")}
                        >
                            <div className="settingsRow settingsRow--triple">
                                <label className="inlineLabel">
                                    <span style={{ marginLeft: -40 }}>Minimum</span>
                                    <NumberInput
                                        value={builder.controls.minSeconds}
                                        onChange={(value) => updateControls("minSeconds", value)}
                                        min={0}
                                        max={10}
                                        step={0.1}
                                    />
                                </label>
                                <label className="inlineLabel">
                                    <span style={{ marginLeft: -40 }}>Timeout</span>
                                    <NumberInput
                                        value={builder.controls.timeoutSeconds}
                                        onChange={(value) => updateControls("timeoutSeconds", value)}
                                        min={1}
                                        max={60}
                                        step={1}
                                    />
                                </label>
                                <label className="inlineLabel">
                                    <span style={{ marginLeft: -25 }}>Finish delay</span>
                                    <div className="inlineLabel-unitWrapper">
                                        <NumberInput
                                            value={builder.controls.loadBar.finishDelay}
                                            onChange={(value) => updateLoadBar({ finishDelay: value })}
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            style={{ width: "100%", minWidth: 0 }}
                                        />
                                        <span className="inlineLabel-unit">s</span>
                                    </div>
                                </label>
                            </div>
                            <div className="settingsRow">
                                <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={builder.controls.oncePerSession}
                                    onChange={(event) => updateControls("oncePerSession", event.target.checked)}
                                />
                                <span>Run once<br />per session</span>
                            </label>
                                <label className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={builder.controls.hideWhenComplete}
                                        onChange={(event) => updateControls("hideWhenComplete", event.target.checked)}
                                    />
                                Hide when complete
                                </label>
                            </div>
                        </SettingsGroup>
                    </section>
                </article>
            </section>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16, marginBottom: 8 }}>
                <button 
                    type="button" 
                    className="framer-button-primary" 
                    onClick={handleInsert}
                    style={{ width: "250px" }}
                >
                    Insert
                </button>
            </div>
            <footer className="loadingFooter loadingFooter--main">
                <p>
                    © Mojave Studio LLC — Custom Automated Web Design Experts
                    <br />
                    <a href="https://mojavestud.io" target="_blank" rel="noopener noreferrer">mojavestud.io</a>
                </p>
            </footer>
        </main>
    )
}
type SettingsGroupProps = {
    title: string
    children: ReactNode
    icon?: ReactNode
    open: boolean
    onToggle: () => void
}

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

type SettingsPopoverProps = {
    email?: string | null
    projectName?: string | null
    onSignOut: () => void | Promise<void>
    onTriggerRefChange?: (node: HTMLButtonElement | null) => void
}

function SettingsPopover({ email, projectName, onSignOut, onTriggerRefChange }: SettingsPopoverProps) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)
    const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

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
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false)
        }

        document.addEventListener("mousedown", handlePointer)
        document.addEventListener("touchstart", handlePointer)
        document.addEventListener("keydown", handleKey)
        return () => {
            document.removeEventListener("mousedown", handlePointer)
            document.removeEventListener("touchstart", handlePointer)
            document.removeEventListener("keydown", handleKey)
        }
    }, [open])

    useLayoutEffect(() => {
        if (typeof onTriggerRefChange === "function") {
            onTriggerRefChange(triggerRef.current)
        }
    }, [onTriggerRefChange, open])

    const measurePanelPosition = useCallback(() => {
        if (!triggerRef.current || typeof window === "undefined") return
        const rect = triggerRef.current.getBoundingClientRect()
        const panelWidth = 250
        // Position directly to the left of the trigger, aligned with top
        const safeLeft = Math.max(12, rect.left - panelWidth - 8 + 30) // 8px gap from trigger, moved 30px right
        const top = rect.top // Align with trigger's top
        setPanelPos({ top, left: safeLeft })
    }, [])

    useEffect(() => {
        if (!open) return
        measurePanelPosition()
        const handleResize = () => measurePanelPosition()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [open, measurePanelPosition])

    const handleTriggerClick = () => {
        if (!open) measurePanelPosition()
        setOpen((prev) => !prev)
    }

    return (
        <div className={`settingsMenu ${open ? "is-open" : ""}`} ref={menuRef}>
            <button
                type="button"
                className="settingsMenu-trigger"
                aria-haspopup="true"
                aria-expanded={open}
                ref={triggerRef}
                onClick={handleTriggerClick}
                aria-label="Settings"
            >
                <span className="settingsMenu-iconWrapper">
                    {open ? <CloseIcon className="settingsMenu-icon" /> : <GearIcon className="settingsMenu-icon" />}
                </span>
            </button>
            {open &&
                createPortal(
                    <>
                        <div className="settingsMenu-overlay" onClick={() => setOpen(false)} />
                        <div
                            ref={panelRef}
                            className="settingsMenu-panel"
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                                top: panelPos.top,
                                left: panelPos.left,
                            }}
                        >
                            <div className="settingsMenu-account">
                                <p>
                                    Signed in as <strong>{email || "Unknown account"}</strong>
                                </p>
                                {projectName && <span>{projectName}</span>}
                            </div>
                            <div className="settingsMenu-actions">
                                <button
                                    type="button"
                                    className="settingsMenu-item"
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        setOpen(false)
                                        if (typeof window !== "undefined") {
                                            window.open("https://mojavestud.io/plugins/loading", "_blank", "noopener,noreferrer")
                                        }
                                    }}
                                >
                                    User Guide
                                </button>
                                <button
                                    type="button"
                                    className="settingsMenu-item"
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={async (event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        setOpen(false)
                                        try {
                                            await onSignOut()
                                        } catch (error) {
                                            if (__isLocal) {
                                                console.error("[Loading Plugin] Sign out error", error)
                                            }
                                        }
                                    }}
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    )
}

const GearIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
    >
        <path
            d="M8 10a2 2 0 100-4 2 2 0 000 4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M12.5 8c0 .3-.05.6-.15.85l1.4 1.1c.2.15.25.45.1.65l-1.3 2.25c-.1.2-.35.25-.55.15l-1.65-.65c-.35.25-.75.45-1.15.55v1.3c0 .25-.2.45-.45.45H7.2c-.25 0-.45-.2-.45-.45v-1.3c-.4-.1-.8-.3-1.15-.55l-1.65.65c-.2.1-.45.05-.55-.15L2.15 10.6c-.15-.2-.1-.5.1-.65l1.4-1.1c-.1-.25-.15-.55-.15-.85s.05-.6.15-.85L2.25 6.05c-.2-.15-.25-.45-.1-.65l1.3-2.25c.1-.2.35-.25.55-.15l1.65.65c.35-.25.75-.45 1.15-.55V1.7c0-.25.2-.45.45-.45h1.6c.25 0 .45.2.45.45v1.3c.4.1.8.3 1.15.55l1.65-.65c.2-.1.45-.05.55.15l1.3 2.25c.15.2.1.5-.1.65l-1.4 1.1c.1.25.15.55.15.85z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const CloseIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
    >
        <path d="M3 3l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
)

const ChevronIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
    >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)


function LoadingPreview({ controls, width, height }: { controls: LoadingControls; width: number; height: number }) {
    const [progress, setProgress] = useState(12)
    const [perpetualProgress, setPerpetualProgress] = useState(0)
    const [textPerpetualProgress, setTextPerpetualProgress] = useState(0)
    const resetTimeoutRef = useRef<number | null>(null)
    const [outsideLabelEl, setOutsideLabelEl] = useState<HTMLDivElement | null>(null)
    const [outsideLabelSize, setOutsideLabelSize] = useState({ width: 0, height: 0 })
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const [containerWidth, setContainerWidth] = useState<number | null>(null)
    const labelTextRef = useRef<HTMLDivElement | null>(null)
    const [labelTextWidth, setLabelTextWidth] = useState(0)

    useEffect(() => {
        const id = window.setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    if (resetTimeoutRef.current) {
                        window.clearTimeout(resetTimeoutRef.current)
                        resetTimeoutRef.current = null
                    }
                    resetTimeoutRef.current = window.setTimeout(() => {
                        setProgress(5)
                        resetTimeoutRef.current = null
                    }, 500)
                    return prev
                }
                const increment = 5 + Math.random() * 12
                const next = prev + increment
                if (next >= 100) {
                    if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current)
                    resetTimeoutRef.current = window.setTimeout(() => {
                        setProgress(5)
                        resetTimeoutRef.current = null
                    }, 500)
                    return 100
                }
                return next
            })
        }, 900)
        return () => {
            window.clearInterval(id)
            if (resetTimeoutRef.current) {
                window.clearTimeout(resetTimeoutRef.current)
                resetTimeoutRef.current = null
            }
        }
    }, [])

    useLayoutEffect(() => {
        const node = wrapperRef.current
        if (!node) return
        const measure = () => {
            setContainerWidth(node.getBoundingClientRect().width)
        }
        measure()
        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(() => measure())
            observer.observe(node)
            return () => observer.disconnect()
        }
        if (typeof window !== "undefined") {
            window.addEventListener("resize", measure)
            return () => window.removeEventListener("resize", measure)
        }
    }, [])

    const loadBar = controls.loadBar

    useEffect(() => {
        if (loadBar.animationStyle !== "circle" || !loadBar.perpetual || typeof window === "undefined") {
            setPerpetualProgress(0)
            return
        }
        let frame: number | null = null
        let startTime: number | null = null
        const animationDuration = 1000
        const gapDuration = Math.max(0, loadBar.perpetualGap) * 1000
        const cycleDuration = animationDuration + gapDuration

        const labelAngle = getInlineAngle(loadBar.labelPosition, loadBar.labelOutsideDirection)
        const rotationDeg = loadBar.startAtLabel ? labelAngle : -90
        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp
            const elapsed = timestamp - startTime
            const cycleTime = elapsed % cycleDuration
            if (cycleTime < animationDuration) {
                setPerpetualProgress(cycleTime / animationDuration)
            } else {
                setPerpetualProgress(0)
            }
            frame = window.requestAnimationFrame(animate)
        }

        frame = window.requestAnimationFrame(animate)
        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame)
            }
        }
    }, [loadBar.animationStyle, loadBar.perpetual, loadBar.perpetualGap])
    useEffect(() => {
        const textFillMode = loadBar.textFillStyle === "static" ? "static" : loadBar.textFillStyle === "oneByOne" ? "oneByOne" : "dynamic"
        if (loadBar.animationStyle !== "text" || textFillMode === "static" || !loadBar.textPerpetual || typeof window === "undefined") {
            setTextPerpetualProgress(0)
            return
        }
        let frame: number | null = null
        let startTime: number | null = null
        const duration = 1600
        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp
            const elapsed = timestamp - startTime
            setTextPerpetualProgress((elapsed % duration) / duration)
            frame = window.requestAnimationFrame(animate)
        }
        frame = window.requestAnimationFrame(animate)
        return () => {
            if (frame !== null) window.cancelAnimationFrame(frame)
        }
    }, [loadBar.animationStyle, loadBar.textPerpetual, loadBar.textFillStyle])
    const labelProgressValue =
        loadBar.animationStyle === "circle" && loadBar.perpetual ? perpetualProgress * 100 : progress
    const rawLabelText = loadBar.labelText
    const baseLabelText =
        rawLabelText !== undefined
            ? (rawLabelText || "").trim()
            : (DEFAULT_LOAD_BAR.labelText || "").trim()
    const effectiveLabelPlacement =
        loadBar.animationStyle === "circle"
            ? loadBar.labelPlacement
            : loadBar.labelPlacement === "inline"
            ? "inside"
            : loadBar.labelPlacement
    const label = loadBar.showLabel
        ? loadBar.animationStyle === "text"
            ? (() => {
                  const mode = loadBar.textDisplayMode || "textAndNumber"
                  if (mode === "textOnly") return baseLabelText
                  if (mode === "numberOnly") return formatPercent(labelProgressValue)
                  return baseLabelText ? `${baseLabelText} ${formatPercent(labelProgressValue)}` : formatPercent(labelProgressValue)
              })()
            : baseLabelText
            ? `${baseLabelText} ${formatPercent(labelProgressValue)}`
            : formatPercent(labelProgressValue)
        : null
    const labelInside = Boolean(label) && effectiveLabelPlacement === "inside"
    const labelOutside = Boolean(label) && effectiveLabelPlacement === "outside" && loadBar.animationStyle !== "text"
    const labelInline = Boolean(label) && loadBar.animationStyle === "circle" && effectiveLabelPlacement === "inline"

    // Measure label text width for bar mode dynamic sizing
    // Use temporary element to measure before rendering (chicken-and-egg: need width to calculate bar width)
    useLayoutEffect(() => {
        if (loadBar.animationStyle !== "bar" || !loadBar.showLabel || !label) {
            setLabelTextWidth(0)
            return
        }
        // Create temporary element with exact same styling as the rendered label
        const tempEl = document.createElement("div")
        tempEl.style.position = "absolute"
        tempEl.style.visibility = "hidden"
        tempEl.style.whiteSpace = "nowrap"
        tempEl.style.fontSize = `${loadBar.labelFontSize}px`
        tempEl.style.fontFamily = loadBar.labelFontFamily
        tempEl.style.fontWeight = String(loadBar.labelFontWeight)
        tempEl.style.letterSpacing = "0.03em" // Match baseLabelStyle
        tempEl.style.textTransform = "uppercase" // Match baseLabelStyle
        tempEl.textContent = label
        document.body.appendChild(tempEl)
        const width = tempEl.getBoundingClientRect().width
        document.body.removeChild(tempEl)
        setLabelTextWidth(width)
    }, [loadBar.animationStyle, loadBar.showLabel, label, loadBar.labelFontSize, loadBar.labelFontFamily, loadBar.labelFontWeight])

    useLayoutEffect(() => {
        if (!labelOutside) {
            setOutsideLabelSize({ width: 0, height: 0 })
            return
        }
        const node = outsideLabelEl
        if (!node) return
        const measure = () => {
            setOutsideLabelSize({
                width: node.offsetWidth,
                height: node.offsetHeight,
            })
        }
        measure()
        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(() => measure())
        observer.observe(node)
        return () => observer.disconnect()
    }, [labelOutside, outsideLabelEl, label])

    const handleOutsideLabelRef = useCallback((node: HTMLDivElement | null) => {
        setOutsideLabelEl(node)
    }, [])

    const baseLabelStyle: CSSProperties = {
        color: loadBar.labelColor,
        fontSize: loadBar.labelFontSize,
        fontFamily: loadBar.labelFontFamily,
        fontWeight: loadBar.labelFontWeight,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        pointerEvents: "none",
    }

    const outsideGapBase = 5
    const circleMaxStroke =
        loadBar.animationStyle === "circle"
            ? Math.max(
                  loadBar.lineWidth || 0,
                  loadBar.showTrack ? loadBar.trackThickness || 0 : 0
              )
            : 0
    const outsideEdgeSpacing =
        loadBar.animationStyle === "circle"
            ? Math.max(outsideGapBase, circleMaxStroke * 0.5 + outsideGapBase)
            : outsideGapBase
    const outsidePadding = { top: 0, right: 0, bottom: 0, left: 0 }
    if (labelOutside && label) {
        if (loadBar.labelOutsideDirection === "top") {
            outsidePadding.top = outsideLabelSize.height + outsideEdgeSpacing
        } else if (loadBar.labelOutsideDirection === "bottom") {
            outsidePadding.bottom = outsideLabelSize.height + outsideEdgeSpacing
        } else {
            // Only reserve a small gap on the side so bar/text remain left-aligned
            if (loadBar.labelPosition === "left") outsidePadding.left = outsideEdgeSpacing
            else if (loadBar.labelPosition === "right") outsidePadding.right = outsideEdgeSpacing
        }
    }

    const labelOffsetX = loadBar.labelOffsetX ?? 0
    const labelOffsetY = loadBar.labelOffsetY ?? 0

    const baseWidth = Math.max(1, width)
    const baseHeight = Math.max(1, height)
    const availableWidth = containerWidth ?? baseWidth
    const scale = baseWidth > 0 ? Math.min(1, availableWidth / baseWidth) : 1
    const scaledWidth = baseWidth * scale
    const scaledHeight = baseHeight * scale

    // Expand preview box horizontally when outside labels are present so they stay within bounds
    const clampedWidth = baseWidth + outsidePadding.left + outsidePadding.right
    // For bar mode, ensure clampedHeight accounts for thickness, border, and padding
    const barHeight = loadBar.animationStyle === "bar" 
        ? loadBar.width + 
          (loadBar.showBorder ? loadBar.borderWidth * 2 : 0) + 
          (loadBar.fillStyle === "lines" ? 4 : 0) // 2px padding top + 2px bottom
        : 0
    const clampedHeight = Math.max(
        baseHeight + outsidePadding.top + outsidePadding.bottom,
        barHeight + outsidePadding.top + outsidePadding.bottom
    )
    const contentWidth = Math.max(0, clampedWidth - outsidePadding.left - outsidePadding.right)
    const contentHeight = Math.max(
        barHeight,
        Math.max(0, clampedHeight - outsidePadding.top - outsidePadding.bottom)
    )

    // Calculate inset based on thickness for proper inside/outside positioning
    // For inside labels, need to account for full thickness to avoid overlap
    // For outside labels, need spacing from the edge
    const barThickness = loadBar.animationStyle === "bar" ? loadBar.width : 0
    const borderWidth = loadBar.showBorder ? loadBar.borderWidth : 0
    const totalBarHeight = barThickness + (borderWidth * 2)
    const insideBarInset = Math.max(6, totalBarHeight * 0.5 + 4) // Half the bar height plus padding for inside
    
    const insideLabelTransforms: string[] = []
    const insideLabelStyle: CSSProperties = {
        ...baseLabelStyle,
        position: "absolute",
    }
    
    // X positioning - account for bar thickness to avoid overlap
    if (effectiveLabelPlacement === "inside") {
        switch (loadBar.labelPosition) {
            case "left":
                insideLabelStyle.left = insideBarInset
                break
            case "center":
                insideLabelStyle.left = "50%"
                insideLabelTransforms.push("translateX(-50%)")
                break
            default:
                insideLabelStyle.right = insideBarInset
                break
        }
    } else {
        // For other placements, use default positioning
        switch (loadBar.labelPosition) {
            case "left":
                insideLabelStyle.left = 8
                break
            case "center":
                insideLabelStyle.left = "50%"
                insideLabelTransforms.push("translateX(-50%)")
                break
            default:
                insideLabelStyle.right = 8
                break
        }
    }
    
    // Y positioning - account for bar thickness to avoid overlap
    if (effectiveLabelPlacement === "inside") {
        // For bars, use labelOutsideDirection for Y positioning
        if (loadBar.animationStyle === "bar") {
            // Clear any existing top/bottom to avoid conflicts
            insideLabelStyle.top = undefined
            insideLabelStyle.bottom = undefined
            
            if (loadBar.labelOutsideDirection === "top") {
                // Top selection -> position at top of bar
                insideLabelStyle.top = 0
            } else if (loadBar.labelOutsideDirection === "bottom") {
                // Bottom selection -> position at bottom of bar
                insideLabelStyle.bottom = 0
            } else {
                // center
                insideLabelStyle.top = "50%"
                insideLabelTransforms.push("translateY(-50%)")
            }
        } else {
            // For circles, keep centered vertically
            insideLabelStyle.top = "50%"
            insideLabelStyle.bottom = undefined
            insideLabelTransforms.push("translateY(-50%)")
        }
    } else {
        // Default to center for other placements
        insideLabelStyle.top = "50%"
        insideLabelStyle.bottom = undefined
        insideLabelTransforms.push("translateY(-50%)")
    }

    // Apply user-defined offsets (pixels) for fine-tuning
    if (labelOffsetX) {
        insideLabelTransforms.push(`translateX(${labelOffsetX}px)`)
    }
    if (labelOffsetY) {
        insideLabelTransforms.push(`translateY(${labelOffsetY}px)`)
    }
    
    if (insideLabelTransforms.length > 0) {
        insideLabelStyle.transform = insideLabelTransforms.join(" ")
    }

    // Calculate spacing for outside labels - immediately outside the edge
    // For circles, use stroke width; for bars, use minimal spacing
    const outsideSpacing = outsideEdgeSpacing
    
    const outsideLabelTransforms: string[] = []
    const outsideLabelStyle: CSSProperties = {
        ...baseLabelStyle,
        position: "absolute",
    }
    if (loadBar.labelOutsideDirection === "top") {
        outsideLabelStyle.top = outsideSpacing
    } else if (loadBar.labelOutsideDirection === "center") {
        outsideLabelStyle.top = "50%"
        outsideLabelTransforms.push("translateY(-50%)")
    } else {
        outsideLabelStyle.bottom = outsideSpacing
    }
    const outsideHorizontal = loadBar.labelPosition
    if (outsideHorizontal === "left") {
        outsideLabelStyle.left = 0
        outsideLabelTransforms.push(`translateX(calc(-100% - ${outsideSpacing}px))`)
    } else if (outsideHorizontal === "center") {
        outsideLabelStyle.left = "50%"
        outsideLabelTransforms.push("translateX(-50%)")
    } else {
        outsideLabelStyle.right = 0
        outsideLabelTransforms.push(`translateX(calc(100% + ${outsideSpacing}px))`)
    }
    // Apply user-defined offsets (pixels) for fine-tuning outside labels
    if (labelOffsetX) {
        outsideLabelTransforms.push(`translateX(${labelOffsetX}px)`)
    }
    if (labelOffsetY) {
        outsideLabelTransforms.push(`translateY(${labelOffsetY}px)`)
    }

    if (outsideLabelTransforms.length > 0) {
        outsideLabelStyle.transform = outsideLabelTransforms.join(" ")
    }
    if (outsideLabelTransforms.length > 0) {
        outsideLabelStyle.transform = outsideLabelTransforms.join(" ")
    }

    // For bar mode, ensure root height accounts for content height plus padding
    const minRootHeight = loadBar.animationStyle === "bar" 
        ? contentHeight + outsidePadding.top + outsidePadding.bottom
        : clampedHeight
    const rootStyle: CSSProperties = {
        width: clampedWidth,
        height: Math.max(clampedHeight, minRootHeight),
        minHeight: Math.max(clampedHeight, minRootHeight),
        position: "relative",
        boxSizing: "border-box",
        paddingTop: outsidePadding.top,
        paddingRight: outsidePadding.right,
        paddingBottom: outsidePadding.bottom,
        paddingLeft: outsidePadding.left,
        margin: 0,
    }

    // For bar mode, use bar width; for other modes use contentWidth
    const wrapperWidth = loadBar.animationStyle === "bar" 
        ? (containerWidth ?? baseWidth)
        : contentWidth

    const contentWrapperStyle: CSSProperties = {
        width: wrapperWidth,
        height: contentHeight,
        minHeight: barHeight || contentHeight,
        position: "relative",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: loadBar.animationStyle === "circle" ? "center" : "center",
        overflow: "visible",
    }

    const progressValue = Math.max(0, Math.min(1, progress / 100))
    const effectiveProgress =
        loadBar.animationStyle === "circle" && loadBar.perpetual ? perpetualProgress : progressValue
    const resolvedTextFillStyle =
        loadBar.textFillStyle === "static"
            ? "static"
            : loadBar.textFillStyle === "oneByOne"
            ? "oneByOne"
            : "dynamic"
    const textFillProgress =
        loadBar.animationStyle === "text" &&
        resolvedTextFillStyle !== "static" &&
        loadBar.textPerpetual &&
        effectiveProgress < 0.999
            ? textPerpetualProgress
            : effectiveProgress

    const renderContent = () => {
        const trackBackground = loadBar.showTrack ? loadBar.trackColor : "transparent"
        if (loadBar.animationStyle === "text") {
            if (resolvedTextFillStyle === "static") {
            return (
                <div
                    className="previewTextOnly"
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                            justifyContent: "flex-start",
                    }}
                >
                    {loadBar.showLabel && (
                        <div className="previewLabel" style={{ ...baseLabelStyle, position: "relative" }}>
                            {label}
                            </div>
                        )}
                    </div>
                )
            }

            const fillPct = Math.max(0, Math.min(1, textFillProgress)) * 100
            const baseTextColor = loadBar.showTrack 
                ? (loadBar.trackColor || loadBar.labelColor || (baseLabelStyle.color as string) || "rgba(255,255,255,0.25)")
                : "transparent"
            const textDisplayMode = loadBar.textDisplayMode || "textAndNumber"
            // Use labelColor for fill color (prioritize labelColor over textFillColor)
            const fillColor = loadBar.labelColor || loadBar.textFillColor || loadBar.barColor
            
            // For dynamic: ultra-smooth progressive fill with very wide, gradual transition
            // Use a much wider transition zone (30%) for ultra-smooth fill
            const transitionZone = 30
            const maskStop = loadBar.textReverse ? Math.max(0, 100 - fillPct) : fillPct
            const maskStart = Math.max(0, maskStop - transitionZone)
            const maskEnd = Math.min(100, maskStop + transitionZone)
            // Create an extremely gradual, smooth gradient with many stops for seamless transition
            // Use a smooth easing curve for the opacity transition
            const maskImage = loadBar.textReverse
                ? `linear-gradient(90deg, transparent ${maskStart}%, rgba(0,0,0,0.05) ${maskStart + transitionZone * 0.15}%, rgba(0,0,0,0.15) ${maskStart + transitionZone * 0.3}%, rgba(0,0,0,0.3) ${maskStart + transitionZone * 0.45}%, rgba(0,0,0,0.5) ${maskStart + transitionZone * 0.6}%, rgba(0,0,0,0.7) ${maskStart + transitionZone * 0.75}%, rgba(0,0,0,0.85) ${maskStart + transitionZone * 0.9}%, rgba(0,0,0,0.95) ${maskStop - transitionZone * 0.05}%, #000 ${maskEnd}%)`
                : `linear-gradient(90deg, #000 ${maskStart}%, rgba(0,0,0,0.95) ${maskStop - transitionZone * 0.05}%, rgba(0,0,0,0.85) ${maskStop + transitionZone * 0.1}%, rgba(0,0,0,0.7) ${maskStop + transitionZone * 0.25}%, rgba(0,0,0,0.5) ${maskStop + transitionZone * 0.4}%, rgba(0,0,0,0.3) ${maskStop + transitionZone * 0.55}%, rgba(0,0,0,0.15) ${maskStop + transitionZone * 0.7}%, rgba(0,0,0,0.05) ${maskStop + transitionZone * 0.85}%, transparent ${maskEnd}%)`
            const directionDeg = loadBar.textReverse ? 270 : 90
            const textContent = label ?? ""

            if (resolvedTextFillStyle === "oneByOne") {
                const letters = Array.from(textContent)
                const total = Math.max(1, letters.length)
                // Truly discrete: one character at a time, no partial fills
                const filled = Math.min(total, Math.floor(textFillProgress * total))

                return (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            boxSizing: "border-box",
                        }}
                    >
                        {loadBar.showLabel && (
                            <div
                                style={{
                                    position: "relative",
                                    display: "inline-block",
                                    lineHeight: 1.2,
                                    padding: "2px 4px",
                                }}
                            >
                                {letters.map((ch, idx) => {
                                    const isFilled = idx < filled
                                    const spanStyle: CSSProperties = {
                                        ...baseLabelStyle,
                                        color: isFilled ? fillColor : baseTextColor,
                                        position: "relative",
                                    }
                                    return (
                                        <span key={idx} style={spanStyle}>
                                            {ch}
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            return (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        boxSizing: "border-box",
                    }}
                >
                    {loadBar.showLabel && (
                        <div
                            style={{
                                position: "relative",
                                display: "inline-block",
                                lineHeight: 1.2,
                            }}
                        >
                            {/* Track (base text color) */}
                            <span
                                style={{
                                    ...baseLabelStyle,
                                    color: baseTextColor,
                                    position: "relative",
                                    display: "inline-block",
                                    zIndex: 1,
                                    padding: "2px 4px",
                                }}
                            >
                                {textContent}
                            </span>
                            {/* Fill (masked fill color) - perfectly aligned overlay */}
                            <span
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    pointerEvents: "none",
                                    zIndex: 2,
                                    overflow: "hidden",
                                    maskImage,
                                    WebkitMaskImage: maskImage,
                                    maskRepeat: "no-repeat",
                                    WebkitMaskRepeat: "no-repeat",
                                    maskPosition: "0 0",
                                    WebkitMaskPosition: "0 0",
                                }}
                            >
                                <span
                                    style={{
                                        ...baseLabelStyle,
                                        color: "transparent",
                                        background: fillColor,
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        position: "relative",
                                        display: "inline-block",
                                        lineHeight: 1.2,
                                        whiteSpace: "nowrap",
                                        padding: "2px 4px",
                                    }}
                                >
                                    {textContent}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            )
        }

        if (loadBar.animationStyle === "circle") {
            const baseCircleSize = Math.max(0, Math.min(contentWidth, contentHeight))
            // Compensate for reduced container size to keep circle the same visual size
            const boxSizeReduction = 20
            const circleBoxSize = Math.max(0, Math.min(baseCircleSize - 12 + boxSizeReduction, baseCircleSize)) // Add back the reduction, but cap at container size
            const circleSize = circleBoxSize
            const strokeWidth = loadBar.lineWidth
            const trackStroke = loadBar.showTrack ? loadBar.trackThickness : 0
            const circleRadius = Math.max(0, circleSize / 2 - Math.max(strokeWidth, trackStroke) * 0.5)
            const circumference = 2 * Math.PI * circleRadius
            const circleOffsetX = (contentWidth - circleSize) / 2
            const circleOffsetY = (contentHeight - circleSize) / 2
            // Calculate inset accounting for stroke width - inside labels need to avoid overlap
            const maxStroke = Math.max(strokeWidth, trackStroke)
            const baseInset = Math.min(16, Math.max(6, circleSize * 0.08))
            // For inside labels, need at least half the stroke width plus padding to avoid overlap at positioning point
            const circleLabelInset = effectiveLabelPlacement === "inside" 
                ? Math.max(baseInset, maxStroke * 0.5 + 6) // Half stroke width plus padding to avoid overlap
                : baseInset
            const labelAngle = getInlineAngle(loadBar.labelPosition, loadBar.labelOutsideDirection)
            const rotationDeg = loadBar.startAtLabel ? labelAngle : -90
            const gapDegrees = loadBar.circleGap
            const gapLength = (gapDegrees / 360) * circumference
            const gapOffset =
                ((labelAngle - rotationDeg + 360) % 360) / 360 * circumference - gapLength / 2

            return (
                <div
                    className="previewCircle"
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        position: "relative",
                    }}
                >
                    <svg width={circleSize} height={circleSize} style={{ transform: `rotate(${rotationDeg}deg)` }}>
                        {loadBar.showTrack && (
                            <circle
                                cx={circleSize / 2}
                                cy={circleSize / 2}
                                r={circleRadius}
                                fill="none"
                                stroke={loadBar.trackColor}
                                strokeWidth={trackStroke}
                                strokeDasharray={`${circumference - gapLength} ${gapLength}`}
                                strokeDashoffset={gapOffset}
                            />
                        )}
                        {loadBar.fillStyle === "solid" ? (
                            <circle
                                cx={circleSize / 2}
                                cy={circleSize / 2}
                                r={circleRadius}
                                fill="none"
                                stroke={effectiveProgress > 0 ? loadBar.barColor : "transparent"}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${Math.max(
                                    0,
                                    (circumference - gapLength) * effectiveProgress
                                )} ${Math.max(
                                    0,
                                    (circumference - gapLength) * (1 - effectiveProgress) + gapLength
                                )}`}
                                strokeDashoffset={gapOffset}
                                strokeLinecap={effectiveProgress <= 0.001 ? "butt" : "round"}
                            />
                        ) : (
                            <>
                                {Array.from({ length: 20 }).map((_, i) => {
                                    const shouldShow = i < Math.floor(effectiveProgress * 20)
                                    if (!shouldShow) return null
                                    const angle = (i / 20) * 360 - 90
                                    const angleDelta = Math.abs(
                                        ((((angle - labelAngle) % 360) + 540) % 360) - 180
                                    )
                                    if (angleDelta <= gapDegrees / 2) return null
                                    const rad = (angle * Math.PI) / 180
                                    const innerRadius = Math.max(0, circleRadius - loadBar.lineWidth)
                                    const x1 = circleSize / 2 + circleRadius * Math.cos(rad)
                                    const y1 = circleSize / 2 + circleRadius * Math.sin(rad)
                                    const x2 = circleSize / 2 + innerRadius * Math.cos(rad)
                                    const y2 = circleSize / 2 + innerRadius * Math.sin(rad)
                                    return (
                                        <line
                                            key={i}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke={loadBar.barColor}
                                            strokeWidth={loadBar.lineWidth}
                                            strokeLinecap="round"
                                        />
                                    )
                                })}
                            </>
                        )}
                    </svg>
                            {labelInside && label && (
                                <div
                                    style={{
                                        position: "absolute",
                                        width: circleSize,
                                        height: circleSize,
                                        left: circleOffsetX,
                                        top: circleOffsetY,
                                        display: "flex",
                                        alignItems:
                                            loadBar.labelOutsideDirection === "top"
                                                ? "flex-start"
                                                : loadBar.labelOutsideDirection === "bottom"
                                                ? "flex-end"
                                                : "center",
                                        justifyContent: mapLabelAlign(loadBar.labelPosition),
                                        pointerEvents: "none",
                                    }}
                                >
                                    <div
                                        className="previewLabel"
                                        style={{
                                            ...baseLabelStyle,
                                            position: "relative",
                                            whiteSpace: "nowrap",
                                            transform:
                                                labelOffsetX || labelOffsetY
                                                    ? `translate(${labelOffsetX}px, ${labelOffsetY}px)`
                                                    : undefined,
                                        }}
                                    >
                                        {label}
                                    </div>
                                </div>
                            )}
                    {labelInline && label && (
                        <div
                            style={{
                                position: "absolute",
                                width: circleSize,
                                height: circleSize,
                                left: circleOffsetX,
                                top: circleOffsetY,
                                pointerEvents: "none",
                            }}
                        >
                            {(() => {
                                const angle = getInlineAngle(loadBar.labelPosition, loadBar.labelOutsideDirection)
                                const rad = (angle * Math.PI) / 180
                                const labelRadius = circleRadius
                                const lx = circleSize / 2 + labelRadius * Math.cos(rad)
                                const ly = circleSize / 2 + labelRadius * Math.sin(rad)
                                const inlineTransforms = [
                                    "translate(-50%, -50%)",
                                    labelOffsetX ? `translateX(${labelOffsetX}px)` : "",
                                    labelOffsetY ? `translateY(${labelOffsetY}px)` : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")
                                return (
                                    <div
                                        className="previewLabel"
                                        style={{
                                            ...baseLabelStyle,
                                            position: "absolute",
                                            left: lx,
                                            top: ly,
                                            transform: inlineTransforms || undefined,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {label}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>
            )
        }


        if (loadBar.fillStyle === "solid") {
            const windowWidth = 300
            const windowHeight = 150
            const containerPadding = 5
            const baseGap = 5
            const isOutside = effectiveLabelPlacement === "outside"
            const isLabelLeft = loadBar.labelPosition === "left"
            const isLabelRight = loadBar.labelPosition === "right"
            const isLabelCenter = loadBar.labelPosition === "center"
            const gap = baseGap + (labelOffsetX || 0)
            const insideAlignY =
                loadBar.labelOutsideDirection === "top"
                    ? "flex-start"
                    : loadBar.labelOutsideDirection === "bottom"
                    ? "flex-end"
                    : "center"
            const insidePaddingX = Math.max(6, Math.round(loadBar.width * 0.2))
            const insideBasePaddingY = Math.max(4, Math.round(loadBar.width * 0.15))
            const insideVerticalInset = Math.max(
                1,
                loadBar.showBorder ? Math.round(loadBar.borderWidth || 0) : 0,
                Math.round(loadBar.width * 0.05)
            )
            const insideHorizontalInset = 5
            const insidePaddingLeft =
                insidePaddingX + (loadBar.labelPosition === "left" ? insideHorizontalInset : 0)
            const insidePaddingRight =
                insidePaddingX + (loadBar.labelPosition === "right" ? insideHorizontalInset : 0)
            const insidePaddingTop =
                loadBar.labelOutsideDirection === "top"
                    ? insideVerticalInset
                    : insideBasePaddingY
            const insidePaddingBottom =
                loadBar.labelOutsideDirection === "bottom"
                    ? insideVerticalInset
                    : insideBasePaddingY
            const insideTransforms: string[] = []
            if (labelOffsetX) insideTransforms.push(`translateX(${labelOffsetX}px)`)
            if (labelOffsetY) insideTransforms.push(`translateY(${labelOffsetY}px)`)
            const insideLabelTransform = insideTransforms.length ? insideTransforms.join(" ") : undefined
            const outsideTransforms: string[] = []
            if (loadBar.labelOutsideDirection === "center") outsideTransforms.push("translateY(-50%)")
            if (isLabelCenter) outsideTransforms.push("translateX(-50%)")
            if (labelOffsetX) outsideTransforms.push(`translateX(${labelOffsetX}px)`)
            if (labelOffsetY) outsideTransforms.push(`translateY(${labelOffsetY}px)`)
            const outsideLabelTransform = outsideTransforms.length ? outsideTransforms.join(" ") : undefined

            return (
                <div
                    style={{
                        position: "relative",
                        width: `${windowWidth + containerPadding * 2}px`,
                        height: `${windowHeight + containerPadding * 2}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isLabelCenter ? "center" : "flex-start",
                        padding: `${containerPadding}px`,
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            width: `${windowWidth}px`,
                            height: "100%",
                        }}
                    >
                        <div
                            className="previewBar previewBar--matchButton"
                            style={{
                                width: `${windowWidth}px`,
                                height: `${loadBar.width}px`,
                                borderRadius: loadBar.barRadius,
                                border: loadBar.showBorder ? `${loadBar.borderWidth}px solid ${loadBar.borderColor}` : "none",
                                background: trackBackground,
                                position: "absolute",
                                top: "50%",
                                left: isLabelCenter ? "50%" : 0,
                                transform: `translateY(-50%)${isLabelCenter ? " translateX(-50%)" : ""}`,
                                overflow: isOutside ? "visible" : "hidden",
                            }}
                        >
                            <div
                                className="previewFill"
                                style={{
                                    width: `${progress}%`,
                                    borderRadius: loadBar.barRadius,
                                    background: loadBar.barColor,
                                }}
                            />
                            {loadBar.showLabel && label && !isOutside && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: insideAlignY,
                                        justifyContent: mapLabelAlign(loadBar.labelPosition),
                                        pointerEvents: "none",
                                        paddingLeft: insidePaddingLeft,
                                        paddingRight: insidePaddingRight,
                                        paddingTop: insidePaddingTop,
                                        paddingBottom: insidePaddingBottom,
                                    }}
                                >
                                    <div
                                        ref={labelTextRef}
                                        className="previewLabel"
                                        style={{
                                            ...baseLabelStyle,
                                            fontSize: `${loadBar.labelFontSize}px`,
                                            whiteSpace: "nowrap",
                                            transform: insideLabelTransform,
                                        }}
                                    >
                                        {label}
                                    </div>
                                </div>
                            )}
                        </div>
                        {loadBar.showLabel && label && isOutside && (
                            <div
                                ref={labelTextRef}
                                className="previewLabel"
                                style={{
                                    ...baseLabelStyle,
                                    fontSize: `${loadBar.labelFontSize}px`,
                                    position: "absolute",
                                    whiteSpace: "nowrap",
                                    left:
                                        loadBar.labelOutsideDirection === "center" && !isLabelCenter
                                            ? "auto"
                                            : isLabelCenter
                                            ? "50%"
                                            : isLabelLeft
                                            ? `${containerPadding}px`
                                            : "auto",
                                    right:
                                        loadBar.labelOutsideDirection === "center" && !isLabelCenter
                                            ? "auto"
                                            : isLabelRight
                                            ? `${containerPadding}px`
                                            : "auto",
                                    ...(loadBar.labelOutsideDirection === "top"
                                        ? { bottom: `calc(50% + ${loadBar.width / 2}px + ${gap}px)` }
                                        : loadBar.labelOutsideDirection === "bottom"
                                        ? { top: `calc(50% + ${loadBar.width / 2}px + ${gap}px)` }
                                        : isLabelLeft && !isLabelCenter
                                        ? { top: "50%", right: `calc(100% + ${gap}px)` }
                                        : isLabelRight && !isLabelCenter
                                        ? { top: "50%", left: `calc(100% + ${gap}px)` }
                                        : { top: "50%" }),
                                    transform: outsideLabelTransform,
                                }}
                            >
                                {label}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        if (loadBar.fillStyle === "lines") {
            const windowWidth = 300
            const windowHeight = 150
            const containerPadding = 5
            const baseGap = 5
            const isOutside = effectiveLabelPlacement === "outside"
            const isLabelLeft = loadBar.labelPosition === "left"
            const isLabelRight = loadBar.labelPosition === "right"
            const isLabelCenter = loadBar.labelPosition === "center"
            const gap = baseGap + (labelOffsetX || 0)
            const insideAlignY =
                loadBar.labelOutsideDirection === "top"
                    ? "flex-start"
                    : loadBar.labelOutsideDirection === "bottom"
                    ? "flex-end"
                    : "center"
            const insidePaddingX = Math.max(6, Math.round(loadBar.width * 0.2))
            const insideBasePaddingY = Math.max(4, Math.round(loadBar.width * 0.15))
            const insideVerticalInset = Math.max(
                1,
                loadBar.showBorder ? Math.round(loadBar.borderWidth || 0) : 0,
                Math.round(loadBar.width * 0.05)
            )
            const insideHorizontalInset = 5
            const insidePaddingLeft =
                insidePaddingX + (loadBar.labelPosition === "left" ? insideHorizontalInset : 0)
            const insidePaddingRight =
                insidePaddingX + (loadBar.labelPosition === "right" ? insideHorizontalInset : 0)
            const insidePaddingTop =
                loadBar.labelOutsideDirection === "top"
                    ? insideVerticalInset
                    : insideBasePaddingY
            const insidePaddingBottom =
                loadBar.labelOutsideDirection === "bottom"
                    ? insideVerticalInset
                    : insideBasePaddingY
            const insideTransforms: string[] = []
            if (labelOffsetX) insideTransforms.push(`translateX(${labelOffsetX}px)`)
            if (labelOffsetY) insideTransforms.push(`translateY(${labelOffsetY}px)`)
            const insideLabelTransform = insideTransforms.length ? insideTransforms.join(" ") : undefined
            const outsideTransforms: string[] = []
            if (loadBar.labelOutsideDirection === "center") outsideTransforms.push("translateY(-50%)")
            if (isLabelCenter) outsideTransforms.push("translateX(-50%)")
            if (labelOffsetX) outsideTransforms.push(`translateX(${labelOffsetX}px)`)
            if (labelOffsetY) outsideTransforms.push(`translateY(${labelOffsetY}px)`)
            const outsideLabelTransform = outsideTransforms.length ? outsideTransforms.join(" ") : undefined
            const numLines = Math.floor(progressValue * 20)
            const lineRadius = Math.max(0, Math.min(loadBar.barRadius, loadBar.lineWidth / 2))

            return (
                <div
                    style={{
                        position: "relative",
                        width: `${windowWidth + containerPadding * 2}px`,
                        height: `${windowHeight + containerPadding * 2}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isLabelCenter ? "center" : "flex-start",
                        padding: `${containerPadding}px`,
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            width: `${windowWidth}px`,
                            height: "100%",
                        }}
                    >
                        <div
                            className="previewBar previewBar--matchButton"
                            style={{
                                width: `${windowWidth}px`,
                                height: `${loadBar.width}px`,
                                borderRadius: 0,
                                border: "none",
                                background: "transparent",
                                position: "absolute",
                                top: "50%",
                                left: isLabelCenter ? "50%" : 0,
                                transform: `translateY(-50%)${isLabelCenter ? " translateX(-50%)" : ""}`,
                                overflow: isOutside ? "visible" : "hidden",
                                display: "flex",
                                gap: 2,
                                padding: 2,
                            }}
                        >
                            {Array.from({ length: 20 }).map((_, idx) => {
                                const shouldShow = idx < numLines
                                const isTrackLine = !shouldShow && loadBar.showTrack
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            width: `${loadBar.lineWidth}px`,
                                            height: "100%",
                                            background: shouldShow ? loadBar.barColor : (isTrackLine ? loadBar.trackColor : "transparent"),
                                            borderRadius: (shouldShow || isTrackLine) ? lineRadius : 0,
                                            border: loadBar.showBorder ? `${loadBar.borderWidth}px solid ${loadBar.borderColor}` : "none",
                                            opacity: shouldShow ? 1 : isTrackLine ? 0.3 : 0,
                                            transition: "all 0.2s ease",
                                        }}
                                    />
                                )
                            })}
                            {loadBar.showLabel && label && !isOutside && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: insideAlignY,
                                        justifyContent: mapLabelAlign(loadBar.labelPosition),
                                        pointerEvents: "none",
                                        paddingLeft: insidePaddingLeft,
                                        paddingRight: insidePaddingRight,
                                        paddingTop: insidePaddingTop,
                                        paddingBottom: insidePaddingBottom,
                                    }}
                                >
                                    <div
                                        ref={labelTextRef}
                                        className="previewLabel"
                                        style={{
                                            ...baseLabelStyle,
                                            fontSize: `${loadBar.labelFontSize}px`,
                                            whiteSpace: "nowrap",
                                            transform: insideLabelTransform,
                                        }}
                                    >
                                        {label}
                                    </div>
                                </div>
                            )}
                        </div>
                        {loadBar.showLabel && label && isOutside && (
                            <div
                                ref={labelTextRef}
                                className="previewLabel"
                                style={{
                                    ...baseLabelStyle,
                                    fontSize: `${loadBar.labelFontSize}px`,
                                    position: "absolute",
                                    whiteSpace: "nowrap",
                                    left:
                                        loadBar.labelOutsideDirection === "center" && !isLabelCenter
                                            ? "auto"
                                            : isLabelCenter
                                            ? "50%"
                                            : isLabelLeft
                                            ? `${containerPadding}px`
                                            : "auto",
                                    right:
                                        loadBar.labelOutsideDirection === "center" && !isLabelCenter
                                            ? "auto"
                                            : isLabelRight
                                            ? `${containerPadding}px`
                                            : "auto",
                                    ...(loadBar.labelOutsideDirection === "top"
                                        ? { bottom: `calc(50% + ${loadBar.width / 2}px + ${gap}px)` }
                                        : loadBar.labelOutsideDirection === "bottom"
                                        ? { top: `calc(50% + ${loadBar.width / 2}px + ${gap}px)` }
                                        : isLabelLeft && !isLabelCenter
                                        ? { top: "50%", right: `calc(100% + ${gap}px)` }
                                        : isLabelRight && !isLabelCenter
                                        ? { top: "50%", left: `calc(100% + ${gap}px)` }
                                        : { top: "50%" }),
                                    transform: outsideLabelTransform,
                                }}
                            >
                                {label}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        return null
    }

    return (
        <div
            ref={wrapperRef}
            style={{ width: "100%", display: "flex", justifyContent: "flex-start", fontSize: 0, lineHeight: 0 }}
        >
            <div
                style={{
                    width: scaledWidth,
                    height: scaledHeight,
                    margin: 0,
                    position: "relative",
                    overflow: "visible",
                    fontSize: "initial",
                    lineHeight: "initial",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: clampedWidth,
                        height: clampedHeight,
                        transform: scale < 1 ? `scale(${scale})` : undefined,
                        transformOrigin: "top left",
                    }}
                >
                    <div className="previewRoot" style={rootStyle}>
                        <div className="previewContent" style={contentWrapperStyle}>
                            {renderContent()}
                        </div>
                        {/* Only render outside label for circle mode, not bar mode (bar handles label inline) */}
                        {labelOutside && label && loadBar.animationStyle !== "bar" && (
                            <div
                                ref={handleOutsideLabelRef}
                                className="previewLabel previewLabel--absolute"
                                style={outsideLabelStyle}
                            >
                                {label}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}


const mapLabelAlign = (position: LabelPosition): "flex-start" | "center" | "flex-end" => {
    switch (position) {
        case "left":
            return "flex-start"
        case "center":
            return "center"
        case "right":
        default:
            return "flex-end"
    }
}

const getInlineAngle = (position?: LabelPosition, direction?: LabelOutsideDirection) => {
    const x = position === "left" ? -1 : position === "right" ? 1 : 0
    const y = direction === "top" ? -1 : direction === "bottom" ? 1 : 0
    const hasX = x !== 0
    const hasY = y !== 0
    if (!hasX && !hasY) return -90
    const angleRad = Math.atan2(hasY ? y : 0, hasX ? x : 0)
    return (angleRad * 180) / Math.PI
}

export default App
