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

type LabelPosition = "left" | "center" | "right"
type LabelPlacement = "inside" | "outside" | "inline"
type LabelOutsideDirection = "top" | "center" | "bottom"

type LoadBarControls = {
    animationStyle: "bar" | "circle" | "text"
    fillStyle: "solid" | "lines"
    lineWidth: number
    perpetual: boolean
    perpetualGap: number
    barRadius: number
    barColor: string
    trackColor: string
    showTrack: boolean
    trackThickness: number
    startAtLabel: boolean
    showLabel: boolean
    labelText: string
    labelColor: string
    labelFontSize: number
    labelFontFamily: string
    labelFontWeight: string | number
    labelFont?: FontControlValue
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
    completeVariant: string
    customReadySelector: string
    customReadyEvent: string
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
    lineWidth: 2,
    perpetual: false,
    perpetualGap: 0.5,
    barRadius: 999,
    barColor: "#854FFF",
    trackColor: "rgba(0,0,0,.12)",
    showTrack: true,
    trackThickness: 2,
    startAtLabel: false,
    showLabel: true,
    labelText: "Loading",
    labelColor: "#ffffff",
    labelFontSize: 12,
    labelFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    labelFontWeight: 600,
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
    completeVariant: "",
    customReadySelector: "",
    customReadyEvent: "load",
    loadBar: { ...DEFAULT_LOAD_BAR },
})

const createDefaultBuilderState = (): BuilderState => ({
    controls: createDefaultControls(),
    width: 600,
    height: 48,
})

const getEnv = (key: string): string | undefined => {
    try {
        const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env
        return env ? (env as Record<string, string>)[key] : undefined
    } catch {
        return undefined
    }
}

const COMPONENT_URL =
    getEnv("VITE_LOADING_COMPONENT_URL") || new URL("/Loading.component.js", import.meta.url).href

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
        200: "Extra Light",
        300: "Light",
        400: "Regular",
        500: "Medium",
        600: "Semibold",
        700: "Bold",
        800: "Extra Bold",
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
        try {
            const canCreateFrame =
                typeof framer.isAllowedTo === "function" ? framer.isAllowedTo("createFrameNode") : false
            const createFrameNode = (framer as any).createFrameNode
            if (!canCreateFrame || typeof createFrameNode !== "function") {
                return false
            }

            const fallbackNode = await createFrameNode({
                width: effectiveWidth,
                height: effectiveHeight,
            })

            if (!fallbackNode) return false

            const loadBar = loadingControls.loadBar
            const node: any = fallbackNode

            if (typeof node.setAttributes === "function") {
                await node.setAttributes({
                    name: "Loading Gate Placeholder",
                    width: effectiveWidth,
                    height: effectiveHeight,
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
                node.width = effectiveWidth
                node.height = effectiveHeight
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
    }, [effectiveHeight, effectiveWidth, loadingControls])

    const handleInsert = useCallback(async () => {
        if (!COMPONENT_URL) {
            await framer.notify("Component URL missing. Set VITE_LOADING_COMPONENT_URL or include Loading.component.js.", {
                variant: "error",
            })
            return
        }

        const attributes = {
            controls: {
                ...loadingControls,
            },
            width: `${effectiveWidth}px`,
            height: `${effectiveHeight}px`,
        }

        try {
            if (!framer.isAllowedTo("addComponentInstance")) {
                throw new Error("Permission denied for addComponentInstance")
            }

            await framer.addComponentInstance({
                url: COMPONENT_URL,
                attributes,
            })
            await framer.notify("Loading gate inserted with your settings!", { variant: "success" })
        } catch (error) {
            if (__isLocal) console.error("[Loading Plugin] Failed to insert component", error)
            const fallbackInserted = await tryFallbackInsert()
            if (fallbackInserted) {
                await framer.notify(
                    `⚠️ Inserted a frame placeholder (${effectiveWidth}×${effectiveHeight}) because component permissions are restricted.`,
                    { variant: "warning" }
                )
                return
            }

            await framer.notify(
                "Error inserting Loading component. Make sure the module URL is reachable and plugin permissions allow component insertion.",
                {
                    variant: "error",
                }
            )
        }
    }, [COMPONENT_URL, effectiveHeight, effectiveWidth, loadingControls, tryFallbackInsert])

    const activeProjectName = projectName || authSnapshot?.projectName || null
    const heroPreviewWidth = Math.max(1, effectiveWidth)
    const heroPreviewHeight = Math.max(1, effectiveHeight)

    if (!readyForApp) {
        return (
            <main className={`pluginRoot ${themeClass}`}>
                <section className="pluginBody loginBody">
                    <article className="previewCard">
                        <LoadingPreview controls={loadingControls} width={340} height={48} />
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
                        <a href="https://mojavestud.io/plugins/loading" target="_blank" rel="noopener noreferrer">mojavestud.io/plugins/loading</a>
                    </p>
                </footer>
            </main>
        )
    }

    return (
        <main className={`pluginRoot ${themeClass}`}>
            <header className="pluginHeader">
                <SettingsPopover
                    email={authSnapshot?.email}
                    projectName={activeProjectName}
                    onSignOut={handleSignOut}
                />
            </header>
            <section className="builderHero builderHero--previewOnly">
                <div className="builderHero-preview previewPanel previewPanel--elevated">
                    <LoadingPreview controls={loadingControls} width={heroPreviewWidth} height={heroPreviewHeight} />
                </div>
            </section>
            <hr className="framer-divider" />
            <section className="pluginBody builderBody">
                <article className="settingsPanel">
                    <section className="loadingSettings">
                        <SettingsGroup 
                            title="Gate Behavior" 
                            icon={<Barricade size={18} weight="duotone" />}
                            open={openSettingsGroup === "gate"}
                            onToggle={() => setOpenSettingsGroup(openSettingsGroup === "gate" ? null : "gate")}
                        >
                            <div className="settingsRow settingsRow--triple">
                                <label>
                                    Minimum
                                    <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        value={builder.controls.minSeconds}
                                        onChange={(event) => updateControls("minSeconds", Number(event.target.value))}
                                    />
                                </label>
                                <label>
                                    Timeout
                                    <input
                                        type="number"
                                        min={1}
                                        max={60}
                                        step={1}
                                        value={builder.controls.timeoutSeconds}
                                        onChange={(event) => updateControls("timeoutSeconds", Number(event.target.value))}
                                    />
                                </label>
                                <label className="inputWithSuffix">
                                    Finish Delay
                                    <div className="inputSuffix">
                                        <input
                                            type="number"
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            value={builder.controls.loadBar.finishDelay}
                                            onChange={(event) =>
                                                updateLoadBar({ finishDelay: Number(event.target.value) })
                                            }
                                        />
                                        <span className="suffix">s</span>
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
                                Run once per session
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
                            <label>
                                Complete Variant (optional)
                                <input
                                    type="text"
                                    value={builder.controls.completeVariant}
                                    onChange={(event) => updateControls("completeVariant", event.target.value)}
                                    placeholder="ready"
                                />
                            </label>
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={builder.controls.runInPreview}
                                    onChange={(event) => updateControls("runInPreview", event.target.checked)}
                                />
                                Run inside preview
                            </label>
                        </SettingsGroup>
                        <SettingsGroup 
                            title="Progress Animation" 
                            icon={<SpinnerGap size={18} weight="duotone" />}
                            open={openSettingsGroup === "progress"}
                            onToggle={() => setOpenSettingsGroup(openSettingsGroup === "progress" ? null : "progress")}
                        >
                            <div className="settingsRow">
                                <label>
                                    Style
                                    <select
                                        value={builder.controls.loadBar.animationStyle}
                                        onChange={(event) => updateLoadBar({ animationStyle: event.target.value as "bar" | "circle" | "text" })}
                                    >
                                        <option value="bar">Bar</option>
                                        <option value="circle">Circle</option>
                                        <option value="text">Text Only</option>
                                    </select>
                                </label>
                                <label>
                                    Fill Style
                                    <select
                                        value={builder.controls.loadBar.fillStyle}
                                        onChange={(event) => updateLoadBar({ fillStyle: event.target.value as "solid" | "lines" })}
                                    >
                                        <option value="solid">Solid</option>
                                        <option value="lines">Lines</option>
                                    </select>
                                </label>
                            </div>
                            {builder.controls.loadBar.animationStyle !== "text" && (
                                <div className="settingsRow">
                                    {builder.controls.loadBar.fillStyle === "lines" && (
                                        <label>
                                            Line Width
                                            <input
                                                type="number"
                                                min={1}
                                                max={20}
                                                step={0.5}
                                                value={builder.controls.loadBar.lineWidth}
                                                onChange={(event) => updateLoadBar({ lineWidth: Number(event.target.value) })}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}
                            {builder.controls.loadBar.animationStyle === "circle" && (
                                <>
                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={builder.controls.loadBar.perpetual}
                                            onChange={(event) => updateLoadBar({ perpetual: event.target.checked })}
                                        />
                                        Perpetual Mode
                                    </label>
                                    {builder.controls.loadBar.perpetual && (
                                        <label>
                                            Gap Between Animations (seconds)
                                            <input
                                                type="number"
                                                min={0}
                                                max={5}
                                                step={0.1}
                                                value={builder.controls.loadBar.perpetualGap}
                                                onChange={(event) => updateLoadBar({ perpetualGap: Number(event.target.value) })}
                                            />
                                        </label>
                                    )}
                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={builder.controls.loadBar.startAtLabel}
                                            onChange={(event) => updateLoadBar({ startAtLabel: event.target.checked })}
                                        />
                                        Start at label
                                    </label>
                                </>
                                )}
                            {builder.controls.loadBar.animationStyle !== "text" && (
                                <>
                                    <div className="settingsRow">
                                        <label>
                                            Bar Color
                                            <input
                                                type="color"
                                                value={builder.controls.loadBar.barColor}
                                                onChange={(event) => updateLoadBar({ barColor: event.target.value })}
                                            />
                                        </label>
                                        {builder.controls.loadBar.animationStyle === "bar" && (
                                            <label>
                                                Radius
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={999}
                                                    value={builder.controls.loadBar.barRadius}
                                                    onChange={(event) => updateLoadBar({ barRadius: Number(event.target.value) })}
                                                />
                                            </label>
                                        )}
                                    </div>
                                    <div className="settingsRow">
                                        <label className="checkbox">
                                            <input
                                                type="checkbox"
                                                checked={builder.controls.loadBar.showTrack}
                                                onChange={(event) => updateLoadBar({ showTrack: event.target.checked })}
                                            />
                                            Show Track
                                        </label>
                                    </div>
                                    {builder.controls.loadBar.showTrack && (
                                        <div className="settingsRow">
                                            <label>
                                                Thickness
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    step={0.5}
                                                    value={builder.controls.loadBar.trackThickness}
                                                    onChange={(event) =>
                                                        updateLoadBar({ trackThickness: Number(event.target.value) })
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Color
                                                <input
                                                    type="color"
                                                    value={builder.controls.loadBar.trackColor}
                                                    onChange={(event) => updateLoadBar({ trackColor: event.target.value })}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </>
                            )}
                            {builder.controls.loadBar.animationStyle === "bar" && (
                                <>
                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={builder.controls.loadBar.showBorder}
                                            onChange={(event) => updateLoadBar({ showBorder: event.target.checked })}
                                        />
                                        Show border
                                    </label>
                                    {builder.controls.loadBar.showBorder && (
                                        <div className="settingsRow">
                                            <label>
                                                Thickness
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={12}
                                                    value={builder.controls.loadBar.borderWidth}
                                                    onChange={(event) =>
                                                        updateLoadBar({ borderWidth: Number(event.target.value) })
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Color
                                                <input
                                                    type="color"
                                                    value={builder.controls.loadBar.borderColor}
                                                    onChange={(event) => updateLoadBar({ borderColor: event.target.value })}
                                                />
                                            </label>
                                        </div>
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
                                <label className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={builder.controls.loadBar.showLabel}
                                        onChange={(event) => updateLoadBar({ showLabel: event.target.checked })}
                                    />
                                    Show label
                                </label>
                                {builder.controls.loadBar.showLabel && (
                                    <label>
                                        Loading Text
                                        <input
                                            type="text"
                                            value={builder.controls.loadBar.labelText}
                                            onChange={(event) => updateLoadBar({ labelText: event.target.value })}
                                            placeholder="Loading"
                                        />
                                    </label>
                                )}
                            {builder.controls.loadBar.showLabel && (
                                <>
                                    <div className="settingsRow">
                                        <label>
                                            Color
                                            <input
                                                type="color"
                                                value={builder.controls.loadBar.labelColor}
                                                onChange={(event) => updateLoadBar({ labelColor: event.target.value })}
                                            />
                                        </label>
                                        <label>
                                            Weight
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
                                                <input
                                                    type="text"
                                                    value={builder.controls.loadBar.labelFontWeight}
                                                    onChange={(event) =>
                                                        updateLoadBar({
                                                            labelFontWeight: event.target.value,
                                                            labelFont: {
                                                                ...(builder.controls.loadBar.labelFont || {}),
                                                                fontWeight: event.target.value,
                                                            },
                                                        })
                                                    }
                                                />
                                            )}
                                        </label>
                                    </div>
                                    <div className="settingsRow">
                                        <label>
                                            Font
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
                                            Font Size
                                            <input
                                                type="number"
                                                min={8}
                                                max={24}
                                                value={builder.controls.loadBar.labelFontSize}
                                                onChange={(event) =>
                                                    updateLoadBar({ labelFontSize: Number(event.target.value) })
                                                }
                                            />
                                        </label>
                                    </div>
                                    {fontFamilyOptions.length > 0 && (
                                        <>
                                            {usingProjectFont && availableStyles.length > 1 && (
                                                <label>
                                                    Style
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
                                    <div className="alignmentRow">
                                        <label>
                                            Align
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
                                            Placement
                                            <select
                                                value={builder.controls.loadBar.labelPlacement}
                                                onChange={(event) =>
                                                    updateLoadBar({ labelPlacement: event.target.value as LabelPlacement })
                                                }
                                            >
                                                <option value="inside">Inside</option>
                                                <option value="outside">Outside</option>
                                                {builder.controls.loadBar.animationStyle === "circle" && (
                                                    <option value="inline">Inline</option>
                                                )}
                                            </select>
                                        </label>
                                        {(builder.controls.loadBar.labelPlacement === "outside" ||
                                            (builder.controls.loadBar.labelPlacement === "inline" &&
                                                builder.controls.loadBar.animationStyle === "circle")) && (
                                            <label>
                                                Vertical Align
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
                                        )}
                                    </div>
                                    
                                </>
                            )}
                        </SettingsGroup>
                    </section>
                </article>
            </section>
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
}

function SettingsPopover({ email, projectName, onSignOut }: SettingsPopoverProps) {
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

    const measurePanelPosition = useCallback(() => {
        if (!triggerRef.current || typeof window === "undefined") return
        const rect = triggerRef.current.getBoundingClientRect()
        const panelWidth = 250
        const safeLeft = Math.min(window.innerWidth - panelWidth - 12, Math.max(12, rect.right - panelWidth))
        const top = rect.bottom + 10
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
    const resetTimeoutRef = useRef<number | null>(null)
    const [outsideLabelEl, setOutsideLabelEl] = useState<HTMLDivElement | null>(null)
    const [outsideLabelSize, setOutsideLabelSize] = useState({ width: 0, height: 0 })
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const [containerWidth, setContainerWidth] = useState<number | null>(null)

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
        ? baseLabelText
            ? `${baseLabelText} ${formatPercent(labelProgressValue)}`
            : formatPercent(labelProgressValue)
        : null
    const labelInside = Boolean(label) && effectiveLabelPlacement === "inside"
    const labelOutside = Boolean(label) && effectiveLabelPlacement === "outside" && loadBar.animationStyle !== "text"
    const labelInline = Boolean(label) && loadBar.animationStyle === "circle" && effectiveLabelPlacement === "inline"

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

    const labelSpacing = 6
    const outsidePadding = { top: 0, right: 0, bottom: 0, left: 0 }
    if (labelOutside && label) {
        if (loadBar.labelOutsideDirection === "top") {
            outsidePadding.top = outsideLabelSize.height + labelSpacing
        } else if (loadBar.labelOutsideDirection === "bottom") {
            outsidePadding.bottom = outsideLabelSize.height + labelSpacing
        } else {
            const horizontalSpace = outsideLabelSize.width + labelSpacing
            const anchor = loadBar.labelPosition === "center" ? "right" : loadBar.labelPosition
            if (anchor === "left") outsidePadding.left = horizontalSpace
            else outsidePadding.right = horizontalSpace
        }
    }

    const baseWidth = Math.max(1, width)
    const baseHeight = Math.max(1, height)
    const availableWidth = containerWidth ?? baseWidth
    const scale = baseWidth > 0 ? Math.min(1, availableWidth / baseWidth) : 1
    const scaledWidth = baseWidth * scale
    const scaledHeight = baseHeight * scale

    const clampedWidth = baseWidth
    const clampedHeight = baseHeight
    const contentWidth = Math.max(0, clampedWidth - outsidePadding.left - outsidePadding.right)
    const contentHeight = Math.max(0, clampedHeight - outsidePadding.top - outsidePadding.bottom)

    const insideLabelTransforms: string[] = ["translateY(-50%)"]
    const insideLabelStyle: CSSProperties = {
        ...baseLabelStyle,
        position: "absolute",
        top: "50%",
    }
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
    if (insideLabelTransforms.length > 0) {
        insideLabelStyle.transform = insideLabelTransforms.join(" ")
    }

    const outsideLabelTransforms: string[] = []
    const outsideLabelStyle: CSSProperties = {
        ...baseLabelStyle,
        position: "absolute",
    }
    if (loadBar.labelOutsideDirection === "top") {
        outsideLabelStyle.top = 0
    } else if (loadBar.labelOutsideDirection === "center") {
        outsideLabelStyle.top = "50%"
        outsideLabelTransforms.push("translateY(-50%)")
    } else {
        outsideLabelStyle.bottom = 0
    }
    const outsideHorizontal =
        loadBar.labelOutsideDirection === "center" && loadBar.labelPosition === "center"
            ? "right"
            : loadBar.labelPosition
    if (outsideHorizontal === "left") {
        outsideLabelStyle.left = 0
    } else if (outsideHorizontal === "center") {
        outsideLabelStyle.left = "50%"
        outsideLabelTransforms.push("translateX(-50%)")
    } else {
        outsideLabelStyle.right = 0
    }
    if (outsideLabelTransforms.length > 0) {
        outsideLabelStyle.transform = outsideLabelTransforms.join(" ")
    }

    const rootStyle: CSSProperties = {
        width: clampedWidth,
        height: clampedHeight,
        minHeight: clampedHeight,
        position: "relative",
        boxSizing: "border-box",
        paddingTop: outsidePadding.top,
        paddingRight: outsidePadding.right,
        paddingBottom: outsidePadding.bottom,
        paddingLeft: outsidePadding.left,
        margin: "0 auto",
    }

    const contentWrapperStyle: CSSProperties = {
        width: contentWidth,
        height: contentHeight,
        position: "relative",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    const progressValue = Math.max(0, Math.min(1, progress / 100))
    const effectiveProgress =
        loadBar.animationStyle === "circle" && loadBar.perpetual ? perpetualProgress : progressValue

    const renderContent = () => {
        const trackBackground = loadBar.showTrack ? loadBar.trackColor : "transparent"
        if (loadBar.animationStyle === "text") {
            return (
                <div
                    className="previewTextOnly"
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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

        if (loadBar.animationStyle === "circle") {
            const baseCircleSize = Math.max(0, Math.min(contentWidth, contentHeight))
            const circleBoxSize = Math.max(0, baseCircleSize - 15)
            const circleSize = circleBoxSize * 0.7
            const circleRadius = Math.max(0, circleSize / 2 - (loadBar.showBorder ? loadBar.borderWidth : 0))
            const strokeWidth = loadBar.fillStyle === "lines" ? loadBar.lineWidth : loadBar.showBorder ? loadBar.borderWidth : 0
            const circumference = 2 * Math.PI * circleRadius
            const circleOffsetX = (contentWidth - circleSize) / 2
            const circleOffsetY = (contentHeight - circleSize) / 2
            const circleLabelInset = Math.min(16, Math.max(6, circleSize * 0.08))
            const labelAngle = getInlineAngle(loadBar.labelPosition, loadBar.labelOutsideDirection)
            const rotationDeg = loadBar.startAtLabel ? labelAngle : -90
            const gapDegrees = 12
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
                        justifyContent: "center",
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
                                strokeWidth={strokeWidth || 2}
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
                                strokeWidth={strokeWidth || 2}
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
                                alignItems: "center",
                                justifyContent: mapLabelAlign(loadBar.labelPosition),
                                pointerEvents: "none",
                                paddingLeft: loadBar.labelPosition === "left" ? circleLabelInset : 0,
                                paddingRight: loadBar.labelPosition === "right" ? circleLabelInset : 0,
                            }}
                        >
                            <div className="previewLabel" style={{ ...baseLabelStyle, position: "relative" }}>
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
                                return (
                                    <div
                                        className="previewLabel"
                                        style={{
                                            ...baseLabelStyle,
                                            position: "absolute",
                                            left: lx,
                                            top: ly,
                                            transform: "translate(-50%, -50%)",
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
            return (
                <div
                    className="previewBar previewBar--matchButton"
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: loadBar.barRadius,
                        border: loadBar.showBorder ? `${loadBar.borderWidth}px solid ${loadBar.borderColor}` : "none",
                        background: trackBackground,
                        position: "relative",
                        overflow: "hidden",
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
                    {labelInside && label && (
                        <div className="previewLabel previewLabel--absolute" style={insideLabelStyle}>
                            {label}
                        </div>
                    )}
                </div>
            )
        }

        const numLines = Math.floor(progressValue * 20)
        return (
            <div
                className="previewBar previewBar--matchButton"
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: loadBar.barRadius,
                    border: loadBar.showBorder ? `${loadBar.borderWidth}px solid ${loadBar.borderColor}` : "none",
                    background: trackBackground,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    gap: 2,
                    padding: 2,
                }}
            >
                {Array.from({ length: 20 }).map((_, i) => {
                    const shouldShow = i < numLines
                    return (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: "100%",
                                    background: shouldShow ? loadBar.barColor : trackBackground,
                                    borderRadius: 2,
                                    opacity: shouldShow ? 1 : loadBar.showTrack ? 0.3 : 0,
                                transition: "all 0.2s ease",
                            }}
                        />
                    )
                })}
                {labelInside && label && (
                    <div className="previewLabel previewLabel--absolute" style={insideLabelStyle}>
                        {label}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            ref={wrapperRef}
            style={{ width: "100%", display: "flex", justifyContent: "center", fontSize: 0, lineHeight: 0 }}
        >
            <div
                style={{
                    width: scaledWidth,
                    height: scaledHeight,
                    margin: "0 auto",
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
                        {labelOutside && label && (
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
