/**
 * Loading Gate Framer Plugin
 * - Authenticates via Google Apps Script (same flow as Mojave Globe reference)
 * - Provides a two-step flow: Start page (license) → builder interface
 * - Inserts the local Loading code component via its compiled module URL
 */

import { framer } from "framer-plugin"
import { useState, useEffect, useMemo, useCallback, FormEvent, ReactNode } from "react"
import "./App.css"

type ThemeMode = "light" | "dark"
type ThemeTokens = Record<string, string>

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
    "bg-window": "linear-gradient(180deg, #f8f6ff 0%, #ffffff 60%)",
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
    "bg-window": "linear-gradient(180deg, #13111b 0%, #0c0b13 60%)",
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

type WaitMode = "WindowLoad" | "FontsAndImages"
type LabelPosition = "left" | "center" | "right"
type LabelPlacement = "inside" | "outside"
type LabelOutsideDirection = "top" | "bottom"

type LoadBarControls = {
    showProgressBar: boolean
    barRadius: number
    barColor: string
    trackColor: string
    showLabel: boolean
    labelColor: string
    labelFontSize: number
    labelFontFamily: string
    labelFontWeight: string | number
    labelPosition: LabelPosition
    labelPlacement: LabelPlacement
    labelOutsideDirection: LabelOutsideDirection
    waitBarFinish: boolean
    finishHoldSeconds: number
    showBorder: boolean
    borderWidth: number
    borderColor: string
}

type LoadingControls = {
    waitMode: WaitMode
    imageScopeSelector: string
    includeBackgrounds: boolean
    quietSeconds: number
    minSeconds: number
    timeoutSeconds: number
    oncePerSession: boolean
    runInPreview: boolean
    hideWhenComplete: boolean
    customReadySelector: string
    customReadyEvent: string
    loadBar: LoadBarControls
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
    showProgressBar: true,
    barRadius: 999,
    barColor: "#854FFF",
    trackColor: "rgba(0,0,0,.12)",
    showLabel: true,
    labelColor: "#202020",
    labelFontSize: 12,
    labelFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    labelFontWeight: 600,
    labelPosition: "right",
    labelPlacement: "inside",
    labelOutsideDirection: "bottom",
    waitBarFinish: true,
    finishHoldSeconds: 0.12,
    showBorder: false,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,.24)",
}

const createDefaultControls = (): LoadingControls => ({
    waitMode: "FontsAndImages",
    imageScopeSelector: "",
    includeBackgrounds: true,
    quietSeconds: 0.6,
    minSeconds: 0.6,
    timeoutSeconds: 12,
    oncePerSession: false,
    runInPreview: true,
    hideWhenComplete: false,
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

const AUTH_STORAGE_ID = "loading_gate_auth_v1"
const AUTH_JSONP_ENDPOINT =
    getEnv("VITE_LOADING_JSONP_ENDPOINT") ||
    "https://script.google.com/macros/s/AKfycbyZGWKLqUmZWBrBk-kUmndlLyvWzbDaz62O6OpsApKQ-lbWVjtZIED-aivmDQOht6Fs/exec"
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000
const SESSION_LOCAL_KEY = "loading_gate_session"
const SESSION_FORCE_FRESH_KEY = "loading_gate_force_fresh"
const LEGACY_SESSION_KEY = "loading_gate_legacy_session"
const __isLocal = typeof window !== "undefined" && window.location?.hostname === "localhost"

let pluginDataPermissionWarningShown = false

const setPluginDataSafely = async (key: string, value: string | null, context?: string): Promise<boolean> => {
    let allowed = false
    try {
        allowed = framer.isAllowedTo("setPluginData")
    } catch (error) {
        if (__isLocal && !pluginDataPermissionWarningShown) {
            console.warn("[Loading Plugin] Plugin data permission check failed", error)
            pluginDataPermissionWarningShown = true
        }
        return false
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

const readUserScopedPluginData = async (key: string): Promise<string | null> => {
    try {
        const user = await framer.getCurrentUser()
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
        const user = await framer.getCurrentUser()
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
        const user = await framer.getCurrentUser()
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
            const user = await framer.getCurrentUser()
            framerUserId = user?.id ?? ""
        } catch {
            framerUserId = ""
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
            resolve(res)
        }

        script.onerror = () => {
            if (timeoutId) window.clearTimeout(timeoutId)
            cleanup(script)
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
        script.src = url
        document.head.appendChild(script)
    })
}

const formatPercent = (value: number) => `${Math.min(99, Math.max(0, value)).toFixed(0)}%`

export function App() {
    const initialSnapshot = loadStoredAuthSnapshot()
    const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot | null>(initialSnapshot)
    const [authStatus, setAuthStatus] = useState<AuthStatus>(initialSnapshot ? "authorized" : "unknown")
    const [projectName, setProjectName] = useState<string | null>(initialSnapshot?.projectName ?? null)
    const [authEmail, setAuthEmail] = useState(initialSnapshot?.email ?? "")
    const [authReceipt, setAuthReceipt] = useState("0000-0000")
    const [authError, setAuthError] = useState<string | null>(null)
    const [authLoading, setAuthLoading] = useState(false)
    const [initializing, setInitializing] = useState(!initialSnapshot)

    const themeMode = useFramerTheme()

    const [builder, setBuilder] = useState<BuilderState>(() => createDefaultBuilderState())

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
        await clearStoredSession()
        setAuthSnapshot(null)
        setAuthStatus("unknown")
        setProjectName(null)
        setAuthError(null)
        setAuthLicense("")
        setAuthEmail("")
    }, [])

    const sanitizeReceipt = useCallback((value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 8)
        const padded = digits.padEnd(8, "0")
        return `${padded.slice(0, 4)}-${padded.slice(4, 8)}`
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
                    setAuthError(precheck?.error || "License is not valid for this plugin.")
                    setAuthStatus("denied")
                    return
                }

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
                    setAuthError("We verified your license, but need your Framer user id to bind it. Please sign into Framer and try again.")
                    setAuthStatus("denied")
                    return
                }

                setAuthError(response?.error || "Unexpected response. Please contact support.")
                setAuthStatus("denied")
            } catch (error) {
                setAuthError("Verification failed. Please check your internet connection and try again.")
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
                width: builder.width,
                height: builder.height,
            })

            if (!fallbackNode) return false

            const loadBar = loadingControls.loadBar
            const node: any = fallbackNode

            if (typeof node.setAttributes === "function") {
                await node.setAttributes({
                    name: "Loading Gate Placeholder",
                    width: builder.width,
                    height: builder.height,
                    cornerRadius: loadBar.barRadius,
                    fills: [
                        {
                            type: "solid",
                            color: loadBar.trackColor,
                        },
                    ],
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
                node.width = builder.width
                node.height = builder.height
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
    }, [builder.height, builder.width, loadingControls])

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
            width: `${builder.width}px`,
            height: `${builder.height}px`,
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
                    `⚠️ Inserted a frame placeholder (${builder.width}×${builder.height}) because component permissions are restricted.`,
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
    }, [COMPONENT_URL, builder.height, builder.width, loadingControls, tryFallbackInsert])

    if (!readyForApp) {
        return (
            <main className={`loadingStart ${themeClass}`}>
                <div className="loadingStart-preview">
                    <LoadingPreview controls={loadingControls} width={320} height={48} />
                    <p className="loadingStart-subtitle">Drop-in gate to keep your page polished while assets initialize.</p>
                </div>
                <div className="loadingCard">
                    <h1>Sign In</h1>
                    <p className="loadingCard-subtitle">Verify your Loading Gate license to continue.</p>
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
                </div>
                <footer className="loadingFooter">
                    <p>
                        © Mojave Studio LLC — Custom Automated Web Design Experts
                        <br />
                        mojavestud.io
                    </p>
                </footer>
            </main>
        )
    }

    return (
        <main className={`loadingApp ${themeClass}`}>
            <section className="loadingPreviewSection">
                <div className="loadingPreviewHeader">
                    <div>
                        <h1>Loading Gate</h1>
                        <p>Configure the preloader gate before inserting it into your page.</p>
                    </div>
                    <div className="loadingPreviewActions">
                        {projectName && <span className="badge">{projectName}</span>}
                        <button type="button" className="ghost small" onClick={handleResetBuilder}>
                            Reset
                        </button>
                        <button type="button" className="primary" onClick={() => void handleInsert()}>
                            Insert
                        </button>
                    </div>
                </div>
                <div className="loadingPreviewCanvas">
                    <LoadingPreview controls={loadingControls} width={builder.width} height={builder.height} />
                </div>
                <div className="loadingSizeRow">
                    <label htmlFor="componentWidth">
                        Width (px)
                        <input
                            id="componentWidth"
                            type="number"
                            inputMode="numeric"
                            value={builder.width}
                            onChange={(event) => handleDimensionsChange("width", event.target.value)}
                        />
                    </label>
                    <label htmlFor="componentHeight">
                        Height (px)
                        <input
                            id="componentHeight"
                            type="number"
                            inputMode="numeric"
                            value={builder.height}
                            onChange={(event) => handleDimensionsChange("height", event.target.value)}
                        />
                    </label>
                </div>
            </section>
            <section className="loadingSettings">
                <SettingsGroup title="Gate Behavior">
                    <label>
                        Wait Mode
                        <select
                            value={builder.controls.waitMode}
                            onChange={(event) => updateControls("waitMode", event.target.value as WaitMode)}
                        >
                            <option value="FontsAndImages">Fonts + Images</option>
                            <option value="WindowLoad">Window load</option>
                        </select>
                    </label>
                    {builder.controls.waitMode === "FontsAndImages" && (
                        <>
                            <label>
                                Image Scope (CSS selector)
                                <input
                                    type="text"
                                    value={builder.controls.imageScopeSelector}
                                    onChange={(event) => updateControls("imageScopeSelector", event.target.value)}
                                    placeholder="#hero, .aboveFold"
                                />
                            </label>
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={builder.controls.includeBackgrounds}
                                    onChange={(event) => updateControls("includeBackgrounds", event.target.checked)}
                                />
                                Include background images
                            </label>
                        </>
                    )}
                    <label>
                        Quiet Seconds
                        <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={builder.controls.quietSeconds}
                            onChange={(event) => updateControls("quietSeconds", Number(event.target.value))}
                        />
                    </label>
                    <label>
                        Minimum Seconds
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
                        Timeout Seconds
                        <input
                            type="number"
                            min={1}
                            max={60}
                            step={1}
                            value={builder.controls.timeoutSeconds}
                            onChange={(event) => updateControls("timeoutSeconds", Number(event.target.value))}
                        />
                    </label>
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={builder.controls.oncePerSession}
                            onChange={(event) => updateControls("oncePerSession", event.target.checked)}
                        />
                        Only run once per session
                    </label>
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={builder.controls.hideWhenComplete}
                            onChange={(event) => updateControls("hideWhenComplete", event.target.checked)}
                        />
                        Hide component when complete
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

                <SettingsGroup title="Progress Bar">
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={builder.controls.loadBar.showProgressBar}
                            onChange={(event) => updateLoadBar({ showProgressBar: event.target.checked })}
                        />
                        Show progress bar
                    </label>
                    {builder.controls.loadBar.showProgressBar && (
                        <>
                            <label>
                                Bar Color
                                <input
                                    type="color"
                                    value={builder.controls.loadBar.barColor}
                                    onChange={(event) => updateLoadBar({ barColor: event.target.value })}
                                />
                            </label>
                            <label>
                                Track Color
                                <input
                                    type="color"
                                    value={builder.controls.loadBar.trackColor}
                                    onChange={(event) => updateLoadBar({ trackColor: event.target.value })}
                                />
                            </label>
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
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={builder.controls.loadBar.waitBarFinish}
                                    onChange={(event) => updateLoadBar({ waitBarFinish: event.target.checked })}
                                />
                                Wait for animation to finish
                            </label>
                            {builder.controls.loadBar.waitBarFinish && (
                                <label>
                                    Finish Hold (seconds)
                                    <input
                                        type="number"
                                        min={0}
                                        max={2}
                                        step={0.05}
                                        value={builder.controls.loadBar.finishHoldSeconds}
                                        onChange={(event) =>
                                            updateLoadBar({ finishHoldSeconds: Number(event.target.value) })
                                        }
                                    />
                                </label>
                            )}
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={builder.controls.loadBar.showBorder}
                                    onChange={(event) => updateLoadBar({ showBorder: event.target.checked })}
                                />
                                Show border
                            </label>
                            {builder.controls.loadBar.showBorder && (
                                <>
                                    <label>
                                        Border Width
                                        <input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={builder.controls.loadBar.borderWidth}
                                            onChange={(event) => updateLoadBar({ borderWidth: Number(event.target.value) })}
                                        />
                                    </label>
                                    <label>
                                        Border Color
                                        <input
                                            type="color"
                                            value={builder.controls.loadBar.borderColor}
                                            onChange={(event) => updateLoadBar({ borderColor: event.target.value })}
                                        />
                                    </label>
                                </>
                            )}
                        </>
                    )}
                </SettingsGroup>

                <SettingsGroup title="Label">
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={builder.controls.loadBar.showLabel}
                            onChange={(event) => updateLoadBar({ showLabel: event.target.checked })}
                        />
                        Show label
                    </label>
                    {builder.controls.loadBar.showLabel && (
                        <>
                            <label>
                                Label Color
                                <input
                                    type="color"
                                    value={builder.controls.loadBar.labelColor}
                                    onChange={(event) => updateLoadBar({ labelColor: event.target.value })}
                                />
                            </label>
                            <label>
                                Font Size
                                <input
                                    type="number"
                                    min={8}
                                    max={24}
                                    value={builder.controls.loadBar.labelFontSize}
                                    onChange={(event) => updateLoadBar({ labelFontSize: Number(event.target.value) })}
                                />
                            </label>
                            <label>
                                Font Weight
                                <input
                                    type="text"
                                    value={builder.controls.loadBar.labelFontWeight}
                                    onChange={(event) => updateLoadBar({ labelFontWeight: event.target.value })}
                                />
                            </label>
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
                                </select>
                            </label>
                            {builder.controls.loadBar.labelPlacement === "outside" && (
                                <label>
                                    Outside Align
                                    <select
                                        value={builder.controls.loadBar.labelOutsideDirection}
                                        onChange={(event) =>
                                            updateLoadBar({
                                                labelOutsideDirection: event.target.value as LabelOutsideDirection,
                                            })
                                        }
                                    >
                                        <option value="top">Top</option>
                                        <option value="bottom">Bottom</option>
                                    </select>
                                </label>
                            )}
                        </>
                    )}
                </SettingsGroup>

                <SettingsGroup title="Custom Ready Signal">
                    <label>
                        Ready Selector
                        <input
                            type="text"
                            value={builder.controls.customReadySelector}
                            onChange={(event) => updateControls("customReadySelector", event.target.value)}
                            placeholder=".hero"
                        />
                    </label>
                    <label>
                        Ready Event
                        <input
                            type="text"
                            value={builder.controls.customReadyEvent}
                            onChange={(event) => updateControls("customReadyEvent", event.target.value)}
                            placeholder="load"
                        />
                    </label>
                    <div className="loadingSettingsFooter">
                        <div className="accountBlock">
                            <p>
                                Signed in as <strong>{authSnapshot?.email}</strong>
                            </p>
                            <button type="button" className="ghost small" onClick={() => void handleSignOut()}>
                                Sign out
                            </button>
                        </div>
                    </div>
                </SettingsGroup>
            </section>
            <footer className="loadingFooter loadingFooter--main">
                <p>
                    © Mojave Studio LLC — Custom Automated Web Design Experts
                    <br />
                    mojavestud.io
                </p>
            </footer>
        </main>
    )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="settingsGroup">
            <h2>{title}</h2>
            <div className="settingsGrid">{children}</div>
        </div>
    )
}

function LoadingPreview({ controls, width, height }: { controls: LoadingControls; width: number; height: number }) {
    const [progress, setProgress] = useState(12)

    useEffect(() => {
        const id = window.setInterval(() => {
            setProgress((prev) => {
                const next = prev + 5 + Math.random() * 12
                return next >= 100 ? 5 : next
            })
        }, 900)
        return () => window.clearInterval(id)
    }, [])

    const loadBar = controls.loadBar
    const label = loadBar.showLabel ? `Loading ${formatPercent(progress)}` : null
    const labelInside = loadBar.labelPlacement === "inside"
    const outsideTop = !labelInside && loadBar.labelOutsideDirection === "top"
    const outsideBottom = !labelInside && loadBar.labelOutsideDirection === "bottom"

    const maxPreviewWidth = 290
    const scale = width > maxPreviewWidth ? maxPreviewWidth / width : 1
    const displayWidth = Math.round(width * scale)
    const displayHeight = Math.max(18, Math.round(height * scale))
    const scaledRadius = Math.max(0, loadBar.barRadius * scale)

    return (
        <div className="previewRoot" style={{ width: displayWidth, minHeight: displayHeight }}>
            {label && outsideTop && (
                <div
                    className="previewLabel"
                    style={{
                        justifyContent: mapLabelAlign(loadBar.labelPosition),
                        color: loadBar.labelColor,
                        fontSize: loadBar.labelFontSize,
                        fontFamily: loadBar.labelFontFamily,
                        fontWeight: loadBar.labelFontWeight,
                    }}
                >
                    {label}
                </div>
            )}
            <div
                className="previewBar"
                style={{
                    height: displayHeight,
                    borderRadius: scaledRadius,
                    border: loadBar.showBorder ? `${loadBar.borderWidth}px solid ${loadBar.borderColor}` : "none",
                    background: loadBar.trackColor,
                }}
            >
                {loadBar.showProgressBar && (
                    <div
                        className="previewFill"
                        style={{
                            width: `${progress}%`,
                            borderRadius: scaledRadius,
                            background: loadBar.barColor,
                        }}
                    />
                )}
                {label && labelInside && (
                    <div
                        className="previewLabel previewLabel--absolute"
                        style={{
                            color: loadBar.labelColor,
                            fontSize: loadBar.labelFontSize,
                            fontFamily: loadBar.labelFontFamily,
                            fontWeight: loadBar.labelFontWeight,
                            justifyContent: mapLabelAlign(loadBar.labelPosition),
                        }}
                    >
                        {label}
                    </div>
                )}
            </div>
            {label && outsideBottom && (
                <div
                    className="previewLabel"
                    style={{
                        justifyContent: mapLabelAlign(loadBar.labelPosition),
                        color: loadBar.labelColor,
                        fontSize: loadBar.labelFontSize,
                        fontFamily: loadBar.labelFontFamily,
                        fontWeight: loadBar.labelFontWeight,
                    }}
                >
                    {label}
                </div>
            )}
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

export default App
