// Suppress framer-plugin initialization errors and known harmless warnings - must be before any imports
// This runs in the plugin's iframe context and suppresses warnings from our code and dependencies
if (typeof window !== "undefined") {
    // Suppress warnings as early as possible, before any code runs
    const originalConsoleWarn = console.warn
    const originalConsoleError = console.error
    const originalConsoleInfo = console.info
    const originalConsoleLog = console.log
    
    // Override all console methods to filter known harmless warnings
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
    
    console.warn = function(...args: unknown[]) {
        const message = args.join(" ")
        if (typeof message === "string" && shouldSuppress(message)) {
            return
        }
        originalConsoleWarn.apply(console, args)
    }
    
    console.error = function(...args: unknown[]) {
        const message = args.join(" ")
        if (typeof message === "string" && shouldSuppress(message)) {
            return
        }
        originalConsoleError.apply(console, args)
    }
    
    console.info = function(...args: unknown[]) {
        const message = args.join(" ")
        if (typeof message === "string" && shouldSuppress(message)) {
            return
        }
        originalConsoleInfo.apply(console, args)
    }
    
    console.log = function(...args: unknown[]) {
        const message = args.join(" ")
        if (typeof message === "string" && shouldSuppress(message)) {
            return
        }
        originalConsoleLog.apply(console, args)
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
                return Promise.resolve({ state: 'denied' as any })
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
