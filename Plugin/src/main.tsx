// Suppress framer-plugin initialization errors in dev mode - must be before any imports
if (typeof window !== "undefined") {
    // Override console.error to suppress the specific error
    const originalConsoleError = console.error
    console.error = function(...args: unknown[]) {
        const message = args.join(" ")
        if (typeof message === "string" && (message.includes("Invalid mode: null") || message.includes("Unsupported plugin name in sheet") || message.includes("Acessability") || (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon")))) {
            // Suppress these specific errors
            return
        }
        originalConsoleError.apply(console, args)
    }
    
    // Override console.warn to suppress the specific error
    const originalConsoleWarn = console.warn
    console.warn = function(...args: unknown[]) {
        const message = args.join(" ")
        if (typeof message === "string" && (message.includes("Invalid mode: null") || message.includes("Unsupported plugin name in sheet") || message.includes("Acessability") || (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon")))) {
            // Suppress these specific errors
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
        if (typeof message === "string" && (message.includes("Invalid mode: null") || message.includes("Unsupported plugin name in sheet") || message.includes("Acessability") || (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon")))) {
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
        if (message.includes("Invalid mode: null") || message.includes("Unsupported plugin name in sheet") || message.includes("Acessability") || (message.includes("Supported:") && message.includes("Grid, Globe, Particles, Loading, Ribbon"))) {
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
