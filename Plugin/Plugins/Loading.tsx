/**
 * Loading — Framer Motion edition
 * - Progress bar uses framer-motion (useSpring + motion.div)
 * - Fires onReady once when: all( minTimer, race(ready, timeout) )
 * - Ready = WindowLoad OR (WindowLoad + Fonts + Images [+Bg] + Quiet)
 * - Canvas/Thumbnail: gate logic disabled; renders a static preview
 * - Preview obeys Run in Preview
 * - Intrinsic sizing only (Framer handles layout/stacking)
 * - Plugin insertion supports nested controls:
 *   - `bar` (primary) and `label` objects (property controls)
 *   - optional legacy `loadBar` object (back-compat)
 *   - optional direct top-level overrides (e.g. `labelPosition`, `startAtLabel`)
 */

/** @framerIntrinsicWidth  600 */
/** @framerIntrinsicHeight 50 */
/** @framerSupportedLayoutWidth any-prefer-fixed */
/** @framerSupportedLayoutHeight any-prefer-fixed */
/** @framerDisableUnlink */

import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, useSpring } from "framer-motion"

// Removed WaitMode - always uses WindowLoad now

type FontControlValue = {
    family?: string
    weight?: string | number
    style?: string
    fontFamily?: string
    fontWeight?: string | number
    fontStyle?: string
    fontSize?: number | string
    size?: number | string
    letterSpacing?: number | string
    lineHeight?: number | string
}

type AnimationStyle = "bar" | "circle" | "text"
type FillStyle = "solid" | "lines"
type TextDisplayMode = "textOnly" | "textAndNumber" | "numberOnly"
type TextFillStyle = "dynamic" | "static" | "oneByOne"

type LoadBarConfig = {
    animationStyle: AnimationStyle
    fillStyle: FillStyle
    lineWidth: number
    lineCount: number
    height: number
    barColor: string
    perpetual: boolean
    perpetualGap: number
    barRadius: number
    trackColor: string
    showTrack: boolean
    trackWidth: number
    circleGap: number
    startAtLabel: boolean
    textSize: number
    textFillColor: string
    textFillStyle: TextFillStyle
    textPerpetual: boolean
    textReverse: boolean
    textDisplayMode: TextDisplayMode
    showLabel: boolean
    labelText: string
    labelColor: string
    labelFontSize: number
    labelFontFamily: string
    labelFontWeight: string | number
    labelFont?: FontControlValue
    labelPosition: "left" | "center" | "right"
    labelPlacement: "inside" | "outside" | "inline" | "hidden"
    labelOutsideDirection: "top" | "center" | "bottom"
    labelOffsetX?: number
    labelOffsetY?: number
    showBorder: boolean
    borderWidth: number
    borderColor: string
}

type Props = {
    style?: React.CSSProperties
    id?: string

    // Gate (always uses WindowLoad mode now)
    minSeconds: number
    timeoutSeconds: number
    oncePerSession: boolean
    runInPreview: boolean
    onReady?: (event?: any) => void
    labelPosition?: "left" | "center" | "right"
    labelPlacement?: "inside" | "outside" | "inline" | "hidden"
    labelOutsideDirection?: "top" | "center" | "bottom"
    labelOffsetX?: number
    labelOffsetY?: number
    // Plugin/instance control structure:
    // - `bar` + `label` match the property controls groups below.
    // - `loadBar` is supported for backward compatibility with older instances/plugins.
    loadBar?: Partial<LoadBarConfig>
    bar?: Partial<LoadBarConfig>
    label?: Partial<LoadBarConfig>

    // Direct bar properties
    barRadius?: number
    barColor?: string
    thickness?: number
    height?: number
    trackColor?: string
    showTrack?: boolean
    trackWidth?: number
    circleGap?: number
    startAtLabel?: boolean
    showBorder?: boolean
    borderWidth?: number
    borderColor?: string
    
    // Direct label properties
    showLabel?: boolean
    labelColor?: string
    labelFontSize?: number
    labelFontFamily?: string
    labelFontWeight?: string | number
    labelText?: string

    // Auto-hide when complete
    hideWhenComplete: boolean

}

const computeBarTransformOrigin = (labelPosition: "left" | "center" | "right", startAtLabel: boolean): string => {
    if (labelPosition === "center") return "50% 50%"
    if (labelPosition === "right") return startAtLabel ? "100% 50%" : "0% 50%"
    return startAtLabel ? "0% 50%" : "100% 50%"
}

const computeBarOriginX = (labelPosition: "left" | "center" | "right", startAtLabel: boolean): number => {
    if (labelPosition === "center") return 0.5
    const fillFromRight = (labelPosition === "right" && startAtLabel) || (labelPosition === "left" && !startAtLabel)
    return fillFromRight ? 1 : 0
}

const computeRevealWindowStyle = (
    progress: number,
    originX: number,
    period?: number
): React.CSSProperties => {
    const p = clampValue(progress)
    const widthPct = `${p * 100}%`
    if (originX === 0.5) {
        return { left: "50%", width: widthPct, transform: "translateX(-50%)" }
    }
    if (originX === 1) {
        return { right: 0, width: widthPct }
    }
    // For lines fill style, we want to ensure clean edges
    // But since we're using percentage-based widths, we'll rely on the background-size alignment
    return { left: 0, width: widthPct }
}

const SESSION_FLAG = "PageReadyGate:ready"

const LABEL_OFFSET_LIMITS = {
    x: { min: -100, max: 130 },
    y: { min: -25, max: 25 },
}

const DEFAULT_LOAD_BAR: LoadBarConfig = {
    animationStyle: "bar",
    fillStyle: "solid",
    lineWidth: 20,
    lineCount: 5,
    height: 8,
    barColor: "#854FFF",
    perpetual: false,
    perpetualGap: 0.5,
    barRadius: 4,
    trackColor: "rgba(0,0,0,.12)",
    showTrack: true,
    trackWidth: 8,
    circleGap: 12,
    startAtLabel: false,
    textSize: 11,
    textFillColor: "#854FFF",
    textFillStyle: "dynamic",
    textPerpetual: false,
    textReverse: false,
    textDisplayMode: "textAndNumber",
    showLabel: true,
    labelText: "Loading",
    labelColor: "#222",
    labelFontSize: 11,
    labelFontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    labelFontWeight: 600,
    labelFont: {
        fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 600,
        fontSize: 11,
    },
    labelPosition: "right",
    labelPlacement: "inside",
    labelOutsideDirection: "bottom",
    labelOffsetX: 0,
    labelOffsetY: 0,
    showBorder: false,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,.2)",
}

const MIN_TIMER_PROGRESS_WEIGHT = 0.8
const MAX_PROGRESS_BEFORE_FINAL = 0.98

export default function Loading(p: Props) {
    const t = RenderTarget.current()
    const isCanvas = t === RenderTarget.canvas
    const isThumb = t === RenderTarget.thumbnail
    const isPreview = t === RenderTarget.preview
    const gatingOff = isCanvas || isThumb || (isPreview && !p.runInPreview)

    const isDesignPreview = isCanvas || isThumb
    const DESIGN_PREVIEW_PROGRESS = 0.42
    const progress = useSpring(isDesignPreview ? DESIGN_PREVIEW_PROGRESS : 0, { stiffness: 140, damping: 22 })
    const labelRef = React.useRef<HTMLDivElement | null>(null)
    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const gateStartRef = React.useRef<number | null>(null)
    const timerProgressRef = React.useRef(0)
    const readinessProgressRef = React.useRef(0)
    const [labelElement, setLabelElement] = React.useState<HTMLDivElement | null>(null)
    const [labelBounds, setLabelBounds] = React.useState({ width: 0, height: 0 })
    const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 })
    const setLabelRef = React.useCallback((node: HTMLDivElement | null) => {
        labelRef.current = node
        setLabelElement(node)
    }, [])
    const loadBarOverrides = (p.loadBar || {}) as Partial<LoadBarConfig> & {
        bar?: Partial<LoadBarConfig>
        label?: Partial<LoadBarConfig>
    }
    const rootBarOverrides = (p.bar || {}) as Partial<LoadBarConfig>
    const rootLabelOverrides = (p.label || {}) as Partial<LoadBarConfig>
    const nestedBarOverrides = {
        ...(loadBarOverrides.bar || {}),
        ...rootBarOverrides,
    } as Partial<LoadBarConfig>
    const nestedLabelOverrides = {
        ...(loadBarOverrides.label || {}),
        ...rootLabelOverrides,
    } as Partial<LoadBarConfig>
    const fontOverride =
        (nestedLabelOverrides.labelFont as FontControlValue | undefined) ??
        loadBarOverrides.labelFont ??
        DEFAULT_LOAD_BAR.labelFont
    const fontSizeFromFont = parseFontSizeValue(fontOverride?.fontSize ?? fontOverride?.size)

    const animationStyle = coalesce(
        nestedBarOverrides.animationStyle,
        loadBarOverrides.animationStyle,
        DEFAULT_LOAD_BAR.animationStyle
    )!
    const fillStyle = coalesce(
        nestedBarOverrides.fillStyle,
        loadBarOverrides.fillStyle,
        DEFAULT_LOAD_BAR.fillStyle
    )!
    const lineWidth = coalesce(
        nestedBarOverrides.lineWidth,
        loadBarOverrides.lineWidth,
        DEFAULT_LOAD_BAR.lineWidth
    )!
    const lineCount = coalesce(
        nestedBarOverrides.lineCount,
        (nestedBarOverrides as any).lineGap,
        loadBarOverrides.lineCount,
        (loadBarOverrides as any).lineGap,
        DEFAULT_LOAD_BAR.lineCount
    )!
    const heightRaw = coalesce(
        p.thickness,
        p.height,
        nestedBarOverrides.height,
        rootBarOverrides.height,
        loadBarOverrides.height,
        DEFAULT_LOAD_BAR.height
    )!
    const height =
        animationStyle === "text" ? heightRaw : clampNumber(heightRaw, 1, 35)
    const perpetual = coalesce(
        nestedBarOverrides.perpetual,
        loadBarOverrides.perpetual,
        DEFAULT_LOAD_BAR.perpetual
    )!
    const perpetualGap = coalesce(
        nestedBarOverrides.perpetualGap,
        loadBarOverrides.perpetualGap,
        DEFAULT_LOAD_BAR.perpetualGap
    )!
    const barRadius = coalesce(
        p.barRadius,
        nestedBarOverrides.barRadius,
        loadBarOverrides.barRadius,
        DEFAULT_LOAD_BAR.barRadius
    )!
    const barColor = coalesce(
        p.barColor,
        nestedBarOverrides.barColor,
        loadBarOverrides.barColor,
        DEFAULT_LOAD_BAR.barColor
    )!
    const trackColor = coalesce(
        p.trackColor,
        nestedBarOverrides.trackColor,
        loadBarOverrides.trackColor,
        DEFAULT_LOAD_BAR.trackColor
    )!
    const showTrack = coalesce(
        p.showTrack,
        nestedBarOverrides.showTrack,
        loadBarOverrides.showTrack,
        DEFAULT_LOAD_BAR.showTrack
    )!
    const trackWidth = coalesce(
        nestedBarOverrides.trackWidth,
        loadBarOverrides.trackWidth,
        DEFAULT_LOAD_BAR.trackWidth
    )!
    const circleGap = coalesce(
        p.circleGap,
        nestedBarOverrides.circleGap,
        loadBarOverrides.circleGap,
        DEFAULT_LOAD_BAR.circleGap
    )!
    const textSize =
        animationStyle === "text"
            ? coalesce(
                  nestedBarOverrides.textSize,
                  loadBarOverrides.textSize,
                  DEFAULT_LOAD_BAR.textSize
              )
            : undefined
    const textDisplayMode = coalesce(
        nestedBarOverrides.textDisplayMode,
        loadBarOverrides.textDisplayMode,
        DEFAULT_LOAD_BAR.textDisplayMode
    )!
    const textFillStyle = coalesce(
        nestedBarOverrides.textFillStyle,
        loadBarOverrides.textFillStyle,
        DEFAULT_LOAD_BAR.textFillStyle
    )!
    const textFillColor = coalesce(
        nestedBarOverrides.textFillColor,
        loadBarOverrides.textFillColor,
        DEFAULT_LOAD_BAR.textFillColor
    )!
    const textPerpetual = coalesce(
        nestedBarOverrides.textPerpetual,
        loadBarOverrides.textPerpetual,
        DEFAULT_LOAD_BAR.textPerpetual
    )!
    const textReverse = coalesce(
        nestedBarOverrides.textReverse,
        loadBarOverrides.textReverse,
        DEFAULT_LOAD_BAR.textReverse
    )!
    const startAtLabel = coalesce(
        p.startAtLabel,
        nestedBarOverrides.startAtLabel,
        loadBarOverrides.startAtLabel,
        DEFAULT_LOAD_BAR.startAtLabel
    )!
    const showBorder = coalesce(
        p.showBorder,
        nestedBarOverrides.showBorder,
        loadBarOverrides.showBorder,
        DEFAULT_LOAD_BAR.showBorder
    )!
    const borderWidth = coalesce(
        p.borderWidth,
        nestedBarOverrides.borderWidth,
        loadBarOverrides.borderWidth,
        DEFAULT_LOAD_BAR.borderWidth
    )!
    const borderColor = coalesce(
        p.borderColor,
        nestedBarOverrides.borderColor,
        loadBarOverrides.borderColor,
        DEFAULT_LOAD_BAR.borderColor
    )!

    const showLabel = coalesce(
        p.showLabel,
        nestedLabelOverrides.showLabel,
        loadBarOverrides.showLabel,
        DEFAULT_LOAD_BAR.showLabel
    )!
    const labelTextRaw = coalesce(
        nestedLabelOverrides.labelText,
        loadBarOverrides.labelText,
        DEFAULT_LOAD_BAR.labelText
    )
    const labelText = (labelTextRaw ?? "").trim()
    const labelColor = coalesce(
        p.labelColor,
        nestedLabelOverrides.labelColor,
        loadBarOverrides.labelColor,
        DEFAULT_LOAD_BAR.labelColor
    )!
    const labelFontSize =
        animationStyle === "text"
            ? coalesce(
                  p.labelFontSize,
                  nestedLabelOverrides.labelFontSize,
                  textSize,
                  fontSizeFromFont,
                  loadBarOverrides.labelFontSize,
                  DEFAULT_LOAD_BAR.labelFontSize
              )!
            : coalesce(
                  p.labelFontSize,
                  nestedLabelOverrides.labelFontSize,
                  loadBarOverrides.labelFontSize,
                  fontSizeFromFont,
                  DEFAULT_LOAD_BAR.labelFontSize
              )!
    const labelFontFamily = coalesce(
        p.labelFontFamily,
        nestedLabelOverrides.labelFontFamily,
        loadBarOverrides.labelFontFamily,
        fontOverride?.fontFamily,
        fontOverride?.family,
        DEFAULT_LOAD_BAR.labelFontFamily
    )!
    const labelFontWeight = coalesce(
        p.labelFontWeight,
        nestedLabelOverrides.labelFontWeight,
        loadBarOverrides.labelFontWeight,
        fontOverride?.fontWeight,
        fontOverride?.weight,
        DEFAULT_LOAD_BAR.labelFontWeight
    )!
    const labelPosition = coalesce(
        p.labelPosition,
        nestedLabelOverrides.labelPosition,
        loadBarOverrides.labelPosition,
        DEFAULT_LOAD_BAR.labelPosition
    )!
    const labelOutsideDirection = coalesce(
        p.labelOutsideDirection,
        nestedLabelOverrides.labelOutsideDirection,
        loadBarOverrides.labelOutsideDirection,
        DEFAULT_LOAD_BAR.labelOutsideDirection
    )!
    const labelPlacement = coalesce(
        p.labelPlacement,
        nestedLabelOverrides.labelPlacement,
        loadBarOverrides.labelPlacement,
        DEFAULT_LOAD_BAR.labelPlacement
    )!
    // For bars: 
    // - center/center = inside (centered)
    // - left/center or right/center = inside (at edges)
    // - top/bottom = outside (above/below bar, horizontally aligned per labelPosition)
    const resolvedLabelPlacement =
        labelPlacement === "hidden"
            ? "hidden"
            : animationStyle === "circle"
            ? labelPlacement
            : labelPlacement === "inline"
            ? "inside"
            : animationStyle === "bar" && 
              ((labelPosition === "center" && labelOutsideDirection === "center") ||
               ((labelPosition === "left" || labelPosition === "right") && labelOutsideDirection === "center"))
            ? "inside"
            : "outside"
    const labelOffsetXRaw = coalesce(
        p.labelOffsetX,
        nestedLabelOverrides.labelOffsetX,
        loadBarOverrides.labelOffsetX,
        DEFAULT_LOAD_BAR.labelOffsetX ?? 0
    ) ?? 0
    const labelOffsetYRaw = coalesce(
        p.labelOffsetY,
        nestedLabelOverrides.labelOffsetY,
        loadBarOverrides.labelOffsetY,
        DEFAULT_LOAD_BAR.labelOffsetY ?? 0
    ) ?? 0
    // Asymmetric clamping for X offset based on horizontal alignment
    // Right: allow up to +130 to the right, cap left movement at -70
    // Left: allow up to -130 to the left, cap right movement at +70
    // Center: cap both directions at +/-100
    let offsetXMin = LABEL_OFFSET_LIMITS.x.min
    let offsetXMax = LABEL_OFFSET_LIMITS.x.max
    if (labelPosition === "right") {
        offsetXMin = -70
        offsetXMax = 130
    } else if (labelPosition === "left") {
        offsetXMin = -130
        offsetXMax = 70
    } else {
        offsetXMin = -100
        offsetXMax = 100
    }

    const labelOffsetX = clampNumber(labelOffsetXRaw, offsetXMin, offsetXMax)
    const labelOffsetY = clampNumber(
        labelOffsetYRaw,
        LABEL_OFFSET_LIMITS.y.min,
        LABEL_OFFSET_LIMITS.y.max
    )

    const loadBarConfig: LoadBarConfig = {
        animationStyle,
        fillStyle,
        lineWidth,
        lineCount,
        height,
        perpetual,
        perpetualGap,
        barRadius,
        barColor,
        circleGap,
        trackColor,
        showTrack,
        trackWidth,
        startAtLabel,
        showLabel,
        labelText: labelTextRaw,
        labelColor,
        labelFontSize,
        labelFontFamily,
        labelFontWeight,
        labelFont: fontOverride,
        labelPosition,
        labelPlacement,
        labelOutsideDirection,
        textSize: textSize ?? DEFAULT_LOAD_BAR.textSize,
        textDisplayMode,
        textFillStyle,
        textFillColor,
        textPerpetual,
        textReverse,
        showBorder,
        borderWidth,
        borderColor,
    }

    const labelInside = showLabel && resolvedLabelPlacement === "inside"
    const labelOutside =
        showLabel &&
        resolvedLabelPlacement === "outside" &&
        animationStyle !== "text"
    const labelInline =
        showLabel &&
        animationStyle === "circle" &&
        resolvedLabelPlacement === "inline"
    const shouldRenderGlobalOutsideLabel =
        labelOutside && animationStyle !== "bar"

    const effectiveLabelDisplayMode = textDisplayMode || "textAndNumber"

    const formatLabel = React.useCallback(
        (value: number) => {
            const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
            const prefix =
                labelTextRaw !== undefined
                    ? labelText
                    : (DEFAULT_LOAD_BAR.labelText || "").trim()
            const percentString = `${pct}%`
            switch (effectiveLabelDisplayMode) {
                case "textOnly":
                    return prefix
                case "numberOnly":
                    return percentString
                default:
                    return prefix ? `${prefix} ${percentString}` : percentString
            }
        },
        [labelText, labelTextRaw, effectiveLabelDisplayMode]
    )

    React.useEffect(() => {
        if (!showLabel) return
        const unsub = progress.on("change", (v) => {
            if (labelRef.current) labelRef.current.textContent = formatLabel(v)
        }) as (() => void) | undefined
        return () => {
            if (typeof unsub === "function") unsub()
        }
    }, [showLabel, progress, formatLabel])

    const firedRef = React.useRef(false)
    const minTimerCompleteRef = React.useRef(false)
    const readyCompleteRef = React.useRef(false)
    const [isComplete, setIsComplete] = React.useState(false)

    React.useEffect(() => {
        const errorDebug = (...args: Parameters<typeof console.error>) =>
            console.error(...args)

        if (gatingOff || firedRef.current) return

        const minSeconds = Math.max(0, p.minSeconds || 0)
        const minMs = minSeconds * 1000
        const timeoutSeconds = Math.max(0, p.timeoutSeconds || 0)
        const timeoutMs = timeoutSeconds * 1000

        gateStartRef.current = performance.now()
        minTimerCompleteRef.current = minMs === 0
        let cancelled = false

        const timerWeight = minSeconds > 0 ? MIN_TIMER_PROGRESS_WEIGHT : 0
        const readinessWeight = 1 - timerWeight
        const updateVisualProgress = () => {
            if (!minTimerCompleteRef.current) {
                const timerPortion = timerProgressRef.current * timerWeight
                progress.set(Math.min(MAX_PROGRESS_BEFORE_FINAL, timerPortion))
            } else {
                const readinessPortion = readinessProgressRef.current
                const base = timerWeight
                const target =
                    readinessPortion >= 1
                        ? 1
                        : Math.min(
                              1,
                              base + readinessPortion * readinessWeight
                          )
                progress.set(target)
            }
        }
        const setTimerProgress = (value: number) => {
            const clamped = clampValue(value)
            if (timerProgressRef.current === clamped) return
            timerProgressRef.current = clamped
            if (!minTimerCompleteRef.current) {
                updateVisualProgress()
            }
        }
        const setReadinessProgress = (value: number) => {
            const clamped = clampValue(value)
            if (readinessProgressRef.current === clamped) return
            readinessProgressRef.current = clamped
            if (minTimerCompleteRef.current) {
                updateVisualProgress()
            }
        }

        timerProgressRef.current = 0
        readinessProgressRef.current = 0
        updateVisualProgress()

        const getElapsedSeconds = () => {
            const start = gateStartRef.current
            return start == null ? 0 : (performance.now() - start) / 1000
        }

        const MINIMUM_WAIT_POLL_SECONDS = 0.25
        const waitForMinimum = async () => {
            if (minTimerCompleteRef.current) return
            let lastLoggedRemainder = Number.POSITIVE_INFINITY
            while (!cancelled) {
                const elapsedSeconds = getElapsedSeconds()
                if (minSeconds > 0) {
                    setTimerProgress(elapsedSeconds / minSeconds)
                }
                if (elapsedSeconds >= minSeconds) {
                    minTimerCompleteRef.current = true
                    timerProgressRef.current = 1
                    updateVisualProgress()
                    break
                }
                const remainingSeconds = Math.max(
                    0,
                    minSeconds - elapsedSeconds
                )
                const roundedRemaining = Math.ceil(remainingSeconds)
                if (roundedRemaining < lastLoggedRemainder) {
                    lastLoggedRemainder = roundedRemaining
                }
                const sleepSeconds = Math.min(
                    MINIMUM_WAIT_POLL_SECONDS,
                    remainingSeconds
                )
                await delay(Math.max(16, sleepSeconds * 1000))
            }
        }

        if (p.oncePerSession) {
            try {
                if (sessionStorage.getItem(SESSION_FLAG) === "1") {
                    // Important: call finalize without returning it so React cleanup stays a function
                    // Do NOT skip the minimum; finalize() will enforce any remaining hold
                    void finalize()
                    return
                }
            } catch {}
        }

        let loadDone = document.readyState === "complete"

        function setBlend(opts: {
            loadDone?: boolean
        }) {
            if (opts.loadDone !== undefined) loadDone = opts.loadDone
            bumpBlend()
        }

        function bumpBlend() {
            // Always use WindowLoad - progress is based on window load state only
            setReadinessProgress(loadDone ? 1 : 0)
        }

        const waitWindow = waitForWindowLoad((done) =>
            setBlend({ loadDone: done })
        )

        const baseReady = waitWindow

        const ready = baseReady

        let timeoutHandle: number | undefined
        let timeoutReached = false

        const timeoutPromise =
            timeoutMs > 0
                ? new Promise<"timeout">((resolve) => {
                      timeoutHandle = window.setTimeout(() => {
                          timeoutReached = true
                          resolve("timeout")
                      }, timeoutMs)
                  })
                : null

        // Mark when the underlying readiness signal completes, but do NOT
        // clear the timeout here — we still need the global cap while waiting
        // for the minimum timer to elapse.
        const readySignalPromise: Promise<void> = ready.then(() => {
            readyCompleteRef.current = true
        })

        const POST_MINIMUM_POLL_MS = 1000
        const runGate = async () => {
            await waitForMinimum()
            if (cancelled) return

            let timedOut = timeoutReached

            if (!timedOut && readyCompleteRef.current) {
                // already satisfied
            } else {
                while (!cancelled && !timedOut) {
                    if (readyCompleteRef.current) {
                        break
                    }

                    let outcome: "ready" | "timeout" | "tick"
                    if (timeoutPromise) {
                        outcome = await Promise.race([
                            readySignalPromise.then(() => "ready" as const),
                            timeoutPromise,
                            delay(POST_MINIMUM_POLL_MS).then(
                                () => "tick" as const
                            ),
                        ])
                    } else {
                        outcome = (await Promise.race([
                            readySignalPromise.then(() => "ready" as const),
                            delay(POST_MINIMUM_POLL_MS).then(
                                () => "tick" as const
                            ),
                        ])) as "ready" | "tick"
                    }

                    if (cancelled) return

                    if (outcome === "ready") {
                        if (timeoutHandle) {
                            clearTimeout(timeoutHandle)
                            timeoutHandle = undefined
                        }
                        break
                    }

                    if (outcome === "timeout") {
                        timedOut = true
                        break
                    }

                    // Minimum met but readiness still pending; keep waiting silently
                }
            }

            if (cancelled) return

            await finalize()
        }

        runGate().catch((err) => errorDebug("[Gate] runGate error", err))

        async function finalize(options?: { skipMinimumCheck?: boolean }) {
            if (firedRef.current) return
            firedRef.current = true

            if (
                !options?.skipMinimumCheck &&
                minMs > 0 &&
                !minTimerCompleteRef.current
            ) {
                await waitForMinimum()
            }

            progress.set(1)
            await waitUntil(() => progress.get() >= 0.995, 1200)

            if (p.onReady) {
                // Fire a synthetic event that matches Framer's expectations for interaction triggers
                p.onReady(createGateEvent(rootRef.current))
            }

            if (p.oncePerSession) {
                try {
                    sessionStorage.setItem(SESSION_FLAG, "1")
                } catch {}
            }

            // Mark as complete (for hiding)
            setIsComplete(true)
        }

        return () => {
            cancelled = true
            if (timeoutHandle) clearTimeout(timeoutHandle)
            minTimerCompleteRef.current = false
            readyCompleteRef.current = false
            gateStartRef.current = null
        }
    }, [
        gatingOff,
        p.minSeconds,
        p.timeoutSeconds,
        p.oncePerSession,
        p.onReady,
        progress,
    ])

    React.useLayoutEffect(() => {
        const node = rootRef.current
        if (!node) return
        const measure = () => {
            setContainerSize({
                width: node.offsetWidth,
                height: node.offsetHeight,
            })
        }
        measure()
        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(() => measure())
        observer.observe(node)
        return () => {
            observer.disconnect()
        }
    }, [])


    React.useLayoutEffect(() => {
        const node = labelElement
        if (!node) {
            setLabelBounds({ width: 0, height: 0 })
            return
        }
        const measure = () => {
            setLabelBounds({
                width: node.offsetWidth,
                height: node.offsetHeight,
            })
        }
        measure()
        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(() => measure())
        observer.observe(node)
        return () => observer.disconnect()
    }, [labelElement])

    const baseLabelStyle: React.CSSProperties = {
        fontSize: labelFontSize,
        fontFamily: labelFontFamily,
        fontWeight: labelFontWeight,
        color: labelColor,
        pointerEvents: "none",
        whiteSpace: "nowrap",
    }

    const appliedFont = fontOverride || DEFAULT_LOAD_BAR.labelFont
    const fontStyleValue = appliedFont?.fontStyle ?? appliedFont?.style
    if (fontStyleValue)
        baseLabelStyle.fontStyle =
            fontStyleValue as React.CSSProperties["fontStyle"]
    if (appliedFont?.letterSpacing != null)
        baseLabelStyle.letterSpacing =
            appliedFont.letterSpacing as React.CSSProperties["letterSpacing"]
    if (appliedFont?.lineHeight != null)
        baseLabelStyle.lineHeight =
            appliedFont.lineHeight as React.CSSProperties["lineHeight"]

    const estimatedLabelHeight =
        labelBounds.height || Math.ceil(labelFontSize * 1.2)
    const labelSpacing = 6
    const outsideSpacing = 4
    const LABEL_VERTICAL_OFFSET = 30
    const BAR_SIDE_MARGIN = 15
    const BAR_EXTRA_TOP = 5
    const BAR_EXTRA_BOTTOM = 10
    const BAR_LABEL_GAP = 5
    const barContainerHeight = Math.max(
        height,
        Math.ceil(labelFontSize * 1.2 + 4)
    )
    const isBarAnimation = animationStyle === "bar"
    const outsidePadding = {
        top: isBarAnimation ? BAR_EXTRA_TOP : 0,
        right: isBarAnimation ? BAR_SIDE_MARGIN : 0,
        bottom: isBarAnimation ? BAR_EXTRA_BOTTOM : 0,
        left: isBarAnimation ? BAR_SIDE_MARGIN : 0,
    }
    const topOffsetShift =
        labelOutside && labelOutsideDirection === "top"
            ? Math.max(0, labelOffsetY)
            : 0
    const bottomOffsetShift =
        labelOutside && labelOutsideDirection === "bottom"
            ? Math.max(0, -labelOffsetY)
            : 0
    if (labelOutside) {
        const labelW = labelBounds.width || 0
        const labelH = estimatedLabelHeight
        if (!isBarAnimation) {
            if (labelOutsideDirection === "top") {
                outsidePadding.top = Math.max(
                    outsidePadding.top,
                    labelH + outsideSpacing + topOffsetShift
                )
            } else if (labelOutsideDirection === "bottom") {
                outsidePadding.bottom = Math.max(
                    outsidePadding.bottom,
                    labelH + outsideSpacing + bottomOffsetShift
                )
            }
        }

        const wantsHorizontalReserve =
            labelPosition === "left" || labelPosition === "right"

        if (wantsHorizontalReserve && !isBarAnimation) {
            const reserve = labelW + outsideSpacing
            if (labelPosition === "left") {
                outsidePadding.left = Math.max(outsidePadding.left, reserve)
            } else {
                outsidePadding.right = Math.max(outsidePadding.right, reserve)
            }
        }
    }

    // When Framer uses fixed sizing, it wraps the component and passes width: "100%", height: "100%"
    // The actual pixel dimensions come from the container size measurement
    // Prefer style prop when it's a number (direct pixel value), otherwise use measured container size
    // Use dynamic intrinsic size based on animation style as fallback to prevent 0x0 sizing issues
    const intrinsicSize = (() => {
        switch (animationStyle) {
            case "circle":
                return { width: 300, height: 300 }
            case "bar": {
                const barHeightForIntrinsic = Math.max(
                    height,
                    estimatedLabelHeight
                )
                const requiredHeight =
                    barHeightForIntrinsic +
                    LABEL_VERTICAL_OFFSET * 2 +
                    BAR_EXTRA_TOP +
                    BAR_EXTRA_BOTTOM
                return { width: 600, height: Math.max(50, Math.ceil(requiredHeight)) }
            }
            case "text":
                return { width: 300, height: 50 }
            default:
                return { width: 300, height: 300 }
        }
    })()
    const measuredWidth =
        (typeof p.style?.width === "number" ? p.style.width : null) ??
        (containerSize.width > 0 ? containerSize.width : intrinsicSize.width)
    const measuredHeight =
        (typeof p.style?.height === "number" ? p.style.height : null) ??
        (containerSize.height > 0 ? containerSize.height : intrinsicSize.height)
    const contentWidth = Math.max(
        0,
        measuredWidth - outsidePadding.left - outsidePadding.right
    )
    const wrapperTop = outsidePadding.top - bottomOffsetShift
    const wrapperBottom = outsidePadding.bottom
    const contentHeight = Math.max(
        0,
        measuredHeight - outsidePadding.top - outsidePadding.bottom
    )
    const contentTopActual = wrapperTop
    const contentBottomActual = wrapperTop + contentHeight

    const insideLabelOffset: string | undefined = (() => {
        const transforms: string[] = []
        if (labelOffsetX) transforms.push(`translateX(${labelOffsetX}px)`)
        if (labelOffsetY) transforms.push(`translateY(${-labelOffsetY}px)`)
        return transforms.length ? transforms.join(" ") : undefined
    })()

    const insideBarPaddingX = Math.max(6, Math.round(height * 0.2))
    const insideBarPaddingY = Math.max(4, Math.round(height * 0.15))
    const insideVerticalInset = Math.max(
        1,
        showBorder ? Math.round(borderWidth || 0) : 0,
        Math.round(height * 0.05)
    )
    const insidePaddingTop =
        labelOutsideDirection === "top" ? insideVerticalInset : insideBarPaddingY
    const insidePaddingBottom =
        labelOutsideDirection === "bottom"
            ? insideVerticalInset
            : insideBarPaddingY
    const insideHorizontalInset = 5
    // Ensure symmetric padding for center alignment
    const insidePaddingLeft =
        labelPosition === "center"
            ? insideBarPaddingX
            : insideBarPaddingX + (labelPosition === "left" ? insideHorizontalInset : 0)
    const insidePaddingRight =
        labelPosition === "center"
            ? insideBarPaddingX
            : insideBarPaddingX + (labelPosition === "right" ? insideHorizontalInset : 0)

    const insideLabelAlign = labelOutsideDirection === "top"
        ? "flex-start"
        : labelOutsideDirection === "center"
        ? "center"
        : "flex-end"

    // Flex-based label overlay baseline for bars; individual layouts adjust width/offset
    const insideLabelOverlayBase: React.CSSProperties = {
        position: "absolute",
        top: 0,
        bottom: 0,
        display: "flex",
        alignItems: insideLabelAlign,
        justifyContent: mapLabelAlign(labelPosition),
        pointerEvents: "none",
        paddingLeft: insidePaddingLeft,
        paddingRight: insidePaddingRight,
        paddingTop: insidePaddingTop,
        paddingBottom: insidePaddingBottom,
    }

    const outsideLabelStyle: React.CSSProperties = {
        ...baseLabelStyle,
        position: "absolute",
    }
    let outsideLabelTransform: string[] = []
    let appliedBarOutside = false
    if (resolvedLabelPlacement === "outside") {
        if (animationStyle === "bar") {
            const axisX = labelPosition === "left" ? -1 : labelPosition === "right" ? 1 : 0
            const axisY =
                labelOutsideDirection === "top"
                    ? -1
                    : labelOutsideDirection === "bottom"
                    ? 1
                    : 0
            const centerX = outsidePadding.left + contentWidth / 2
            // Bar is vertically centered in the content area, so use that center
            // not barContainerHeight / 2 which is incorrect
            const barCenterY =
                contentHeight > 0
                    ? outsidePadding.top + contentHeight / 2
                    : outsidePadding.top + barContainerHeight / 2
            const centerY = barCenterY
            const horizontalReach =
                axisX === 0
                    ? 0
                    : contentWidth / 2 + outsideSpacing + (labelBounds.width || 0) / 2
            const verticalReach =
                axisY === 0
                    ? 0
                    : height / 2 + outsideSpacing + (labelBounds.height || 0) / 2
            outsideLabelStyle.left = centerX
            outsideLabelStyle.top = centerY
            const transforms = ["translate(-50%, -50%)"]
            if (axisX !== 0) transforms.push(`translateX(${axisX * horizontalReach}px)`)
            if (axisY !== 0) transforms.push(`translateY(${axisY * verticalReach}px)`)
            // Extra 5px to the right for top/bottom rows only
            if (axisY !== 0) transforms.push("translateX(5px)")
            // Treat all right-side bar+outside labels like center-right for X offset:
            // apply translateX(labelOffsetX) whenever the label is on the right (axisX === 1)
            if (labelOffsetX && axisX === 1) transforms.push(`translateX(${labelOffsetX}px)`)
            if (labelOffsetY) transforms.push(`translateY(${-labelOffsetY}px)`)
            outsideLabelStyle.transform = transforms.join(" ")
            appliedBarOutside = true
        } else {
            const outsideLabelWidth = labelBounds.width || labelFontSize || 0
            const outsideLabelHeight = labelBounds.height || labelFontSize || 0
            const anchorTop = contentTopActual - outsideLabelHeight - outsideSpacing
            const anchorBottom = contentBottomActual + outsideSpacing
            const contentLeft = outsidePadding.left
            const contentRight = outsidePadding.left + contentWidth
            if (labelOutsideDirection === "top") {
                outsideLabelStyle.top = `${anchorTop - labelOffsetY}px`
            } else if (labelOutsideDirection === "center") {
                outsideLabelStyle.top = "50%"
                outsideLabelTransform.push("translateY(-50%)")
                if (labelOffsetY !== 0) {
                    outsideLabelTransform.push(`translateY(${-labelOffsetY}px)`)
                }
            } else {
                outsideLabelStyle.top = `${anchorBottom - labelOffsetY}px`
            }
            switch (labelPosition) {
                case "left":
                    outsideLabelStyle.left = `${contentLeft - outsideLabelWidth - outsideSpacing}px`
                    break
                case "center":
                    outsideLabelStyle.left = "50%"
                    outsideLabelTransform.push("translateX(-50%)")
                    break
                default:
                    outsideLabelStyle.left = `${contentRight + outsideSpacing}px`
                    break
            }
            if (labelOffsetX !== 0) {
                outsideLabelTransform.push(`translateX(${labelOffsetX}px)`)
            }
        }
    }
    if (!appliedBarOutside && outsideLabelTransform.length > 0) {
        outsideLabelStyle.transform = outsideLabelTransform.join(" ")
    }

    const hasMeasuredWidth = containerSize.width > 0
    const hasMeasuredHeight = containerSize.height > 0

    const rootStyle: React.CSSProperties = {
        ...p.style,
        width: p.style?.width ?? "100%",
        height: p.style?.height ?? "100%",
        position: "relative",
        boxSizing: "border-box",
        paddingTop: outsidePadding.top,
        paddingRight: outsidePadding.right,
        paddingBottom: outsidePadding.bottom,
        paddingLeft: outsidePadding.left,
    }

    // Only fall back to intrinsic minimums before the component has measured its container.
    // Once Framer reports explicit canvas sizing, allow the gate to shrink freely with the frame.
    if (!hasMeasuredWidth) {
        rootStyle.minWidth = intrinsicSize.width
    }
    if (!hasMeasuredHeight) {
        rootStyle.minHeight = intrinsicSize.height
    }
    if (p.hideWhenComplete && isComplete) {
        rootStyle.display = "none"
    }

    // Perpetual animation state for circle/bar modes
    const [perpetualProgress, setPerpetualProgress] = React.useState(0)
    
    React.useEffect(() => {
        const isPerpetualBarOrCircle =
            (animationStyle === "circle" || animationStyle === "bar") && perpetual
        if (!isPerpetualBarOrCircle) {
            setPerpetualProgress(0)
            return
        }

        let animationId: number | null = null
        let startTime: number | null = null
        let isAnimating = true

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const elapsed = timestamp - startTime

            // Animation duration (1 second), then gap
            const animationDuration = 1000 // 1 second for full cycle
            const gapDuration = perpetualGap * 1000 // gap in milliseconds
            const cycleDuration = animationDuration + gapDuration

            const cycleTime = elapsed % cycleDuration

            if (cycleTime < animationDuration) {
                // During animation phase
                const progress = cycleTime / animationDuration
                setPerpetualProgress(progress)
            } else {
                // During gap phase
                setPerpetualProgress(0)
            }

            if (isAnimating) {
                animationId = requestAnimationFrame(animate)
            }
        }

        animationId = requestAnimationFrame(animate)

        return () => {
            isAnimating = false
            if (animationId !== null) {
                cancelAnimationFrame(animationId)
            }
        }
    }, [animationStyle, perpetual, perpetualGap])
    
    // Perpetual animation state for text mode
    const [textPerpetualProgress, setTextPerpetualProgress] = React.useState(0)

    React.useEffect(() => {
        if (animationStyle !== "text" || textFillStyle === "static" || !textPerpetual) {
            setTextPerpetualProgress(0)
            return
        }
        let animationId: number | null = null
        let startTime: number | null = null
        let isAnimating = true
        const duration = 1600

        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp
            const elapsed = timestamp - startTime
            const progress = (elapsed % duration) / duration
            setTextPerpetualProgress(progress)
            if (isAnimating) animationId = requestAnimationFrame(animate)
        }

        animationId = requestAnimationFrame(animate)

        return () => {
            isAnimating = false
            if (animationId !== null) cancelAnimationFrame(animationId)
        }
    }, [animationStyle, textPerpetual, textFillStyle])
    
    // Get the actual progress value for rendering - make it reactive
    const [currentProgress, setCurrentProgress] = React.useState(0)
    
    React.useEffect(() => {
        if (perpetual && animationStyle === "circle") {
            // perpetualProgress is already being updated by the perpetual effect
            setCurrentProgress(perpetualProgress)
            return
        }
        
        // Subscribe to progress changes
        const unsub = progress.on("change", (v) => {
            setCurrentProgress(Math.max(0, Math.min(1, v)))
        }) as (() => void) | undefined
        
        // Set initial value
        setCurrentProgress(Math.max(0, Math.min(1, progress.get())))
        
        return () => {
            if (typeof unsub === "function") unsub()
        }
    }, [progress, perpetual, animationStyle, perpetualProgress])
    
    const animatedProgressValue =
        perpetual && (animationStyle === "circle" || animationStyle === "bar") ? perpetualProgress : currentProgress
    const progressValue = isDesignPreview ? DESIGN_PREVIEW_PROGRESS : animatedProgressValue
    const barTransformOrigin = animationStyle === "bar" ? computeBarTransformOrigin(labelPosition, startAtLabel) : "0% 50%"
    const barOriginX = animationStyle === "bar" ? computeBarOriginX(labelPosition, startAtLabel) : 0
    const textFillProgress =
        animationStyle === "text" && textPerpetual && progressValue < 0.999
            ? textPerpetualProgress
            : progressValue
    const initialLabelValue = formatLabel(progressValue)
    
    // Render based on animation style
    const renderContent = () => {
        const trackBackground = showTrack ? trackColor : "transparent"
        if (animationStyle === "text") {
            // Text style with optional glyph fill (no bar)
            const textContent = formatLabel(progressValue)

            const isStaticFill = textFillStyle === "static"
            const isOneByOneFill = textFillStyle === "oneByOne"

            if (isStaticFill) {
                return (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            position: "relative",
                        }}
                    >
                        {showLabel && (
                            <div
                                ref={setLabelRef}
                                style={{
                                    ...baseLabelStyle,
                                    position: "relative",
                                }}
                            >
                                {textContent}
                            </div>
                        )}
                    </div>
                )
            }

            // Text-only fill: base muted text + clipped overlay that fills the glyphs
            const fillPct = Math.max(0, Math.min(1, textFillProgress)) * 100
            const baseTextColor =
                trackColor ||
                labelColor ||
                (baseLabelStyle.color as string) ||
                "rgba(255,255,255,0.35)"
            const clipPercent = Math.max(0, Math.min(100, fillPct))
            const maskStop = textReverse
                ? Math.max(0, 100 - clipPercent)
                : clipPercent
            const fillColor = textFillColor || barColor
            const maskImage = textReverse
                ? `linear-gradient(90deg, transparent ${maskStop}%, #000 ${maskStop}%)`
                : `linear-gradient(90deg, #000 ${maskStop}%, transparent ${maskStop}%)`
            const directionDeg = textReverse ? 270 : 90

            if (isOneByOneFill) {
                const letters = Array.from(textContent)
                const total = Math.max(1, letters.length)
                const scaled = Math.max(0, Math.min(1, textFillProgress)) * total
                const filledCount = Math.min(total, Math.floor(scaled + 1e-6))

                return (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            position: "relative",
                        }}
                    >
                        {showLabel && (
                            <div
                                ref={setLabelRef}
                                style={{
                                    position: "relative",
                                    display: "inline-block",
                                    lineHeight: 1.2,
                                    padding: "2px 4px",
                                }}
                            >
                                {letters.map((ch, idx) => {
                                    const position = textReverse ? total - 1 - idx : idx
                                    const isFilled = position < filledCount
                                    const spanStyle: React.CSSProperties = {
                                        ...baseLabelStyle,
                                        color: isFilled ? fillColor : baseTextColor,
                                        position: "relative",
                                    }
                                    return (
                                        <span key={idx} style={spanStyle}>
                                            {ch}
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            return (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        position: "relative",
                    }}
                >
                    {showLabel && (
                        <div
                            style={{
                                position: "relative",
                                display: "inline-block",
                                lineHeight: 1.2,
                                padding: "2px 4px",
                            }}
                        >
                            <span
                                style={{
                                    ...baseLabelStyle,
                                    color: baseTextColor,
                                    position: "relative",
                                    zIndex: 1,
                                }}
                            >
                                {textContent}
                            </span>
                            <span
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    zIndex: 2,
                                    maskImage,
                                    WebkitMaskImage: maskImage,
                                    maskRepeat: "no-repeat",
                                    WebkitMaskRepeat: "no-repeat",
                                }}
                            >
                                <span
                                    ref={setLabelRef}
                                    style={{
                                        ...baseLabelStyle,
                                        color: "transparent",
                                        background: fillColor,
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        position: "relative",
                                    }}
                                >
                                    {textContent}
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            )
        }

        if (animationStyle === "circle") {
            // Circle rendering - fill the available space accounting for stroke width
            // Prefer sizing by height (so the circle doesn't grow when only width increases),
            // but always clamp to available width to guarantee it stays inside the frame.
            const CIRCLE_INSET_PX = 5
            const availableCircleWidth = Math.max(
                0,
                contentWidth - CIRCLE_INSET_PX * 2
            )
            const availableCircleHeight = Math.max(
                0,
                contentHeight - CIRCLE_INSET_PX * 2
            )
            const baseCircleSize = Math.max(
                0,
                Math.min(availableCircleWidth, availableCircleHeight)
            )
            const progressStrokeWidth = Math.max(1, height)
            const trackStrokeWidth = showTrack ? Math.max(0, trackWidth) : 0
            const maxStrokeWidth = Math.max(
                progressStrokeWidth,
                trackStrokeWidth,
                fillStyle === "lines" ? Math.max(0, lineWidth) : 0
            )

            // Keep SVG sized to the available content, and adjust radius so strokes fit.
            const svgSize = baseCircleSize
            const circleRadius = Math.max(0, (svgSize - maxStrokeWidth) / 2)
            const circleSize = svgSize
            
            const circumference = 2 * Math.PI * circleRadius
            const labelAngle = getInlineAngle(labelPosition, labelOutsideDirection)
            const rotationDeg = startAtLabel ? labelAngle : -90
            const gapDegrees = circleGap
            const gapLength = (gapDegrees / 360) * circumference
            const gapOffset =
                ((labelAngle - rotationDeg + 360) % 360) / 360 * circumference -
                gapLength / 2
            const progressCap: React.SVGAttributes<SVGCircleElement>["strokeLinecap"] =
                progressValue <= 0.001 ? "butt" : "round"

            // Center the SVG in the content area (flexbox will handle this, but we calculate for labels)
            const circleOffsetX =
                CIRCLE_INSET_PX + (availableCircleWidth - svgSize) / 2
            const circleOffsetY =
                CIRCLE_INSET_PX + (availableCircleHeight - svgSize) / 2
            const circlePaddingBase = Math.min(16, Math.max(6, circleSize * 0.08))
            const insideInset = Math.max(circlePaddingBase, maxStrokeWidth * 0.5 + 6)
            const centerX = circleOffsetX + circleSize / 2
            const centerY = circleOffsetY + circleSize / 2
            const availableRadius = Math.max(0, circleRadius - insideInset)
            const labelAxisX = labelPosition === "left" ? -1 : labelPosition === "right" ? 1 : 0
            const labelAxisY =
                labelOutsideDirection === "top"
                    ? -1
                    : labelOutsideDirection === "bottom"
                    ? 1
                    : 0
            const vectorLength = Math.hypot(labelAxisX, labelAxisY)
            const insideShiftMagnitude = vectorLength > 0 ? availableRadius : 0
            const insideShiftX =
                vectorLength > 0 ? (labelAxisX / vectorLength) * insideShiftMagnitude : 0
            const insideShiftY =
                vectorLength > 0 ? (labelAxisY / vectorLength) * insideShiftMagnitude : 0
            const insideLabelX = centerX + insideShiftX
            const insideLabelY = centerY + insideShiftY
            const insideLabelTransform = [
                "translate(-50%, -50%)",
                labelOffsetX ? `translateX(${labelOffsetX}px)` : "",
                labelOffsetY ? `translateY(${-labelOffsetY}px)` : "",
            ]
                .filter(Boolean)
                .join(" ") || undefined
            
            return (
                <div style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    padding: CIRCLE_INSET_PX,
                    boxSizing: "border-box",
                }}>
                    <svg
                        width={svgSize}
                        height={svgSize}
                        style={{ 
                            transform: `rotate(${rotationDeg}deg)`,
                            display: "block", // Remove any inline spacing
                        }}
                        viewBox={`0 0 ${svgSize} ${svgSize}`} // Ensure proper coordinate system
                    >
                        {/* Background circle (track) */}
                        {showTrack && fillStyle !== "lines" && (
                            <circle
                                cx={svgSize / 2}
                                cy={svgSize / 2}
                                r={circleRadius}
                                fill="none"
                                stroke={trackColor}
                                strokeWidth={trackWidth}
                                strokeDasharray={`${circumference - gapLength} ${gapLength}`}
                                strokeDashoffset={gapOffset}
                                strokeLinecap="round"
                            />
                        )}
                        {/* Progress circle */}
                        {fillStyle === "solid" ? (
                            <circle
                                cx={svgSize / 2}
                                cy={svgSize / 2}
                                r={circleRadius}
                                fill="none"
                                stroke={progressValue > 0 ? barColor : "transparent"}
                                strokeWidth={progressStrokeWidth}
                                strokeDasharray={`${Math.max(
                                    0,
                                    (circumference - gapLength) * progressValue
                                )} ${Math.max(
                                    0,
                                    (circumference - gapLength) * (1 - progressValue) + gapLength
                                )}`}
                                strokeDashoffset={gapOffset}
                                strokeLinecap={progressCap}
                            />
                        ) : (
                            <>
                                {Array.from({
                                    length: Math.max(3, Math.round(lineCount)),
                                }).map((_, i, arr) => {
                                    const segments = arr.length
                                    const shouldShow =
                                        i < Math.floor(progressValue * segments)
                                    const angle = (i / segments) * 360
                                    const angleDelta = Math.abs(
                                        ((((angle - labelAngle) % 360) + 540) % 360) - 180
                                    )
                                    if (angleDelta <= gapDegrees / 2) return null
                                    const rad = (angle * Math.PI) / 180
                                    const innerRadius = Math.max(0, circleRadius - progressStrokeWidth)
                                    const x1 = svgSize / 2 + circleRadius * Math.cos(rad)
                                    const y1 = svgSize / 2 + circleRadius * Math.sin(rad)
                                    const x2 = svgSize / 2 + innerRadius * Math.cos(rad)
                                    const y2 = svgSize / 2 + innerRadius * Math.sin(rad)
                                    const strokeColor = shouldShow
                                        ? barColor
                                        : showTrack
                                        ? trackColor
                                        : "transparent"
                                    const opacity = shouldShow ? 1 : showTrack ? 0.35 : 0
                                    if (!showTrack && !shouldShow) return null
                                    return (
                                        <line
                                            key={i}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke={strokeColor}
	                                            strokeWidth={lineWidth}
                                            strokeLinecap="round"
                                            opacity={opacity}
                                        />
                                    )
                                })}
                            </>
                        )}
                    </svg>
                    {labelInside && (
                        <div
                            style={{
                                position: "absolute",
                                left: insideLabelX,
                                top: insideLabelY,
                                pointerEvents: "none",
                                transform: insideLabelTransform,
                            }}
                        >
                            <div
                                ref={setLabelRef}
                                style={{
                                    ...baseLabelStyle,
                                    position: "relative",
                                }}
                            >
                                {initialLabelValue}
                            </div>
                        </div>
                    )}
                    {labelInline && (
                        <div
                            style={{
                                position: "absolute",
                                width: svgSize,
                                height: svgSize,
                                left: circleOffsetX,
                                top: circleOffsetY,
                                pointerEvents: "none",
                            }}
                        >
                            {(() => {
                                const angle = getInlineAngle(labelPosition, labelOutsideDirection)
                                const rad = (angle * Math.PI) / 180
                                const labelRadius = circleRadius
                                const lx = svgSize / 2 + labelRadius * Math.cos(rad)
                                const ly = svgSize / 2 + labelRadius * Math.sin(rad)
                                const inlineTransforms: string[] = ["translate(-50%, -50%)"]
                                if (labelOffsetX) inlineTransforms.push(`translateX(${labelOffsetX}px)`)
                                if (labelOffsetY) inlineTransforms.push(`translateY(${-labelOffsetY}px)`)
                                return (
                                    <div
                                        ref={setLabelRef}
                                        style={{
                                            ...baseLabelStyle,
                                            position: "absolute",
                                            left: lx,
                                            top: ly,
                                            transform: inlineTransforms.join(" "),
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {initialLabelValue}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>
            )
        }

        // Bar rendering (default)
        if (fillStyle === "solid" || fillStyle === "lines") {
            const isOutsideLabel = labelOutside
            const isInsideLabel = labelInside
            const measuredLabelWidth = labelBounds.width || 0
            const measuredLabelHeight = labelBounds.height || 0
            const verticalGap = BAR_LABEL_GAP

            let reserveLeft = 0
            let reserveRight = 0
            const labelOffsetXValue = labelOffsetX || 0
            const minBarWidth = Math.max(40, height * 2)

            // Outside labels: reserve space only when the X offset pushes the label away from the bar edge
            if (isOutsideLabel && measuredLabelWidth > 0) {
                const isCenterRow = labelOutsideDirection === "center"
                const movesAwayFromBar =
                    (labelPosition === "right" && labelOffsetXValue > 0) ||
                    (labelPosition === "left" && labelOffsetXValue < 0) ||
                    labelPosition === "center"

                // If the offset is moving the label toward the bar (e.g., right label with negative offset),
                // skip reserve adjustments entirely so the bar stays at its original size.
                if (!isCenterRow && !movesAwayFromBar && labelOffsetXValue !== 0) {
                    // No reserve change, keep bar width untouched.
                } else {
                for (let i = 0; i < 4; i++) {
                    const barWidthCandidate = Math.max(
                        minBarWidth,
                        contentWidth - reserveLeft - reserveRight
                    )
                    const barLeftCandidate = reserveLeft
                    const barRightCandidate = barLeftCandidate + barWidthCandidate
                    const barCenterCandidate = barLeftCandidate + barWidthCandidate / 2
                    const anchorXCandidate =
                        labelPosition === "left"
                            ? barLeftCandidate
                            : labelPosition === "right"
                            ? barRightCandidate
                            : barCenterCandidate
                    const offsetForBounds = isCenterRow
                        ? 0
                        : movesAwayFromBar
                        ? labelOffsetXValue
                        : 0
                    const bounds = computeOutsideLabelBounds(
                        labelPosition,
                        anchorXCandidate,
                        measuredLabelWidth,
                        offsetForBounds
                    )
                    let adjusted = false
                    if (bounds.left < 0) {
                        const availableLeft = Math.max(
                            0,
                            contentWidth - minBarWidth - reserveRight
                        )
                        const delta = Math.min(-bounds.left, availableLeft)
                        if (delta > 0) {
                            reserveLeft += delta
                            adjusted = true
                        }
                    }
                    if (bounds.right > contentWidth) {
                        const availableRight = Math.max(
                            0,
                            contentWidth - minBarWidth - reserveLeft
                        )
                        const delta = Math.min(
                            bounds.right - contentWidth,
                            availableRight
                        )
                        if (delta > 0) {
                            reserveRight += delta
                            adjusted = true
                        }
                    }
                    if (!adjusted) break
                }
                }
            }

            // Inside labels: unchanged from before
            if (isInsideLabel && measuredLabelWidth > 0) {
                for (let i = 0; i < 4; i++) {
                    const barWidthCandidate = Math.max(
                        minBarWidth,
                        contentWidth - reserveLeft - reserveRight
                    )
                    const barLeftCandidate = reserveLeft
                    const barRightCandidate = barLeftCandidate + barWidthCandidate
                    const barCenterCandidate = barLeftCandidate + barWidthCandidate / 2
                    const leadingGapCandidate = barLeftCandidate
                    const trailingGapCandidate =
                        contentWidth - barLeftCandidate - barWidthCandidate
                    const bounds = computeInsideLabelBounds(
                        labelPosition,
                        barLeftCandidate,
                        barRightCandidate,
                        barWidthCandidate,
                        leadingGapCandidate + insidePaddingLeft,
                        trailingGapCandidate + insidePaddingRight,
                        measuredLabelWidth,
                        labelOffsetXValue
                    )
                    let adjusted = false
                    if (bounds.left < 0) {
                        const availableLeft = Math.max(
                            0,
                            contentWidth - minBarWidth - reserveRight
                        )
                        const delta = Math.min(-bounds.left, availableLeft)
                        if (delta > 0) {
                            reserveLeft += delta
                            adjusted = true
                        }
                    }
                    if (bounds.right > contentWidth) {
                        const availableRight = Math.max(
                            0,
                            contentWidth - minBarWidth - reserveLeft
                        )
                        const delta = Math.min(
                            bounds.right - contentWidth,
                            availableRight
                        )
                        if (delta > 0) {
                            reserveRight += delta
                            adjusted = true
                        }
                    }
                    if (!adjusted) break
                }
            }

            // Bar width adjustment: never for center row; for top/bottom only when offset moves label away
            const isCenterRow = labelOutsideDirection === "center"
            let barWidthAdjustment = 0
            if (!isCenterRow && labelOffsetXValue !== 0) {
                const movesAwayFromBar =
                    (labelPosition === "right" && labelOffsetXValue > 0) ||
                    (labelPosition === "left" && labelOffsetXValue < 0) ||
                    labelPosition === "center"

                if (movesAwayFromBar) {
                    if (labelPosition === "right") {
                        barWidthAdjustment = labelOffsetXValue
                    } else if (labelPosition === "left") {
                        barWidthAdjustment = -labelOffsetXValue
                    } else if (labelPosition === "center") {
                        barWidthAdjustment = Math.abs(labelOffsetXValue)
                    }
                }
            }

            const baseBarWidth = Math.max(
                minBarWidth,
                contentWidth - reserveLeft - reserveRight - barWidthAdjustment
            )
            // Keep the bar within the available content width.
            // `reserveLeft/right` and `barWidthAdjustment` already account for label bounds/offsets.
            const barWidth = baseBarWidth
            const barOffsetX = reserveLeft
            const barLeft = barOffsetX
            const barRight = barOffsetX + barWidth
            const barCenterX = barOffsetX + barWidth / 2

            const labelHeightForLayout =
                measuredLabelHeight || estimatedLabelHeight
            const containerContentHeight = Math.max(
                barContainerHeight,
                labelHeightForLayout
            )
            const totalContainerHeight =
                containerContentHeight + LABEL_VERTICAL_OFFSET * 2

            // Bar and labels share a centered baseline; top/bottom labels sit 30px above/below it
            const barCenterY = totalContainerHeight / 2
            
            const overlayPaddingLeft = barOffsetX + insidePaddingLeft
            const overlayPaddingRight =
                contentWidth - barOffsetX - barWidth + insidePaddingRight

            // Outside label positioning
            let outsideLabelStyle: React.CSSProperties | null = null
            if (isOutsideLabel) {
                // Calculate horizontal anchor point based on labelPosition (same for all vertical directions)
                const anchorX =
                    labelPosition === "left"
                        ? barLeft
                        : labelPosition === "right"
                        ? barRight
                        : barCenterX
                
                const effectiveLabelHeight =
                    measuredLabelHeight || estimatedLabelHeight

                // Calculate vertical position: center stays at barCenterY, top/bottom offset by 30px
                const verticalOffset = 
                    labelOutsideDirection === "top"
                        ? -LABEL_VERTICAL_OFFSET
                        : labelOutsideDirection === "bottom"
                        ? LABEL_VERTICAL_OFFSET
                        : 0
                
                // Apply user offset (labelOffsetY) - note: positive Y moves down in CSS
                const totalVerticalOffset = verticalOffset - (labelOffsetY || 0)
                
                // Calculate the center Y position of the label
                const labelCenterY = barCenterY + totalVerticalOffset
                
                // Calculate top position (center minus half height)
                const outsideTop = labelCenterY - effectiveLabelHeight / 2

                // Build transform array for horizontal alignment
                const outsideTransforms: string[] = []
                if (labelPosition === "center") {
                    outsideTransforms.push("translateX(-50%)")
                } else if (labelPosition === "right") {
                    outsideTransforms.push("translateX(-100%)")
                }
                // left position doesn't need transform - it's already at the anchor point
                
                // Apply horizontal offset if provided
                if (labelOffsetX) {
                    outsideTransforms.push(`translateX(${labelOffsetX}px)`)
                }
                
                outsideLabelStyle = {
                    ...baseLabelStyle,
                    position: "absolute",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    left: anchorX,
                    top: outsideTop,
                    transform: outsideTransforms.length ? outsideTransforms.join(" ") : undefined,
                }
            }
            
            // Inside label positioning
            const insideOverlayStyle: React.CSSProperties = {
                ...insideLabelOverlayBase,
                left: 0,
                width: contentWidth,
                paddingLeft: overlayPaddingLeft,
                paddingRight: overlayPaddingRight,
            }
            
            // Update inside overlay alignment based on labelPosition
            if (isInsideLabel) {
                if (labelPosition === "left") {
                    insideOverlayStyle.justifyContent = "flex-start"
                } else if (labelPosition === "right") {
                    insideOverlayStyle.justifyContent = "flex-end"
                } else {
                    // center
                    insideOverlayStyle.justifyContent = "center"
                }
            }

            const barOuterWrapperStyle: React.CSSProperties = {
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: BAR_EXTRA_TOP,
                paddingBottom: BAR_EXTRA_BOTTOM,
                boxSizing: "border-box",
            }

            const trackBackground = showTrack ? trackColor : "transparent"

            if (fillStyle === "solid") {
                return (
                    <div style={barOuterWrapperStyle}>
                        <div
                            style={{
                                width: `${contentWidth}px`,
                                height: `${totalContainerHeight}px`,
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                boxSizing: "border-box",
                                overflow: "visible",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: `${barOffsetX}px`,
                                    width: `${barWidth}px`,
                                    height: `${height}px`,
                                    background: trackBackground,
                                    borderRadius: barRadius,
                                    overflow: "hidden",
                                    border:
                                        showBorder && borderWidth > 0
                                            ? `${borderWidth}px solid ${borderColor}`
                                            : "none",
                                    boxSizing: "border-box",
                                    transform: "translateY(-50%)",
                                }}
                            >
	                                <motion.div
	                                    style={{
	                                        width: "100%",
	                                        height: "100%",
	                                        background: barColor,
	                                        borderRadius: barRadius,
	                                        originX: barOriginX,
	                                        originY: 0.5,
	                                        scaleX: progressValue,
	                                    }}
	                                />
	                            </div>
                            {labelInside && (
                                <div style={insideOverlayStyle}>
                                    <div
                                        ref={setLabelRef}
                                        style={{
                                            ...baseLabelStyle,
                                            whiteSpace: "nowrap",
                                            transform: insideLabelOffset,
                                        }}
                                    >
                                        {initialLabelValue}
                                    </div>
                                </div>
                            )}
                            {outsideLabelStyle && (
                                <div ref={setLabelRef} style={outsideLabelStyle}>
                                    {initialLabelValue}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            // Calculate gap based on number of lines (lineCount) to fit within available width
            const stripeWidthPx = Math.max(1, Math.round(lineWidth))
            const totalLines = Math.max(1, Math.round(lineCount))
            const totalLineWidth = stripeWidthPx * totalLines
            const availableWidth = contentWidth || 600 // fallback width
            const stripeGapPx =
                totalLines <= 1
                    ? stripeWidthPx
                    : Math.max(
                          1,
                          Math.round(
                              (availableWidth - totalLineWidth) /
                                  (totalLines - 1)
                          )
                      )
            const period = stripeWidthPx + stripeGapPx
            const trackPattern = `repeating-linear-gradient(90deg, ${trackBackground} 0px, ${trackBackground} ${stripeWidthPx}px, transparent ${stripeWidthPx}px, transparent ${period}px)`
            const fillPattern = `repeating-linear-gradient(90deg, ${barColor} 0px, ${barColor} ${stripeWidthPx}px, transparent ${stripeWidthPx}px, transparent ${period}px)`

            return (
                <div style={barOuterWrapperStyle}>
                    <div
                        style={{
                            width: `${contentWidth}px`,
                            height: `${totalContainerHeight}px`,
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            boxSizing: "border-box",
                            overflow: "visible",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: `${barOffsetX}px`,
                                width: `${barWidth}px`,
                                height: `${height}px`,
                                borderRadius: barRadius,
                                overflow: "hidden",
                                border:
                                    showBorder && borderWidth > 0
                                        ? `${borderWidth}px solid ${borderColor}`
                                        : "none",
                                boxSizing: "border-box",
                                transform: "translateY(-50%)",
                                background: "transparent",
                            }}
                        >
                            {showTrack && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        backgroundImage: trackPattern,
                                        backgroundSize: `${period}px 100%`,
                                        backgroundPosition: "left center",
                                        borderRadius: barRadius,
                                    }}
                                />
                            )}
                            <motion.div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 0,
                                    overflow: "hidden",
                                    ...computeRevealWindowStyle(
                                        progressValue,
                                        barOriginX,
                                        period
                                    ),
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        backgroundImage: fillPattern,
                                        backgroundSize: `${period}px 100%`,
                                        backgroundPosition: "left center",
                                        borderRadius: barRadius,
                                    }}
                                />
                            </motion.div>
                        </div>
                        {labelInside && (
                            <div style={insideOverlayStyle}>
                                <div
                                    ref={setLabelRef}
                                    style={{
                                        ...baseLabelStyle,
                                        whiteSpace: "nowrap",
                                        transform: insideLabelOffset,
                                    }}
                                >
                                    {initialLabelValue}
                                </div>
                            </div>
                        )}
                        {outsideLabelStyle && (
                            <div ref={setLabelRef} style={outsideLabelStyle}>
                                {initialLabelValue}
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    }

    // Content wrapper to center the content within the container
    // Use absolute positioning to fill the space inside the root padding
    const contentWrapperStyle: React.CSSProperties = {
        position: "absolute",
        top: wrapperTop,
        left: outsidePadding.left,
        right: outsidePadding.right,
        bottom: outsidePadding.bottom,
        display: "flex",
        alignItems: "center", // Center vertically
        justifyContent: "center", // Always center in live view
    }

    return (
        <div ref={rootRef} style={rootStyle}>
            <div style={contentWrapperStyle}>
                {renderContent()}
            </div>
            {shouldRenderGlobalOutsideLabel && (
                <div ref={setLabelRef} style={outsideLabelStyle}>
                    {initialLabelValue}
                </div>
            )}
        </div>
    )
}

function delay(ms: number) {
    return new Promise<void>((res) => setTimeout(res, ms))
}

function waitUntil(pred: () => boolean, timeoutMs: number) {
    return new Promise<void>((res) => {
        const deadline = performance.now() + timeoutMs
        const step = () => {
            if (pred() || performance.now() >= deadline) return res()
            requestAnimationFrame(step)
        }
        step()
    })
}

function waitForWindowLoad(onProgress: (done: boolean) => void) {
    return new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
            onProgress(true)
            return resolve()
        }
        onProgress(false)
        const onLoad = () => {
            window.removeEventListener("load", onLoad)
            onProgress(true)
            resolve()
        }
        window.addEventListener("load", onLoad, { once: true })
    })
}

type StrictOpts = {
    scopeSelector: string
    includeBackgrounds: boolean
    quietMs: number
    onAssetsProgress: (frac: number) => void
    onFontsReady: (done: boolean) => void
}

function waitForStrictAssets(opts: StrictOpts) {
    const root: ParentNode = opts.scopeSelector
        ? (document.querySelector(opts.scopeSelector) as ParentNode) || document
        : document

    let total = 0,
        done = 0,
        pending = 0
    let quietTO: number | undefined
    let resolveQuiet!: () => void
    const quietPromise = new Promise<void>((res) => (resolveQuiet = res))

    const recompute = () => {
        const frac = total ? done / total : 1
        opts.onAssetsProgress(frac)
    }
    const scheduleQuiet = () => {
        if (quietTO) clearTimeout(quietTO)
        if (pending === 0) {
            quietTO = window.setTimeout(() => {
                if (pending === 0) resolveQuiet()
            }, opts.quietMs)
        }
    }
    const addAsset = (waiter: Promise<any>) => {
        total += 1
        pending += 1
        waiter.finally(() => {
            done += 1
            pending -= 1
            recompute()
            scheduleQuiet()
        })
        recompute()
    }

    const anyDoc = document as any
    const fontsReady = anyDoc.fonts?.ready
        ? anyDoc.fonts.ready.catch(() => {})
        : Promise.resolve()
    fontsReady.finally(() => opts.onFontsReady(true))

    const seenImgs = new WeakSet<HTMLImageElement>()
    const handleImg = (img: HTMLImageElement) => {
        if (seenImgs.has(img)) return
        seenImgs.add(img)
        if (img.complete) addAsset(Promise.resolve())
        else if ((img as any).decode)
            addAsset((img as any).decode().catch(() => {}))
        else
            addAsset(
                new Promise<void>((res) => {
                    const done = () => {
                        img.removeEventListener("load", done)
                        img.removeEventListener("error", done)
                        res()
                    }
                    img.addEventListener("load", done, { once: true })
                    img.addEventListener("error", done, { once: true })
                })
            )
    }

    const seenBg = new Set<string>()
    const preloadBg = (url: string) => {
        if (!url || seenBg.has(url)) return
        seenBg.add(url)
        addAsset(
            new Promise<void>((res) => {
                const i = new Image()
                i.onload = () => res()
                i.onerror = () => res()
                ;(i as any).decoding = "async"
                i.src = url
            })
        )
    }
    const extractBgUrls = (el: Element) => {
        const s = getComputedStyle(el)
        const bg = s.backgroundImage
        if (!bg || bg === "none") return
        const urls = Array.from(bg.matchAll(/url\((['"]?)(.*?)\1\)/g)).map(
            (m) => m[2]
        )
        urls.forEach(preloadBg)
    }

    const docOrEl = root instanceof Document ? document : (root as Element)
    docOrEl
        .querySelectorAll?.("img")
        .forEach((n) => handleImg(n as HTMLImageElement))
    if (opts.includeBackgrounds)
        docOrEl
            .querySelectorAll?.("*")
            .forEach((n) => extractBgUrls(n as Element))
    scheduleQuiet()

    const mo = new MutationObserver((muts) => {
        muts.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return
                const el = node as Element
                if (el instanceof HTMLImageElement) handleImg(el)
                el
                    .querySelectorAll?.("img")
                    .forEach((img) => handleImg(img as HTMLImageElement))
                if (opts.includeBackgrounds) extractBgUrls(el)
            })
        })
        scheduleQuiet()
    })
    mo.observe(
        docOrEl instanceof Document ? document.documentElement : docOrEl,
        { childList: true, subtree: true }
    )

    return Promise.all([fontsReady.then(() => undefined), quietPromise]).then(
        () => mo.disconnect()
    )
}

function clampValue(n: number) {
    return Math.max(0, Math.min(1, n))
}

function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function parseFontSizeValue(value?: number | string) {
    if (value == null) return undefined
    if (typeof value === "number" && isFinite(value)) return value
    if (typeof value === "string") {
        const match = value.trim().match(/^([0-9]*\.?[0-9]+)/)
        if (match) return parseFloat(match[1])
    }
    return undefined
}

function coalesce<T>(...values: Array<T | undefined | null>): T | undefined {
    for (const value of values) {
        if (value !== undefined && value !== null) return value
    }
    return undefined
}

function mapLabelAlign(position?: "left" | "center" | "right") {
    switch (position) {
        case "left":
            return "flex-start"
        case "center":
            return "center"
        default:
            return "flex-end"
    }
}

function getInlineAngle(
    position?: "left" | "center" | "right",
    direction?: "top" | "center" | "bottom"
) {
    const x = position === "left" ? -1 : position === "right" ? 1 : 0
    const y = direction === "top" ? -1 : direction === "bottom" ? 1 : 0
    const hasX = x !== 0
    const hasY = y !== 0
    if (!hasX && !hasY) {
        return -90
    }
    const angleRad = Math.atan2(hasY ? y : 0, hasX ? x : 0)
    return (angleRad * 180) / Math.PI
}

function computeOutsideLabelBounds(
    position: "left" | "center" | "right",
    anchorX: number,
    labelWidth: number,
    offsetX: number
) {
    if (position === "left") {
        const left = anchorX + offsetX
        return { left, right: left + labelWidth }
    }
    if (position === "right") {
        const right = anchorX + offsetX
        return { left: right - labelWidth, right }
    }
    const left = anchorX - labelWidth / 2 + offsetX
    return { left, right: left + labelWidth }
}

function computeInsideLabelBounds(
    position: "left" | "center" | "right",
    barLeft: number,
    barRight: number,
    barWidth: number,
    paddingLeft: number,
    paddingRight: number,
    labelWidth: number,
    offsetX: number
) {
    let left: number
    if (position === "left") {
        left = barLeft + paddingLeft + offsetX
    } else if (position === "right") {
        left = barRight - paddingRight - labelWidth + offsetX
    } else {
        left = barLeft + (barWidth - labelWidth) / 2 + offsetX
    }
    return { left, right: left + labelWidth }
}

function createGateEvent(target: EventTarget | null) {
    let defaultPrevented = false
    let propagationStopped = false
    // Mimic React's SyntheticEvent shape so downstream Framer plumbing does not crash
    return {
        type: "Load",
        target,
        currentTarget: target,
        timeStamp: performance.now(),
        bubbles: true,
        cancelable: true,
        get defaultPrevented() {
            return defaultPrevented
        },
        preventDefault() {
            defaultPrevented = true
        },
        isDefaultPrevented() {
            return defaultPrevented
        },
        stopPropagation() {
            propagationStopped = true
        },
        isPropagationStopped() {
            return propagationStopped
        },
        persist() {},
        nativeEvent: undefined,
    }
}

Loading.displayName = "Loading..."

Loading.defaultProps = {
    minSeconds: 0.6,
    timeoutSeconds: 12,
    oncePerSession: false,
    runInPreview: true,
    hideWhenComplete: false,
    loadBar: DEFAULT_LOAD_BAR,
}

addPropertyControls(Loading, {

    minSeconds: {
        type: ControlType.Number,
        title: "Min (s)",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0.6,
        displayStepper: true,
    },
    timeoutSeconds: {
        type: ControlType.Number,
        title: "Timeout (s)",
        min: 1,
        max: 120,
        step: 1,
        defaultValue: 12,
        displayStepper: true,
    },
    perpetual: {
        type: ControlType.Boolean,
        title: "Perpetual (Circle)",
        defaultValue: DEFAULT_LOAD_BAR.perpetual,
        hidden: (props: any) => {
            const anim = props.bar?.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle;
            return anim !== "circle";
        },
    },
    perpetualGap: {
        type: ControlType.Number,
        title: "Perpetual Gap (s)",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: DEFAULT_LOAD_BAR.perpetualGap,
        displayStepper: true,
        hidden: (props: any) => {
            const anim = props.bar?.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle;
            const perpetual = props.perpetual ?? DEFAULT_LOAD_BAR.perpetual;
            return anim !== "circle" || !perpetual;
        },
    },
    textPerpetual: {
        type: ControlType.Boolean,
        title: "Perpetual (Text)",
        defaultValue: DEFAULT_LOAD_BAR.textPerpetual,
        hidden: (props: any) => {
            const anim = props.bar?.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle;
            const textFillStyle = props.bar?.textFillStyle ?? DEFAULT_LOAD_BAR.textFillStyle;
            return anim !== "text" || textFillStyle === "static";
        },
    },
    oncePerSession: {
        type: ControlType.Boolean,
        title: "Once / Session",
        defaultValue: false,
    },
    runInPreview: {
        type: ControlType.Boolean,
        title: "Run in Preview",
        defaultValue: true,
    },
    hideWhenComplete: {
        type: ControlType.Boolean,
        title: "Hide When Complete",
        defaultValue: false,
    },
  bar: {
    type: ControlType.Object,
    title: "Load Bar",
    controls: {
      animationStyle: {
        type: ControlType.Enum,
        title: "Animation",
        options: ["bar", "circle", "text"],
        optionTitles: ["Bar", "Circle", "Text"],
        displaySegmentedControl: true,
        defaultValue: DEFAULT_LOAD_BAR.animationStyle,
      },
      fillStyle: {
        type: ControlType.Enum,
        title: "Fill",
        options: ["solid", "lines"],
        optionTitles: ["Solid", "Lines"],
        displaySegmentedControl: true,
        defaultValue: DEFAULT_LOAD_BAR.fillStyle,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text",
      },
      textFillStyle: {
        type: ControlType.Enum,
        title: "Fill",
        options: ["static", "dynamic", "oneByOne"],
        optionTitles: ["Static", "Dynamic", "One-by-One"],
        defaultValue: DEFAULT_LOAD_BAR.textFillStyle,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "text",
      },
      textFillColor: {
        type: ControlType.Color,
        title: "Fill Color",
        defaultValue: DEFAULT_LOAD_BAR.textFillColor,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "text" ||
          (bar.textFillStyle ?? DEFAULT_LOAD_BAR.textFillStyle) === "static",
      },
            textReverse: {
        type: ControlType.Boolean,
        title: "Reverse Start",
        defaultValue: DEFAULT_LOAD_BAR.textReverse,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "text" ||
          (bar.textFillStyle ?? DEFAULT_LOAD_BAR.textFillStyle) === "static",
      },
      height: {
        type: ControlType.Number,
        title: "Height",
        min: 1,
        max: 35,
        step: 1,
        defaultValue: DEFAULT_LOAD_BAR.height,
        displayStepper: true,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text",
      },
      textSize: {
        type: ControlType.Number,
        title: "Text Size",
        min: 1,
        step: 1,
        defaultValue: DEFAULT_LOAD_BAR.textSize,
        displayStepper: true,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "text",
      },
            startAtLabel: {
        type: ControlType.Boolean,
        title: "Start at Label",
        defaultValue: DEFAULT_LOAD_BAR.startAtLabel,
        hidden: (bar: any = {}) => {
          const anim = bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle
          return anim !== "circle" && anim !== "bar"
        },
      },
      barRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 20,
        defaultValue: DEFAULT_LOAD_BAR.barRadius,
        displayStepper: true,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "bar",
      },
      barColor: {
        type: ControlType.Color,
        title: "Bar",
        defaultValue: DEFAULT_LOAD_BAR.barColor,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "bar",
      },
      lineWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: DEFAULT_LOAD_BAR.lineWidth,
        displayStepper: true,
        hidden: (bar: any = {}) => {
            const style =
                bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle
            const fill = bar.fillStyle ?? DEFAULT_LOAD_BAR.fillStyle
            return style === "text" || fill !== "lines"
        },
      },
      lineCount: {
        type: ControlType.Number,
        title: "Lines",
        min: 3,
        max: 60,
        step: 1,
        defaultValue: DEFAULT_LOAD_BAR.lineCount,
        displayStepper: true,
        hidden: (bar: any = {}) => {
            const style =
                bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle
            const fill = bar.fillStyle ?? DEFAULT_LOAD_BAR.fillStyle
            return style === "text" || fill !== "lines"
        },
      },
      circleGap: {
        type: ControlType.Number,
        title: "Gap",
        min: 0,
        max: 90,
        step: 1,
        defaultValue: DEFAULT_LOAD_BAR.circleGap,
        displayStepper: true,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "circle",
      },
      trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: DEFAULT_LOAD_BAR.trackColor,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text",
      },
      trackWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: DEFAULT_LOAD_BAR.trackWidth,
        displayStepper: true,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text",
      },
      showBorder: {
        type: ControlType.Boolean,
        title: "Border",
        defaultValue: DEFAULT_LOAD_BAR.showBorder,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "bar",
      },
      borderWidth: {
        type: ControlType.Number,
        title: "Border Width",
        min: 1,
        max: 12,
        defaultValue: DEFAULT_LOAD_BAR.borderWidth,
        displayStepper: true,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "bar" ||
            !(bar.showBorder ?? DEFAULT_LOAD_BAR.showBorder),
      },
      borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: DEFAULT_LOAD_BAR.borderColor,
        hidden: (bar: any = {}) =>
            (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "bar" ||
            !(bar.showBorder ?? DEFAULT_LOAD_BAR.showBorder),
      },
    },
  },
  label: {
        type: ControlType.Object,
        title: "Label",
        controls: {
            showLabel: {
                type: ControlType.Boolean,
                title: "Show Label",
                defaultValue: DEFAULT_LOAD_BAR.showLabel,
            },
            labelColor: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: DEFAULT_LOAD_BAR.labelColor,
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel),
            },
            labelText: {
                type: ControlType.String,
                title: "Loading Text",
                placeholder: "Loading",
                defaultValue: DEFAULT_LOAD_BAR.labelText,
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel),
            },
            textDisplayMode: {
                type: ControlType.Enum,
                title: "Display",
                options: ["textOnly", "textAndNumber", "numberOnly"],
                optionTitles: ["Text", "Text + %", "%"],
                defaultValue: DEFAULT_LOAD_BAR.textDisplayMode,
                hidden: (label: any = {}, props: any = {}) => {
                    if (!(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)) return true
                    const anim =
                        props?.loadBar?.animationStyle ??
                        props?.bar?.animationStyle ??
                        DEFAULT_LOAD_BAR.animationStyle
                    return anim !== "text"
                },
            },
            labelFont: {
                type: ControlType.Font,
                title: "Font",
                defaultValue: {
                    family: DEFAULT_LOAD_BAR.labelFontFamily,
                    weight:
                        typeof DEFAULT_LOAD_BAR.labelFontWeight === "number"
                            ? DEFAULT_LOAD_BAR.labelFontWeight
                            : Number(DEFAULT_LOAD_BAR.labelFontWeight) || 400,
                    style: "normal",
                    size: DEFAULT_LOAD_BAR.labelFontSize,
                },
                defaultFontType: "sans-serif",
                defaultFontSize: `${DEFAULT_LOAD_BAR.labelFontSize}px`,
                displayFontSize: true,
                displayTextAlignment: false,
                controls: "extended",
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel),
            },
            labelPlacement: {
                type: ControlType.Enum,
                title: "Placement",
                options: ["inside", "outside", "inline", "hidden"],
                optionTitles: ["Inside", "Outside", "Inline", "Hidden"],
                defaultValue: DEFAULT_LOAD_BAR.labelPlacement,
                hidden: (label: any = {}, props: any = {}) => {
                    if (!(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)) return true
                    const anim =
                        props?.loadBar?.animationStyle ??
                        props?.bar?.animationStyle ??
                        DEFAULT_LOAD_BAR.animationStyle
                    // Bar doesn't support "inline" placement.
                    return anim === "bar"
                },
            },
            labelOffsetX: {
                type: ControlType.Number,
                title: "Offset X",
                min: -130,
                max: 130,
                step: 1,
                defaultValue: DEFAULT_LOAD_BAR.labelOffsetX ?? 0,
                displayStepper: true,
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel) ||
                    (label.labelPlacement ?? DEFAULT_LOAD_BAR.labelPlacement) === "hidden",
            },
            labelOffsetY: {
                type: ControlType.Number,
                title: "Offset Y",
                min: -25,
                max: 25,
                step: 1,
                defaultValue: DEFAULT_LOAD_BAR.labelOffsetY ?? 0,
                displayStepper: true,
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel) ||
                    (label.labelPlacement ?? DEFAULT_LOAD_BAR.labelPlacement) === "hidden",
            },
            labelPosition: {
                type: ControlType.Enum,
                title: "Horizontal Align",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                displaySegmentedControl: true,
                defaultValue: DEFAULT_LOAD_BAR.labelPosition,
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel),
            },
            labelOutsideDirection: {
                type: ControlType.Enum,
                title: "Vertical Align",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                displaySegmentedControl: true,
                defaultValue: DEFAULT_LOAD_BAR.labelOutsideDirection,
                hidden: (label: any = {}, props: any = {}) => {
                    if (!(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)) return true
                    const placement =
                        label.labelPlacement ?? DEFAULT_LOAD_BAR.labelPlacement
                    const anim =
                        props?.loadBar?.animationStyle ??
                        props?.bar?.animationStyle ??
                        DEFAULT_LOAD_BAR.animationStyle
                    // Show for outside/inline (all animation styles), and for inside when animation is bar
                    if (["outside", "inline"].includes(placement as string))
                        return false
                    if (placement === "inside" && anim === "bar") return false
                    return true
                },
            },
        },
    },
    onReady: { type: ControlType.EventHandler, title: "onReady" },
})
