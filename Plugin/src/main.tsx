import React from "react"
import ReactDOM from "react-dom/client"
import { framer } from "framer-plugin"
import App from "./App"
import "./globals.css"

framer.showUI({
    position: "top right",
    width: 320,
    height: 760,
    minWidth: 320,
    maxWidth: 320,
    resizable: false,
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
