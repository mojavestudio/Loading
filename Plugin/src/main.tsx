// Suppress framer-plugin initialization errors in dev mode - must be before any imports
if (typeof window !== "undefined") {
    // Override console.error to suppress the specific error
    const originalConsoleError = console.error
    console.error = function(...args: any[]) {
        const message = args.join(" ")
        if (typeof message === "string" && message.includes("Invalid mode: null")) {
            // Suppress this specific error
            return
        }
        originalConsoleError.apply(console, args)
    }
    
    const suppressFramerError = (event: ErrorEvent) => {
        const message = event.message || String(event.error || "")
        if (typeof message === "string" && message.includes("Invalid mode: null")) {
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
        if (message.includes("Invalid mode: null")) {
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
