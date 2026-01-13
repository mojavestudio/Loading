// Suppress framer-plugin initialization errors and known harmless warnings - must be before any imports
if (typeof window !== "undefined") {
    // Override console.error to suppress known harmless warnings
    const originalConsoleError = console.error
    console.error = function(...args: unknown[]) {
        const message = args.join(" ")
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
            message.includes("Multiple instances of Three.js")
        )) {
            // Suppress these specific errors/warnings
            return
        }
        originalConsoleError.apply(console, args)
    }
    
    // Override console.warn to suppress known harmless warnings
    const originalConsoleWarn = console.warn
    console.warn = function(...args: unknown[]) {
        const message = args.join(" ")
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
            message.includes("AhrefsAnalytics script is already initialized") ||
            message.includes("AhrefsAnalytics") ||
            message.includes("Allow attribute will take precedence over 'allowfullscreen'") ||
            message.includes("allowfullscreen") ||
            message.includes("Multiple instances of Three.js")
        )) {
            // Suppress these specific warnings
            return
        }
        originalConsoleWarn.apply(console, args)
    }
    
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
            message.includes("allowfullscreen") ||
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
            message.includes("AhrefsAnalytics")
        )) {
            event.preventDefault()
        }
    }, true)
}

import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./globals.css"
import { framer } from "framer-plugin"

// Initialize framer UI
framer.showUI({
    width: 500,
    height: 370,
    minWidth: 500,
    maxWidth: 500,
    resizable: false,
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
