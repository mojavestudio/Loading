import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./globals.css"
import { framer, loadFramer } from "./framer-safe"

// Initialize framer UI after loading
loadFramer().then((framerInstance) => {
    if (framerInstance && typeof framerInstance.showUI === "function") {
        framerInstance.showUI({
            position: "top right",
            width: 320,
            height: 760,
            minWidth: 320,
            maxWidth: 320,
            resizable: false,
        }).catch(() => {
            // Ignore if showUI fails - app will still render
        })
    }
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
