// Loading.tsx
// Email check for console messages
(function() {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    const isJessEmail = () => {
        try {
            const raw = window.localStorage.getItem("loading_auth_snapshot_v1");
            if (!raw) return false;
            const snapshot = JSON.parse(raw);
            const email = typeof snapshot?.email === "string" ? snapshot.email : "";
            return email === "jess@mojavestud.io";
        } catch {
            return false;
        }
    };
    
    const shouldLogGateMessage = () => {
        return isJessEmail();
    };
    
    console.log = function(...args) {
        const message = args.join(" ");
        if (typeof message === "string" && message.includes("[Gate]")) {
            if (!shouldLogGateMessage()) {
                return;
            }
        }
        originalConsoleLog.apply(console, args);
    };
    
    console.warn = function(...args) {
        const message = args.join(" ");
        if (typeof message === "string" && message.includes("[Gate]")) {
            if (!shouldLogGateMessage()) {
                return;
            }
        }
        originalConsoleWarn.apply(console, args);
    };
    
    console.error = function(...args) {
        const message = args.join(" ");
        if (typeof message === "string" && message.includes("[Gate]")) {
            if (!shouldLogGateMessage()) {
                return;
            }
        }
        originalConsoleError.apply(console, args);
    };
})();

import * as React from "react";
import { addPropertyControls, ControlType, RenderTarget, useIsStaticRenderer } from "framer";
import { motion, useSpring } from "framer-motion";
var SESSION_FLAG = "PageReadyGate:ready";
var WEIGHTS = { assets: 0.6, fonts: 0.2, load: 0.2 };
var DEFAULT_LOAD_BAR = {
  showProgressBar: true,
  barRadius: 999,
  barColor: "#854FFF",
  trackColor: "rgba(0,0,0,.12)",
  showLabel: true,
  labelColor: "#222",
  labelFontSize: 11,
  labelFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  labelFontWeight: 600,
  labelFont: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: 600,
    fontSize: 11
  },
  labelPosition: "right",
  labelPlacement: "inside",
  labelOutsideDirection: "bottom",
  showBorder: false,
  borderWidth: 2,
  borderColor: "rgba(0,0,0,.2)"
};
var MIN_TIMER_PROGRESS_WEIGHT = 0.8;
var MAX_PROGRESS_BEFORE_FINAL = 0.98;
function Loading(p) {
  const isStaticRenderer = useIsStaticRenderer();
  const t = RenderTarget.current();
  const isPreview = t === RenderTarget.preview;
  const runInPreview = p.runInPreview ?? true;
  const isDesignPreview = isStaticRenderer;
  const gatingOff = isStaticRenderer || (isPreview && !runInPreview);
  const DESIGN_PREVIEW_PROGRESS = 0.42;
  const progress = useSpring(isDesignPreview ? DESIGN_PREVIEW_PROGRESS : 0, { stiffness: 140, damping: 22 });
  const labelRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const gateStartRef = React.useRef(null);
  const timerProgressRef = React.useRef(0);
  const readinessProgressRef = React.useRef(0);
  const loadBarOverrides = p.loadBar || {};
  const rootBarOverrides = p.bar || {};
  const rootLabelOverrides = p.label || {};
  const nestedBarOverrides = {
    ...loadBarOverrides.bar || {},
    ...rootBarOverrides
  };
  const nestedLabelOverrides = {
    ...loadBarOverrides.label || {},
    ...rootLabelOverrides
  };
  const fontOverride = nestedLabelOverrides.labelFont ?? loadBarOverrides.labelFont ?? DEFAULT_LOAD_BAR.labelFont;
  const fontSizeFromFont = parseFontSizeValue(fontOverride?.fontSize);
  const showProgressBar = coalesce(
    p.showProgressBar,
    nestedBarOverrides.showProgressBar,
    loadBarOverrides.showProgressBar,
    DEFAULT_LOAD_BAR.showProgressBar
  );
  const barRadius = coalesce(
    p.barRadius,
    nestedBarOverrides.barRadius,
    loadBarOverrides.barRadius,
    DEFAULT_LOAD_BAR.barRadius
  );
  const barColor = coalesce(
    p.barColor,
    nestedBarOverrides.barColor,
    loadBarOverrides.barColor,
    DEFAULT_LOAD_BAR.barColor
  );
  const trackColor = coalesce(
    p.trackColor,
    nestedBarOverrides.trackColor,
    loadBarOverrides.trackColor,
    DEFAULT_LOAD_BAR.trackColor
  );
  const showBorder = coalesce(
    p.showBorder,
    nestedBarOverrides.showBorder,
    loadBarOverrides.showBorder,
    DEFAULT_LOAD_BAR.showBorder
  );
  const borderWidth = coalesce(
    p.borderWidth,
    nestedBarOverrides.borderWidth,
    loadBarOverrides.borderWidth,
    DEFAULT_LOAD_BAR.borderWidth
  );
  const borderColor = coalesce(
    p.borderColor,
    nestedBarOverrides.borderColor,
    loadBarOverrides.borderColor,
    DEFAULT_LOAD_BAR.borderColor
  );
  const showLabel = coalesce(
    p.showLabel,
    nestedLabelOverrides.showLabel,
    loadBarOverrides.showLabel,
    DEFAULT_LOAD_BAR.showLabel
  );
  const labelColor = coalesce(
    p.labelColor,
    nestedLabelOverrides.labelColor,
    loadBarOverrides.labelColor,
    DEFAULT_LOAD_BAR.labelColor
  );
  const labelFontSize = coalesce(
    p.labelFontSize,
    nestedLabelOverrides.labelFontSize,
    loadBarOverrides.labelFontSize,
    fontSizeFromFont,
    DEFAULT_LOAD_BAR.labelFontSize
  );
  const labelFontFamily = coalesce(
    p.labelFontFamily,
    nestedLabelOverrides.labelFontFamily,
    loadBarOverrides.labelFontFamily,
    fontOverride?.fontFamily,
    fontOverride?.family,
    DEFAULT_LOAD_BAR.labelFontFamily
  );
  const labelFontWeight = coalesce(
    p.labelFontWeight,
    nestedLabelOverrides.labelFontWeight,
    loadBarOverrides.labelFontWeight,
    fontOverride?.fontWeight,
    fontOverride?.weight,
    DEFAULT_LOAD_BAR.labelFontWeight
  );
  const labelPosition = coalesce(
    p.labelPosition,
    nestedLabelOverrides.labelPosition,
    loadBarOverrides.labelPosition,
    DEFAULT_LOAD_BAR.labelPosition
  );
  const labelPlacement = coalesce(
    p.labelPlacement,
    nestedLabelOverrides.labelPlacement,
    loadBarOverrides.labelPlacement,
    DEFAULT_LOAD_BAR.labelPlacement
  );
  const labelOutsideDirection = coalesce(
    p.labelOutsideDirection,
    nestedLabelOverrides.labelOutsideDirection,
    loadBarOverrides.labelOutsideDirection,
    DEFAULT_LOAD_BAR.labelOutsideDirection
  );
  const loadBarConfig = {
    showProgressBar,
    barRadius,
    barColor,
    trackColor,
    showLabel,
    labelColor,
    labelFontSize,
    labelFontFamily,
    labelFontWeight,
    labelFont: fontOverride,
  labelPosition,
  labelPlacement,
  labelOutsideDirection,
  showBorder,
    borderWidth,
    borderColor
  };
  React.useEffect(() => {
    if (!showProgressBar || !showLabel) return;
    const unsub = progress.on("change", (v) => {
      if (labelRef.current)
        labelRef.current.textContent = `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [showProgressBar, showLabel, progress]);
  const firedRef = React.useRef(false);
  const minTimerCompleteRef = React.useRef(false);
  const readyCompleteRef = React.useRef(false);
  const [isComplete, setIsComplete] = React.useState(false);
  React.useEffect(() => {
    if (gatingOff || firedRef.current) return;
    console.log("[Gate] Starting gate logic");
    const minSeconds = Math.max(0, p.minSeconds || 0);
    const minMs = minSeconds * 1e3;
    const timeoutSeconds = Math.max(0, p.timeoutSeconds || 0);
    const timeoutMs = timeoutSeconds * 1e3;
    const quietSeconds = Math.max(0, p.quietSeconds || 0.5);
    const quietMs = quietSeconds * 1e3;
    console.log("[Gate] Timings:", {
      minSeconds,
      minMs,
      timeoutSeconds,
      timeoutMs,
      quietSeconds,
      quietMs
    });
    gateStartRef.current = performance.now();
    minTimerCompleteRef.current = minMs === 0;
    let cancelled = false;
    const timerWeight = minSeconds > 0 ? MIN_TIMER_PROGRESS_WEIGHT : 0;
    const readinessWeight = 1 - timerWeight;
    const applyCombinedProgress = () => {
      const timerComponent = timerProgressRef.current * timerWeight;
      const readinessComponent = readinessProgressRef.current * readinessWeight;
      const combined = timerComponent + readinessComponent;
      progress.set(Math.min(MAX_PROGRESS_BEFORE_FINAL, combined));
    };
    const setTimerProgress = (value) => {
      const clamped = clampValue(value);
      if (timerProgressRef.current === clamped) return;
      timerProgressRef.current = clamped;
      applyCombinedProgress();
    };
    const setReadinessProgress = (value) => {
      const clamped = clampValue(value);
      if (readinessProgressRef.current === clamped) return;
      readinessProgressRef.current = clamped;
      applyCombinedProgress();
    };
    timerProgressRef.current = 0;
    readinessProgressRef.current = 0;
    applyCombinedProgress();
    if (minTimerCompleteRef.current) {
      setTimerProgress(1);
    }
    const getElapsedSeconds = () => {
      const start = gateStartRef.current;
      return start == null ? 0 : (performance.now() - start) / 1e3;
    };
    const MINIMUM_WAIT_POLL_SECONDS = 0.25;
    const waitForMinimum = async () => {
      if (minTimerCompleteRef.current) return;
      let lastLoggedRemainder = Number.POSITIVE_INFINITY;
      while (!cancelled) {
        const elapsedSeconds = getElapsedSeconds();
        if (minSeconds > 0) {
          setTimerProgress(elapsedSeconds / minSeconds);
        }
        if (elapsedSeconds >= minSeconds) {
          minTimerCompleteRef.current = true;
          setTimerProgress(1);
          console.log("[Gate] Minimum time complete", { elapsedSeconds });
          break;
        }
        const remainingSeconds = Math.max(0, minSeconds - elapsedSeconds);
        const roundedRemaining = Math.ceil(remainingSeconds);
        if (roundedRemaining < lastLoggedRemainder) {
          lastLoggedRemainder = roundedRemaining;
          console.log("[Gate] Minimum time pending", {
            elapsedSeconds,
            remainingSeconds
          });
        }
        const sleepSeconds = Math.min(MINIMUM_WAIT_POLL_SECONDS, remainingSeconds);
        await delay(Math.max(16, sleepSeconds * 1e3));
      }
    };
    if (p.oncePerSession) {
      try {
        if (sessionStorage.getItem(SESSION_FLAG) === "1") {
          console.log("[Gate] Skipping - already ran this session (holding for minimum)");
          void finalize();
          return;
        }
      } catch {
      }
    }
    let loadDone = document.readyState === "complete";
    let fontsDone = p.waitMode === "FontsAndImages" ? false : true;
    let assetsFrac = p.waitMode === "FontsAndImages" ? 0 : 1;
    bumpBlend();
    function setBlend(opts) {
      if (opts.loadDone !== void 0) loadDone = opts.loadDone;
      if (opts.fontsDone !== void 0) fontsDone = opts.fontsDone;
      if (opts.assetsFrac !== void 0) assetsFrac = opts.assetsFrac;
      bumpBlend();
    }
    function bumpBlend() {
      const blended = WEIGHTS.assets * clampValue(assetsFrac) + WEIGHTS.fonts * (fontsDone ? 1 : 0) + WEIGHTS.load * (loadDone ? 1 : 0);
      setReadinessProgress(Math.min(1, blended));
    }
    const waitWindow = waitForWindowLoad(
      (done) => setBlend({ loadDone: done })
    );
    const readyStrict = p.waitMode === "FontsAndImages" ? waitForStrictAssets({
      scopeSelector: p.imageScopeSelector,
      includeBackgrounds: p.includeBackgrounds,
      quietMs,
      onAssetsProgress: (f) => setBlend({ assetsFrac: f }),
      onFontsReady: (d) => setBlend({ fontsDone: d })
    }) : Promise.resolve();
    const baseReady = p.waitMode === "WindowLoad" ? waitWindow : Promise.all([waitWindow, readyStrict]).then(() => {
    });
    const customReadyHandle = createCustomReadyWait({
      selector: p.customReadySelector,
      eventName: p.customReadyEvent
    });
    if (customReadyHandle) {
      console.log("[Gate] Waiting for custom selector", p.customReadySelector, "event:", p.customReadyEvent || "load");
    }
    const ready = customReadyHandle ? Promise.all([baseReady, customReadyHandle.promise]).then(() => {
    }) : baseReady;
    let timeoutHandle;
    let timeoutReached = false;
    const timeoutPromise = timeoutMs > 0 ? new Promise((resolve) => {
      timeoutHandle = window.setTimeout(() => {
        timeoutReached = true;
        resolve("timeout");
      }, timeoutMs);
    }) : null;
    const readySignalPromise = ready.then(() => {
      console.log("[Gate] Ready state complete");
      readyCompleteRef.current = true;
    });
    const POST_MINIMUM_POLL_MS = 1e3;
    const runGate = async () => {
      await waitForMinimum();
      if (cancelled) return;
      let timedOut = timeoutReached;
      if (!timedOut && readyCompleteRef.current) {
      } else {
        while (!cancelled && !timedOut) {
          if (readyCompleteRef.current) {
            break;
          }
          let outcome;
          if (timeoutPromise) {
            outcome = await Promise.race([
              readySignalPromise.then(() => "ready"),
              timeoutPromise,
              delay(POST_MINIMUM_POLL_MS).then(() => "tick")
            ]);
          } else {
            outcome = await Promise.race([
              readySignalPromise.then(() => "ready"),
              delay(POST_MINIMUM_POLL_MS).then(() => "tick")
            ]);
          }
          if (cancelled) return;
          if (outcome === "ready") {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = void 0;
            }
            break;
          }
          if (outcome === "timeout") {
            timedOut = true;
            console.warn("[Gate] Timeout reached before ready state");
            break;
          }
          console.log("[Gate] Minimum met; still waiting for readiness", {
            elapsedSeconds: getElapsedSeconds(),
            readyComplete: readyCompleteRef.current
          });
        }
      }
      if (cancelled) return;
      console.log("[Gate] Minimum + readiness satisfied, finalizing", {
        timedOut,
        minComplete: minTimerCompleteRef.current,
        readyComplete: readyCompleteRef.current
      });
      await finalize();
    };
    runGate().catch((err) => console.error("[Gate] runGate error", err));
    async function finalize(options) {
      if (firedRef.current) return;
      firedRef.current = true;
      if (!options?.skipMinimumCheck && minMs > 0 && !minTimerCompleteRef.current) {
        await waitForMinimum();
      }
      console.log("[Gate] Finalizing...");
      if (showProgressBar) {
        progress.set(1);
        await waitUntil(() => progress.get() >= 0.995, 1200);
      }
      if (p.onReady) {
        console.log("[Gate] Dispatching onReady event");
        p.onReady(createGateEvent(rootRef.current));
      } else {
        console.log("[Gate] No onReady handler wired; skipping dispatch");
      }
      if (p.oncePerSession) {
        try {
          sessionStorage.setItem(SESSION_FLAG, "1");
        } catch {
        }
      }
      setIsComplete(true);
    }
    return () => {
      cancelled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      customReadyHandle?.cancel();
      minTimerCompleteRef.current = false;
      readyCompleteRef.current = false;
      gateStartRef.current = null;
    };
  }, [
    gatingOff,
    p.waitMode,
    p.imageScopeSelector,
    p.includeBackgrounds,
    p.quietSeconds,
    p.minSeconds,
    p.timeoutSeconds,
    p.oncePerSession,
    p.onReady,
    p.customReadySelector,
    p.customReadyEvent,
    showProgressBar,
    progress
  ]);
  const labelStyle = {
    position: "absolute",
    fontSize: labelFontSize,
    fontFamily: labelFontFamily,
    fontWeight: labelFontWeight,
    color: labelColor,
    pointerEvents: "none"
  };
  const appliedFont = fontOverride || DEFAULT_LOAD_BAR.labelFont;
  const fontStyleValue = appliedFont?.fontStyle ?? appliedFont?.style;
  if (fontStyleValue) labelStyle.fontStyle = fontStyleValue;
  if (appliedFont?.letterSpacing != null)
    labelStyle.letterSpacing = appliedFont.letterSpacing;
  if (appliedFont?.lineHeight != null)
    labelStyle.lineHeight = appliedFont.lineHeight;
  if (labelPlacement === "inside") {
    labelStyle.top = "50%";
    switch (labelPosition) {
      case "left":
        labelStyle.left = 8;
        labelStyle.transform = "translateY(-50%)";
        break;
      case "center":
        labelStyle.left = "50%";
        labelStyle.transform = "translate(-50%, -50%)";
        break;
      default:
        labelStyle.right = 8;
        labelStyle.transform = "translateY(-50%)";
    }
  } else {
    if (labelOutsideDirection === "top") {
      labelStyle.bottom = "100%";
      labelStyle.marginBottom = 6;
    } else {
      labelStyle.top = "100%";
      labelStyle.marginTop = 6;
    }
    switch (labelPosition) {
      case "left":
        labelStyle.left = 0;
        break;
      case "center":
        labelStyle.left = "50%";
        labelStyle.transform = "translateX(-50%)";
        break;
      default:
        labelStyle.right = 0;
        break;
    }
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: rootRef,
      style: {
        ...p.style,
        width: "100%",
        height: "100%",
        position: "relative",
        display: p.hideWhenComplete && isComplete ? "none" : void 0
      }
    },
    showProgressBar && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: trackColor,
          borderRadius: barRadius,
          overflow: "hidden",
          border: showBorder && borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
          boxSizing: "border-box"
        }
      },
      /* @__PURE__ */ React.createElement(
        motion.div,
        {
          style: {
            width: "100%",
            height: "100%",
            background: barColor,
            borderRadius: barRadius,
            transformOrigin: "left center",
            scaleX: progress
          }
        }
      )
    ),
    showProgressBar && showLabel && /* @__PURE__ */ React.createElement("div", { ref: labelRef, style: labelStyle }, "0%")
  );
}
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
function waitUntil(pred, timeoutMs) {
  return new Promise((res) => {
    const deadline = performance.now() + timeoutMs;
    const step = () => {
      if (pred() || performance.now() >= deadline) return res();
      requestAnimationFrame(step);
    };
    step();
  });
}
function waitForWindowLoad(onProgress) {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      onProgress(true);
      return resolve();
    }
    onProgress(false);
    const onLoad = () => {
      window.removeEventListener("load", onLoad);
      onProgress(true);
      resolve();
    };
    window.addEventListener("load", onLoad, { once: true });
  });
}
function waitForStrictAssets(opts) {
  const root = opts.scopeSelector ? document.querySelector(opts.scopeSelector) || document : document;
  let total = 0, done = 0, pending = 0;
  let quietTO;
  let resolveQuiet;
  const quietPromise = new Promise((res) => resolveQuiet = res);
  const recompute = () => {
    const frac = total ? done / total : 1;
    opts.onAssetsProgress(frac);
  };
  const scheduleQuiet = () => {
    if (quietTO) clearTimeout(quietTO);
    if (pending === 0) {
      quietTO = window.setTimeout(() => {
        if (pending === 0) resolveQuiet();
      }, opts.quietMs);
    }
  };
  const addAsset = (waiter) => {
    total += 1;
    pending += 1;
    waiter.finally(() => {
      done += 1;
      pending -= 1;
      recompute();
      scheduleQuiet();
    });
    recompute();
  };
  const anyDoc = document;
  const fontsReady = anyDoc.fonts?.ready ? anyDoc.fonts.ready.catch(() => {
  }) : Promise.resolve();
  fontsReady.finally(() => opts.onFontsReady(true));
  const seenImgs = /* @__PURE__ */ new WeakSet();
  const handleImg = (img) => {
    if (seenImgs.has(img)) return;
    seenImgs.add(img);
    if (img.complete) addAsset(Promise.resolve());
    else if (img.decode)
      addAsset(img.decode().catch(() => {
      }));
    else
      addAsset(
        new Promise((res) => {
          const done2 = () => {
            img.removeEventListener("load", done2);
            img.removeEventListener("error", done2);
            res();
          };
          img.addEventListener("load", done2, { once: true });
          img.addEventListener("error", done2, { once: true });
        })
      );
  };
  const seenBg = /* @__PURE__ */ new Set();
  const preloadBg = (url) => {
    if (!url || seenBg.has(url)) return;
    seenBg.add(url);
    addAsset(
      new Promise((res) => {
        const i = new Image();
        i.onload = () => res();
        i.onerror = () => res();
        i.decoding = "async";
        i.src = url;
      })
    );
  };
  const extractBgUrls = (el) => {
    const s = getComputedStyle(el);
    const bg = s.backgroundImage;
    if (!bg || bg === "none") return;
    const urls = Array.from(bg.matchAll(/url\((['"]?)(.*?)\1\)/g)).map(
      (m) => m[2]
    );
    urls.forEach(preloadBg);
  };
  const docOrEl = root instanceof Document ? document : root;
  docOrEl.querySelectorAll?.("img").forEach((n) => handleImg(n));
  if (opts.includeBackgrounds)
    docOrEl.querySelectorAll?.("*").forEach((n) => extractBgUrls(n));
  scheduleQuiet();
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node;
        if (el instanceof HTMLImageElement) handleImg(el);
        el.querySelectorAll?.("img").forEach((img) => handleImg(img));
        if (opts.includeBackgrounds) extractBgUrls(el);
      });
    });
    scheduleQuiet();
  });
  mo.observe(
    docOrEl instanceof Document ? document.documentElement : docOrEl,
    { childList: true, subtree: true }
  );
  return Promise.all([fontsReady.then(() => void 0), quietPromise]).then(
    () => mo.disconnect()
  );
}
function clampValue(n) {
  return Math.max(0, Math.min(1, n));
}
function parseFontSizeValue(value) {
  if (value == null) return void 0;
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.trim().match(/^([0-9]*\.?[0-9]+)/);
    if (match) return parseFloat(match[1]);
  }
  return void 0;
}
function coalesce(...values) {
  for (const value of values) {
    if (value !== void 0 && value !== null) return value;
  }
  return void 0;
}
function createGateEvent(target) {
  let defaultPrevented = false;
  let propagationStopped = false;
  return {
    type: "Load",
    target,
    currentTarget: target,
    timeStamp: performance.now(),
    bubbles: true,
    cancelable: true,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault() {
      defaultPrevented = true;
    },
    isDefaultPrevented() {
      return defaultPrevented;
    },
    stopPropagation() {
      propagationStopped = true;
    },
    isPropagationStopped() {
      return propagationStopped;
    },
    persist() {
    },
    nativeEvent: void 0
  };
}
function createCustomReadyWait(opts) {
  const selector = (opts.selector || "").trim();
  if (!selector || typeof document === "undefined") return null;
  const eventName = (opts.eventName || "load").trim() || "load";
  let resolve;
  let finished = false;
  let pending = 0;
  let seenMatch = false;
  const teardownMap = /* @__PURE__ */ new Map();
  const promise = new Promise((res) => resolve = res);
  let observer = null;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    observer?.disconnect();
    teardownMap.forEach((off) => off());
    teardownMap.clear();
    resolve();
  };
  const maybeFinish = () => {
    if (pending === 0 && seenMatch) cleanup();
  };
  const settleElement = (el) => {
    const off = teardownMap.get(el);
    if (!off) return;
    off();
    teardownMap.delete(el);
    pending -= 1;
    maybeFinish();
  };
  const isAlreadyLoaded = (el) => {
    if (eventName !== "load") return false;
    const anyEl = el;
    if (typeof anyEl.complete === "boolean" && anyEl.complete) return true;
    if (typeof anyEl.readyState === "string" && anyEl.readyState === "complete") return true;
    if (anyEl.dataset) {
      if (anyEl.dataset.loaded === "true" || anyEl.dataset.ready === "true") return true;
    }
    if (typeof anyEl.getAttribute === "function") {
      const dl = anyEl.getAttribute("data-loaded");
      const dr = anyEl.getAttribute("data-ready");
      if (dl === "true" || dr === "true") return true;
    }
    return false;
  };
  const watchElement = (el) => {
    if (teardownMap.has(el)) return;
    seenMatch = true;
    if (isAlreadyLoaded(el)) {
      maybeFinish();
      return;
    }
    pending += 1;
    const handler = () => settleElement(el);
    el.addEventListener(eventName, handler, { once: true });
    teardownMap.set(el, () => el.removeEventListener(eventName, handler));
  };
  const seed = Array.from(document.querySelectorAll(selector));
  seed.forEach((el) => watchElement(el));
  maybeFinish();
  observer = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node;
        if (el.matches(selector)) watchElement(el);
        el.querySelectorAll?.(selector).forEach((match) => watchElement(match));
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (pending === 0 && seenMatch) {
    cleanup();
  }
  return {
    promise,
    cancel: () => {
      if (finished) return;
      finished = true;
      observer?.disconnect();
      teardownMap.forEach((off) => off());
      teardownMap.clear();
      resolve();
    }
  };
}
Loading.displayName = "Loading...";
Loading.defaultProps = {
  waitMode: "FontsAndImages",
  imageScopeSelector: "",
  includeBackgrounds: true,
  quietSeconds: 0.6,
  minSeconds: 0.6,
  timeoutSeconds: 12,
  oncePerSession: false,
  runInPreview: true,
  hideWhenComplete: false,
  customReadySelector: "",
  customReadyEvent: "load",
  loadBar: DEFAULT_LOAD_BAR
};
addPropertyControls(Loading, {
  waitMode: {
    type: ControlType.Enum,
    title: "Wait For",
    options: ["FontsAndImages", "WindowLoad"],
    optionTitles: ["Fonts + Images", "Window load"]
  },
  imageScopeSelector: {
    type: ControlType.String,
    title: "Images in\u2026 (CSS)",
    placeholder: "#hero, .aboveFold",
    hidden: (p) => p.waitMode === "WindowLoad"
  },
  includeBackgrounds: {
    type: ControlType.Boolean,
    title: "Bg Images",
    defaultValue: true,
    hidden: (p) => p.waitMode === "WindowLoad"
  },
  quietSeconds: {
    type: ControlType.Number,
    title: "Quiet (s)",
    min: 0.2,
    max: 5,
    step: 0.1,
    defaultValue: 0.6,
    displayStepper: true,
    hidden: (p) => p.waitMode === "WindowLoad"
  },
  minSeconds: {
    type: ControlType.Number,
    title: "Min (s)",
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: 0.6,
    displayStepper: true
  },
  timeoutSeconds: {
    type: ControlType.Number,
    title: "Timeout (s)",
    min: 1,
    max: 120,
    step: 1,
    defaultValue: 12,
    displayStepper: true
  },
  oncePerSession: {
    type: ControlType.Boolean,
    title: "Once / Session",
    defaultValue: false
  },
  runInPreview: {
    type: ControlType.Boolean,
    title: "Run in Preview",
    defaultValue: true
  },
  hideWhenComplete: {
    type: ControlType.Boolean,
    title: "Hide When Complete",
    defaultValue: false
  },
  customReadySelector: {
    type: ControlType.String,
    title: "Wait Selector",
    placeholder: "spline-viewer"
  },
  customReadyEvent: {
    type: ControlType.String,
    title: "Wait Event",
    placeholder: "load",
    hidden: (p) => !p.customReadySelector
  },
  bar: {
    type: ControlType.Object,
    title: "Load Bar",
    controls: {
      showProgressBar: {
        type: ControlType.Boolean,
        title: "Show Progress Bar",
        defaultValue: DEFAULT_LOAD_BAR.showProgressBar
      },
      barRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 999,
        defaultValue: DEFAULT_LOAD_BAR.barRadius,
        displayStepper: true,
        hidden: (bar = {}) => !(bar.showProgressBar ?? DEFAULT_LOAD_BAR.showProgressBar)
      },
      barColor: {
        type: ControlType.Color,
        title: "Bar",
        defaultValue: DEFAULT_LOAD_BAR.barColor,
        hidden: (bar = {}) => !(bar.showProgressBar ?? DEFAULT_LOAD_BAR.showProgressBar)
      },
      trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: DEFAULT_LOAD_BAR.trackColor,
        hidden: (bar = {}) => !(bar.showProgressBar ?? DEFAULT_LOAD_BAR.showProgressBar)
      },
      showBorder: {
        type: ControlType.Boolean,
        title: "Border",
        defaultValue: DEFAULT_LOAD_BAR.showBorder,
        hidden: (bar = {}) => !(bar.showProgressBar ?? DEFAULT_LOAD_BAR.showProgressBar)
      },
      borderWidth: {
        type: ControlType.Number,
        title: "Border Width",
        min: 1,
        max: 12,
        defaultValue: DEFAULT_LOAD_BAR.borderWidth,
        displayStepper: true,
        hidden: (bar = {}) => !(bar.showProgressBar ?? DEFAULT_LOAD_BAR.showProgressBar) || !(bar.showBorder ?? DEFAULT_LOAD_BAR.showBorder)
      },
      borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: DEFAULT_LOAD_BAR.borderColor,
        hidden: (bar = {}) => !(bar.showProgressBar ?? DEFAULT_LOAD_BAR.showProgressBar) || !(bar.showBorder ?? DEFAULT_LOAD_BAR.showBorder)
      }
    }
  },
  label: {
    type: ControlType.Object,
    title: "Label",
    controls: {
      showLabel: {
        type: ControlType.Boolean,
        title: "Show Label",
        defaultValue: DEFAULT_LOAD_BAR.showLabel
      },
      labelColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: DEFAULT_LOAD_BAR.labelColor,
        hidden: (label = {}) => !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)
      },
      labelFont: {
        type: ControlType.Font,
        title: "Font",
        defaultValue: {
          fontFamily: DEFAULT_LOAD_BAR.labelFontFamily,
          fontWeight: DEFAULT_LOAD_BAR.labelFontWeight,
          fontSize: `${DEFAULT_LOAD_BAR.labelFontSize}px`
        },
        defaultFontType: "sans-serif",
        defaultFontSize: `${DEFAULT_LOAD_BAR.labelFontSize}px`,
        displayFontSize: true,
        displayTextAlignment: false,
        controls: "extended",
        hidden: (label = {}) => !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)
      },
      labelPosition: {
        type: ControlType.Enum,
        title: "Align",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
        displaySegmentedControl: true,
        defaultValue: DEFAULT_LOAD_BAR.labelPosition,
        hidden: (label = {}) => !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)
      },
      labelPlacement: {
        type: ControlType.Enum,
        title: "Placement",
        options: ["inside", "outside"],
        optionTitles: ["Inside", "Outside"],
        displaySegmentedControl: true,
        defaultValue: DEFAULT_LOAD_BAR.labelPlacement,
        hidden: (label = {}) => !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel)
      },
      labelOutsideDirection: {
        type: ControlType.Enum,
        title: "Outside Align",
        options: ["top", "bottom"],
        optionTitles: ["Top", "Bottom"],
        displaySegmentedControl: true,
        defaultValue: DEFAULT_LOAD_BAR.labelOutsideDirection,
        hidden: (label = {}) => !(label.showLabel ?? DEFAULT_LOAD_BAR.showLabel) || (label.labelPlacement ?? DEFAULT_LOAD_BAR.labelPlacement) !== "outside"
      }
    }
  },
  onReady: { type: ControlType.EventHandler, title: "onReady" }
});
export {
  Loading as default
};
