// Safe wrapper for framer-plugin that works in standalone dev mode

const createFramerMock = () => ({
    showUI: () => Promise.resolve(),
    getCurrentUser: () => Promise.resolve({ id: "dev-user", username: "dev" }),
    getPluginData: () => Promise.resolve(null),
    setPluginData: () => Promise.resolve(),
    isAllowedTo: () => false,
    addComponentInstance: () => Promise.reject(new Error("Not in Framer environment")),
    notify: (message?: string, options?: any) => {
        if (typeof console !== "undefined") {
            console.log("[Framer Notify]", message, options)
        }
    },
})

let framerInstance: any = createFramerMock()
let framerLoaded = false

// Lazy load framer-plugin
const loadFramer = async () => {
    if (framerLoaded) return framerInstance
    
    try {
        const module = await import("framer-plugin")
        if (module?.framer) {
            framerInstance = module.framer
            framerLoaded = true
        }
    } catch (error) {
        // framer-plugin not available - using mock
        if (typeof window !== "undefined" && typeof console !== "undefined" && window.location?.hostname === "localhost") {
            console.log("[Loading Plugin] Running in standalone mode - using framer mock")
        }
    }
    
    return framerInstance
}

// Start loading immediately but don't block
loadFramer()

export const framer = new Proxy({} as any, {
    get(_target, prop) {
        return framerInstance[prop]
    },
    set(_target, prop, value) {
        framerInstance[prop] = value
        return true
    },
})

export { loadFramer }

