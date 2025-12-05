/**
 * Loading — Framer Motion edition
 * - Progress bar uses framer-motion (useSpring + motion.div)
 * - Fires onReady once when: all( minTimer, race(ready, timeout) )
 * - Ready = WindowLoad OR (WindowLoad + Fonts + Images [+Bg] + Quiet)
 * - No effect on Canvas/Thumbnail; Preview obeys Run in Preview
 * - Intrinsic sizing only (Framer handles layout/stacking)
 */

/** @framerIntrinsicWidth  300 */
/** @framerIntrinsicHeight 300 */
/** @framerSupportedLayoutWidth any-prefer-fixed */
/** @framerSupportedLayoutHeight any-prefer-fixed */
/** @framerDisableUnlink */

import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, useSpring } from "framer-motion"

// Removed WaitMode - always uses WindowLoad now

type FontControlValue = {
    fontFamily?: string
    family?: string
    fontWeight?: string | number
    weight?: string | number
    fontStyle?: string
    style?: string
    fontSize?: number | string
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
    perpetual: boolean
    perpetualGap: number
    barRadius: number
    barColor: string
    thickness: number
    trackColor: string
    showTrack: boolean
    trackThickness: number
    circleGap: number
    startAtLabel: boolean
    textFillStyle: TextFillStyle
    textFillColor: string
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
    finishDelay: number
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
    loadBar?: Partial<LoadBarConfig>
    bar?: Partial<LoadBarConfig>
    label?: Partial<LoadBarConfig>

    // Auto-hide when complete
    hideWhenComplete: boolean

}

const SESSION_FLAG = "PageReadyGate:ready"

const DEFAULT_LOAD_BAR: LoadBarConfig = {
    animationStyle: "bar",
    fillStyle: "solid",
    lineWidth: 2,
    perpetual: false,
    perpetualGap: 0.5,
    barRadius: 999,
    barColor: "#854FFF",
    thickness: 8,
    trackColor: "rgba(0,0,0,.12)",
    showTrack: true,
    trackThickness: 2,
    circleGap: 12,
    startAtLabel: false,
    textFillStyle: "dynamic",
    textFillColor: "#854FFF",
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
    finishDelay: 0.12,
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

    const progress = useSpring(0, { stiffness: 140, damping: 22 })
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
    const fontSizeFromFont = parseFontSizeValue(fontOverride?.fontSize)

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
    const thickness = coalesce(
        p.thickness,
        nestedBarOverrides.thickness,
        loadBarOverrides.thickness,
        DEFAULT_LOAD_BAR.thickness
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
    const trackThickness = coalesce(
        nestedBarOverrides.trackThickness,
        loadBarOverrides.trackThickness,
        DEFAULT_LOAD_BAR.trackThickness
    )!
    const circleGap = coalesce(
        p.circleGap,
        nestedBarOverrides.circleGap,
        loadBarOverrides.circleGap,
        DEFAULT_LOAD_BAR.circleGap
    )!
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
    const finishDelay = coalesce(
        p.finishDelay,
        nestedBarOverrides.finishDelay,
        loadBarOverrides.finishDelay,
        DEFAULT_LOAD_BAR.finishDelay
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
    const labelFontSize = coalesce(
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
    const labelPlacement = coalesce(
        p.labelPlacement,
        nestedLabelOverrides.labelPlacement,
        loadBarOverrides.labelPlacement,
        DEFAULT_LOAD_BAR.labelPlacement
    )!
    const resolvedLabelPlacement =
        labelPlacement === "hidden"
            ? "hidden"
            : animationStyle === "circle"
            ? labelPlacement
            : labelPlacement === "inline"
            ? "inside"
            : labelPlacement
    const labelOutsideDirection = coalesce(
        p.labelOutsideDirection,
        nestedLabelOverrides.labelOutsideDirection,
        loadBarOverrides.labelOutsideDirection,
        DEFAULT_LOAD_BAR.labelOutsideDirection
    )!
    const labelOffsetX = coalesce(
        p.labelOffsetX,
        nestedLabelOverrides.labelOffsetX,
        loadBarOverrides.labelOffsetX,
        DEFAULT_LOAD_BAR.labelOffsetX ?? 0
    ) ?? 0
    const labelOffsetY = coalesce(
        p.labelOffsetY,
        nestedLabelOverrides.labelOffsetY,
        loadBarOverrides.labelOffsetY,
        DEFAULT_LOAD_BAR.labelOffsetY ?? 0
    ) ?? 0

    const loadBarConfig: LoadBarConfig = {
        animationStyle,
        fillStyle,
        lineWidth,
        perpetual,
        perpetualGap,
        barRadius,
        barColor,
        trackColor,
        showTrack,
        trackThickness,
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
        textDisplayMode,
        textFillStyle,
        textFillColor,
        textPerpetual,
        textReverse,
        finishDelay,
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

    const formatLabel = React.useCallback(
        (value: number) => {
            const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
            const prefix =
                labelTextRaw !== undefined
                    ? labelText
                    : (DEFAULT_LOAD_BAR.labelText || "").trim()
            return prefix ? `${prefix} ${pct}%` : `${pct}%`
        },
        [labelText, labelTextRaw]
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
        if (gatingOff || firedRef.current) return

        console.log("[Gate] Starting gate logic")

        const minSeconds = Math.max(0, p.minSeconds || 0)
        const minMs = minSeconds * 1000
        const timeoutSeconds = Math.max(0, p.timeoutSeconds || 0)
        const timeoutMs = timeoutSeconds * 1000

        console.log("[Gate] Timings:", {
            minSeconds,
            minMs,
            timeoutSeconds,
            timeoutMs,
        })
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
                    console.log("[Gate] Minimum time complete", {
                        elapsedSeconds,
                    })
                    break
                }
                const remainingSeconds = Math.max(
                    0,
                    minSeconds - elapsedSeconds
                )
                const roundedRemaining = Math.ceil(remainingSeconds)
                if (roundedRemaining < lastLoggedRemainder) {
                    lastLoggedRemainder = roundedRemaining
                    console.log("[Gate] Minimum time pending", {
                        elapsedSeconds,
                        remainingSeconds,
                    })
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
                    console.log(
                        "[Gate] Skipping - already ran this session (holding for minimum)"
                    )
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
            console.log("[Gate] Ready state complete")
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
                        console.warn(
                            "[Gate] Timeout reached before ready state"
                        )
                        break
                    }

                    console.log(
                        "[Gate] Minimum met; still waiting for readiness",
                        {
                            elapsedSeconds: getElapsedSeconds(),
                            readyComplete: readyCompleteRef.current,
                        }
                    )
                }
            }

            if (cancelled) return

            console.log("[Gate] Minimum + readiness satisfied, finalizing", {
                timedOut,
                minComplete: minTimerCompleteRef.current,
                readyComplete: readyCompleteRef.current,
            })
            await finalize()
        }

        runGate().catch((err) => console.error("[Gate] runGate error", err))

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

            console.log("[Gate] Finalizing...")

            progress.set(1)
            await waitUntil(() => progress.get() >= 0.995, 1200)
            const hold = Math.max(0, (finishDelay || 0) * 1000)
            if (hold) await delay(hold)

            if (p.onReady) {
                console.log("[Gate] Dispatching onReady event")
                // Fire a synthetic event that matches Framer's expectations for interaction triggers
                p.onReady(createGateEvent(rootRef.current))
            } else {
                console.log(
                    "[Gate] No onReady handler wired; skipping dispatch"
                )
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
        finishDelay,
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
        if (!labelOutside) {
            setLabelBounds({ width: 0, height: 0 })
            return
        }
        const node = labelElement
        if (!node) return
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
    }, [labelOutside, labelElement])

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

    const labelSpacing = 6
    const outsideSpacing = 5
    const BAR_SIDE_MARGIN = 15
    const BAR_LABEL_GAP = 5
    const isBarAnimation = animationStyle === "bar"
    const outsidePadding = {
        top: 0,
        right: isBarAnimation ? BAR_SIDE_MARGIN : 0,
        bottom: 0,
        left: isBarAnimation ? BAR_SIDE_MARGIN : 0,
    }

    if (labelOutside) {
        const labelW = labelBounds.width || 0
        const labelH = labelBounds.height || 0
        if (labelOutsideDirection === "top") {
            outsidePadding.top = Math.max(outsidePadding.top, labelH + outsideSpacing)
        } else if (labelOutsideDirection === "bottom") {
            outsidePadding.bottom = Math.max(
                outsidePadding.bottom,
                labelH + outsideSpacing
            )
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
            case "bar":
                return { width: 600, height: 50 }
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
    const contentHeight = Math.max(
        0,
        measuredHeight - outsidePadding.top - outsidePadding.bottom
    )
    const barContainerHeight = Math.max(
        thickness,
        Math.ceil(labelFontSize * 1.2 + 4)
    )

    const insideLabelOffset: string | undefined = (() => {
        const transforms: string[] = []
        if (labelOffsetX) transforms.push(`translateX(${labelOffsetX}px)`)
        if (labelOffsetY) transforms.push(`translateY(${labelOffsetY}px)`)
        return transforms.length ? transforms.join(" ") : undefined
    })()

    const insideBarPaddingX = Math.max(6, Math.round(thickness * 0.2))
    const insideBarPaddingY = Math.max(4, Math.round(thickness * 0.15))
    const insideVerticalInset = Math.max(
        1,
        showBorder ? Math.round(borderWidth || 0) : 0,
        Math.round(thickness * 0.05)
    )
    const insidePaddingTop =
        labelOutsideDirection === "top" ? insideVerticalInset : insideBarPaddingY
    const insidePaddingBottom =
        labelOutsideDirection === "bottom"
            ? insideVerticalInset
            : insideBarPaddingY
    const insideHorizontalInset = 5
    const insidePaddingLeft =
        insideBarPaddingX + (labelPosition === "left" ? insideHorizontalInset : 0)
    const insidePaddingRight =
        insideBarPaddingX + (labelPosition === "right" ? insideHorizontalInset : 0)

    // Flex-based label overlay for bars (avoids absolute-position drift on canvas)
    const insideLabelOverlayBar: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems:
            labelOutsideDirection === "top"
                ? "flex-start"
                : labelOutsideDirection === "center"
                ? "center"
            : "flex-end",
        justifyContent: mapLabelAlign(labelPosition),
        pointerEvents: "none",
        paddingLeft: insidePaddingLeft,
        paddingRight: insidePaddingRight,
        paddingTop: insidePaddingTop,
        paddingBottom: insidePaddingBottom,
    }

    const outsideLabelTransform: string[] = []
    const outsideLabelStyle: React.CSSProperties = {
        ...baseLabelStyle,
        position: "absolute",
    }
    if (resolvedLabelPlacement === "outside") {
        if (labelOutsideDirection === "top") {
            outsideLabelStyle.top = 0
            outsideLabelTransform.push("translateY(-100%)")
        } else if (labelOutsideDirection === "center") {
            outsideLabelStyle.top = "50%"
            outsideLabelTransform.push("translateY(-50%)")
        } else {
            outsideLabelStyle.top = `calc(100% + ${outsideSpacing}px)`
        }
        switch (labelPosition) {
            case "left":
                outsideLabelStyle.left = 0
                outsideLabelTransform.push(`translateX(calc(-100% - ${outsideSpacing}px))`)
                break
            case "center":
                outsideLabelStyle.left = "50%"
                outsideLabelTransform.push("translateX(-50%)")
                break
            default:
                outsideLabelStyle.right = 0
                outsideLabelTransform.push(`translateX(calc(100% + ${outsideSpacing}px))`)
                break
        }
        if (labelOffsetX !== 0) {
            outsideLabelTransform.push(`translateX(${labelOffsetX}px)`)
        }
        if (labelOffsetY !== 0) {
            outsideLabelTransform.push(`translateY(${labelOffsetY}px)`)
        }
    }
    if (outsideLabelTransform.length > 0) {
        outsideLabelStyle.transform = outsideLabelTransform.join(" ")
    }

    // Use measured container size when available, otherwise use intrinsic size
    // This ensures the component respects the dimensions set by Framer via setAttributes
    const effectiveWidth = containerSize.width > 0 ? containerSize.width : intrinsicSize.width
    const effectiveHeight = containerSize.height > 0 ? containerSize.height : intrinsicSize.height
    
    const rootStyle: React.CSSProperties = {
        ...p.style,
        width: "100%",
        height: "100%",
        // Set minWidth/minHeight to ensure component doesn't shrink below measured/intrinsic size
        minWidth: effectiveWidth,
        minHeight: effectiveHeight,
        position: "relative",
        boxSizing: "border-box",
        paddingTop: outsidePadding.top,
        paddingRight: outsidePadding.right,
        paddingBottom: outsidePadding.bottom,
        paddingLeft: outsidePadding.left,
    }
    if (p.hideWhenComplete && isComplete) {
        rootStyle.display = "none"
    }

    // Perpetual animation state for circle mode
    const [perpetualProgress, setPerpetualProgress] = React.useState(0)
    
    React.useEffect(() => {
        if (animationStyle === "circle" && perpetual) {
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
    
    const progressValue = perpetual && animationStyle === "circle" 
        ? perpetualProgress 
        : currentProgress
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
            const textMode = textDisplayMode || "textAndNumber"
            const pct = Math.round(Math.max(0, Math.min(1, progressValue)) * 100)
            const prefix = (labelText || DEFAULT_LOAD_BAR.labelText || "").trim()
            const textContent =
                textMode === "textOnly"
                    ? prefix || ""
                    : textMode === "numberOnly"
                    ? `${pct}%`
                    : prefix
                    ? `${prefix} ${pct}%`
                    : `${pct}%`

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
            const maskImage = textReverse
                ? `linear-gradient(90deg, transparent ${maskStop}%, #000 ${maskStop}%)`
                : `linear-gradient(90deg, #000 ${maskStop}%, transparent ${maskStop}%)`
            const fillColor = textFillColor || barColor
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
            const baseCircleSize = Math.max(0, Math.min(contentWidth, contentHeight))
            const strokeWidth = thickness
            const trackStroke = showTrack ? trackThickness : 0
            const maxStroke = Math.max(strokeWidth, trackStroke)
            
            // Calculate circle size to fill available space
            // The SVG needs to be large enough to accommodate the circle + stroke width
            // Stroke extends half width inward and half outward from the path
            const strokePadding = maxStroke / 2 + 2 // Half stroke width on each side + 2px safety margin
            const availableSize = Math.max(0, baseCircleSize - strokePadding * 2)
            
            // The SVG size should be the available size (this is the viewport)
            const svgSize = availableSize
            
            // The circle radius is half the available size (stroke will extend from this)
            const circleRadius = Math.max(0, availableSize / 2)
            
            // The actual circle path size (for positioning calculations)
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
            const circleOffsetX = (contentWidth - svgSize) / 2
            const circleOffsetY = (contentHeight - svgSize) / 2
            const circleLabelInset = Math.min(16, Math.max(6, circleSize * 0.08))
            
            return (
                <div style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "visible", // Ensure stroke isn't clipped
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
                        {showTrack && (
                            <circle
                                cx={svgSize / 2}
                                cy={svgSize / 2}
                                r={circleRadius}
                                fill="none"
                                stroke={trackColor}
                                strokeWidth={trackThickness}
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
                                strokeWidth={strokeWidth}
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
            // Lines mode for circle
            <>
                {Array.from({ length: 20 }).map((_, i) => {
                                    const shouldShow = i < Math.floor(progressValue * 20)
                                    if (!shouldShow) return null
                                    const angle = (i / 20) * 360 - 90
                                    const angleDelta = Math.abs(
                                        ((((angle - labelAngle) % 360) + 540) % 360) - 180
                                    )
                                    if (angleDelta <= gapDegrees / 2) return null
                                    const rad = (angle * Math.PI) / 180
                                    const innerRadius = Math.max(0, circleRadius - thickness)
                                    const x1 = svgSize / 2 + circleRadius * Math.cos(rad)
                                    const y1 = svgSize / 2 + circleRadius * Math.sin(rad)
                                    const x2 = svgSize / 2 + innerRadius * Math.cos(rad)
                                    const y2 = svgSize / 2 + innerRadius * Math.sin(rad)
                                    return (
                                        <line
                                            key={i}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke={barColor}
                                            strokeWidth={thickness}
                                            strokeLinecap="round"
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
                                width: svgSize,
                                height: svgSize,
                                left: circleOffsetX,
                                top: circleOffsetY,
                                display: "flex",
                                alignItems:
                                    labelOutsideDirection === "top"
                                        ? "flex-start"
                                        : labelOutsideDirection === "bottom"
                                        ? "flex-end"
                                        : "center",
                                justifyContent: mapLabelAlign(labelPosition),
                                pointerEvents: "none",
                                paddingLeft: circleLabelInset,
                                paddingRight: circleLabelInset,
                                paddingTop: circleLabelInset,
                                paddingBottom: circleLabelInset,
                            }}
                        >
                            <div
                                ref={setLabelRef}
                                style={{
                                    ...baseLabelStyle,
                                    position: "relative",
                                    transform: insideLabelOffset,
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
                                if (labelOffsetY) inlineTransforms.push(`translateY(${labelOffsetY}px)`)
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
        if (fillStyle === "solid") {
            // Solid bar - use content width and center
            return (
                <div
                    style={{
                        width: `${contentWidth}px`,
                        height: `${barContainerHeight}px`,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            width: "100%",
                            height: `${thickness}px`,
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
                                transformOrigin: "left center",
                                scaleX: progress,
                            }}
                        />
                    </div>
                    {labelInside && (
                        <div style={insideLabelOverlayBar}>
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
                </div>
            )
        } else {
            // Lines mode for bar
            const numLines = Math.floor(progressValue * 20)
            const lineRadius = Math.max(0, Math.min(barRadius, thickness / 2))
            return (
                <div
                    style={{
                        width: `${contentWidth}px`, // Use actual content width instead of 100%
                        height: `${barContainerHeight}px`,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            width: "100%",
                            height: `${thickness}px`,
                            background: trackBackground,
                            borderRadius: barRadius,
                            overflow: "hidden",
                            border:
                                showBorder && borderWidth > 0
                                    ? `${borderWidth}px solid ${borderColor}`
                                    : "none",
                            boxSizing: "border-box",
                            display: "flex",
                            gap: 2,
                            padding: 2,
                            transform: "translateY(-50%)",
                        }}
                    >
                        {Array.from({ length: 20 }).map((_, i) => {
                            const shouldShow = i < numLines
                            return (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: "100%",
                                        background: shouldShow ? barColor : trackBackground,
                                        borderRadius: lineRadius,
                                        opacity: shouldShow ? 1 : showTrack ? 0.3 : 0,
                                        transition: "all 0.2s ease",
                                    }}
                                />
                            )
                        })}
                    </div>
                    {labelInside && (
                        <div style={insideLabelOverlayBar}>
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
                </div>
            )
        }
    }

    // Content wrapper to center the content within the container
    // Use absolute positioning to fill the space inside the root padding
    const contentWrapperStyle: React.CSSProperties = {
        position: "absolute",
        top: outsidePadding.top,
        left: outsidePadding.left,
        right: outsidePadding.right,
        bottom: outsidePadding.bottom,
        display: "flex",
        alignItems: "center", // Center vertically
        justifyContent: animationStyle === "circle" ? "center" : "flex-start", // Left for bar/text, center for circle
    }

    return (
        <div ref={rootRef} style={rootStyle}>
            <div style={contentWrapperStyle}>
                {renderContent()}
            </div>
            {labelOutside && (
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
        optionTitles: ["Static", "Dynamic", "One by One"],
        displaySegmentedControl: true,
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
      textPerpetual: {
        type: ControlType.Boolean,
        title: "Perpetual (Text)",
        defaultValue: DEFAULT_LOAD_BAR.textPerpetual,
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
      lineWidth: {
        type: ControlType.Number,
        title: "Line Width",
        min: 1,
        max: 20,
        step: 0.5,
        defaultValue: DEFAULT_LOAD_BAR.lineWidth,
        displayStepper: true,
        hidden: (bar: any = {}) => {
          const style = bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle;
          const fill = bar.fillStyle ?? DEFAULT_LOAD_BAR.fillStyle;
          return style === "text" || fill !== "lines";
        },
      },
      perpetual: {
        type: ControlType.Boolean,
        title: "Perpetual (Circle)",
        defaultValue: DEFAULT_LOAD_BAR.perpetual,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "circle",
      },
      perpetualGap: {
        type: ControlType.Number,
        title: "Perpetual Gap (s)",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: DEFAULT_LOAD_BAR.perpetualGap,
        displayStepper: true,
        hidden: (bar: any = {}) => {
          const anim = bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle;
          const perpetual =
            bar.perpetual ?? DEFAULT_LOAD_BAR.perpetual;
          return anim !== "circle" || !perpetual;
        },
      },
      startAtLabel: {
        type: ControlType.Boolean,
        title: "Start at Label",
        defaultValue: DEFAULT_LOAD_BAR.startAtLabel,
        hidden: (bar: any = {}) =>
          (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) !== "circle",
      },
            barRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0,
                max: 999,
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
            thickness: {
                type: ControlType.Number,
                title: "Thickness",
                min: 1,
                max: 50,
                step: 1,
                defaultValue: DEFAULT_LOAD_BAR.thickness,
                displayStepper: true,
                hidden: (bar: any = {}) =>
                    (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text",
            },
            showTrack: {
                type: ControlType.Boolean,
                title: "Track",
                defaultValue: DEFAULT_LOAD_BAR.showTrack,
                hidden: (bar: any = {}) =>
                    (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text",
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
                    (bar.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle) === "text" ||
                    !(bar.showTrack ?? DEFAULT_LOAD_BAR.showTrack),
            },
            finishDelay: {
                type: ControlType.Number,
                title: "Finish Delay (s)",
                min: 0,
                max: 2,
                step: 0.05,
                defaultValue: DEFAULT_LOAD_BAR.finishDelay,
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
                optionTitles: ["Text Only", "Text & Numbers", "Numbers Only"],
                displaySegmentedControl: true,
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
                    fontFamily: DEFAULT_LOAD_BAR.labelFontFamily,
                    fontWeight: DEFAULT_LOAD_BAR.labelFontWeight,
                    fontSize: `${DEFAULT_LOAD_BAR.labelFontSize}px`,
                },
                defaultFontType: "sans-serif",
                defaultFontSize: `${DEFAULT_LOAD_BAR.labelFontSize}px`,
                displayFontSize: true,
                displayTextAlignment: false,
                controls: "extended",
                hidden: (label: any = {}) =>
                    !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel),
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
                    const placement = label.labelPlacement ?? DEFAULT_LOAD_BAR.labelPlacement
                    const anim = props?.loadBar?.animationStyle ?? props?.bar?.animationStyle ?? DEFAULT_LOAD_BAR.animationStyle
                    // Show for outside/inline (all animation styles), and for inside when animation is bar
                    if (["outside", "inline"].includes(placement as string)) return false
                    if (placement === "inside" && anim === "bar") return false
                    return true
                },
            },
            labelPlacement: {
                type: ControlType.Enum,
                title: "Placement",
                options: ["inside", "outside", "inline"],
                optionTitles: ["Inside", "Outside", "Inline"],
                displaySegmentedControl: true,
                defaultValue: DEFAULT_LOAD_BAR.labelPlacement,
                hidden: (label: any = {}, props: any = {}) => {
                    if (!(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)) return true
                    const anim =
                        props?.loadBar?.animationStyle ??
                        props?.bar?.animationStyle ??
                        DEFAULT_LOAD_BAR.animationStyle
                    return anim !== "circle"
                        ? (label.labelPlacement ?? DEFAULT_LOAD_BAR.labelPlacement) === "inline"
                        : false
                },
            },
        },
    },
    onReady: { type: ControlType.EventHandler, title: "onReady" },
})
