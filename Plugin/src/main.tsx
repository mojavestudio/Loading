// Suppress framer-plugin initialization errors and known harmless warnings - must be before any imports
// This runs in the plugin's iframe context and suppresses warnings from our code and dependencies
if (typeof window !== "undefined") {
    // Function to check if current user is jess@mojavestud.io
    const isJessEmail = async (): Promise<boolean> => {
        try {
            // Try to get stored auth snapshot
            const raw = window.localStorage.getItem("loading_auth_snapshot_v1")
            if (!raw) return false
            const snapshot = JSON.parse(raw)
            const email = typeof snapshot?.email === "string" ? snapshot.email : ""
            return email === "jess@mojavestud.io"
        } catch {
            return false
        }
    }
    
    // Suppress warnings as early as possible, before any code runs
    const originalConsoleWarn = console.warn
    const originalConsoleError = console.error
    const originalConsoleInfo = console.info
    const originalConsoleLog = console.log
    
    // Override all console methods to filter known harmless warnings and check user email
    const shouldSuppress = (message: string): boolean => {
        return (
            message.includes("Invalid mode: null") || 
            message.includes("Unsupported plugin name in sheet") || 
            message.includes("Acessability") || 
            (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon")) ||
            message.includes("Unrecognized feature:") ||
            message.includes("ambient-light-sensor") ||
            message.includes("speaker") ||
            message.includes("vibrate") ||
            message.includes("'vr'") ||
            message.includes("vr'") ||
            message.includes("vr\"") ||
            message.includes("AhrefsAnalytics") ||
            message.includes("already initialized") ||
            message.includes("allowfullscreen") ||
            message.includes("will take precedence") ||
            message.includes("Multiple instances of Three.js") ||
            message.includes("Three.js")
        )
    }
    
    // Helper to check if we should log based on user email
    const shouldLog = async (): Promise<boolean> => {
        // Check if this is a Loading Plugin message
        return await isJessEmail()
    }
    
    // Async wrapper for console methods
    const createConsoleMethod = (original: typeof console.log) => {
        return async function(...args: unknown[]) {
            const message = args.join(" ")
            if (typeof message === "string" && shouldSuppress(message)) {
                return
            }
            // Only log Loading Plugin messages if user is jess@mojavestud.io
            if (typeof message === "string" && message.includes("[Loading Plugin]")) {
                const logAllowed = await shouldLog()
                if (!logAllowed) {
                    return
                }
            }
            original.apply(console, args)
        }
    }
    
    console.warn = createConsoleMethod(originalConsoleWarn)
    console.error = createConsoleMethod(originalConsoleError)
    console.info = createConsoleMethod(originalConsoleInfo)
    console.log = createConsoleMethod(originalConsoleLog)
    
interface ErrorEvent {
    message?: string
    error?: Error | string
    preventDefault(): void
    stopPropagation(): void
    stopImmediatePropagation(): void
}

    const suppressFramerError = (event: ErrorEvent) => {
        const message = event.message || String(event.error || "")
        if (typeof message === "string" && (
            message.includes("Invalid mode: null") || 
            message.includes("Unsupported plugin name in sheet") || 
            message.includes("Acessability") || 
            (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon")) ||
            message.includes("Unrecognized feature:") ||
            message.includes("ambient-light-sensor") ||
            message.includes("speaker") ||
            message.includes("vibrate") ||
            message.includes("'vr'") ||
            message.includes("vr'") ||
            message.includes("AhrefsAnalytics") ||
            message.includes("already initialized") ||
            message.includes("allowfullscreen") ||
            message.includes("will take precedence") ||
            message.includes("Multiple instances of Three.js")
        )) {
            event.preventDefault()
            event.stopPropagation()
            event.stopImmediatePropagation()
            return true
        }
        return false
    }
    
    window.addEventListener("error", suppressFramerError, true)
    window.addEventListener("unhandledrejection", (event) => {
        const message = String(event.reason || "")
        if (typeof message === "string" && (
            message.includes("Invalid mode: null") || 
            message.includes("Unsupported plugin name in sheet") || 
            message.includes("Acessability") || 
            (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon")) ||
            message.includes("Unrecognized feature:") ||
            message.includes("AhrefsAnalytics") ||
            message.includes("already initialized")
        )) {
            event.preventDefault()
        }
    }, true)
    
    // Suppress navigator.permissions checks to prevent unrecognized feature warnings
    // This prevents the browser from querying for unsupported permissions APIs
    if (navigator && typeof navigator.permissions !== "undefined") {
        const originalQuery = navigator.permissions.query
        navigator.permissions.query = async function(parameters) {
            // Return 'denied' for unsupported permission queries instead of throwing
            if (parameters.name && [
                'ambient-light-sensor',
                'speaker',
                'vibrate',
                'vr'
            ].includes(parameters.name)) {
                return Promise.resolve({ state: 'denied' } as PermissionStatus)
            }
            return originalQuery.call(navigator.permissions, parameters)
        }
    }
}

import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./globals.css"
import { framer } from "framer-plugin"

// Initialize framer UI
framer.showUI({
    width: 500,
    height: 800,  // Increased from 370 to 800 to ensure all content is visible
    minWidth: 500,
    minHeight: 600,  // Added minHeight to prevent the UI from being too small
    maxWidth: 500,
    resizable: true,  // Allow resizing for better UX
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
