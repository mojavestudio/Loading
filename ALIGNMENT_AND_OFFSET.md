# Alignment and Offset

This document describes the alignment and offset system that allows labels to be positioned relative to bars with proper constraints, ensuring labels never cross bar edges while creating a visual "bar moving away from label" effect.

## Overview

The alignment and offset system enables fine-grained control over label positioning for bar-style loading animations. When a label is positioned outside a bar (top, bottom, left, or right), users can apply X and Y offsets to adjust the label's position. The system ensures that:

1. **Labels never cross bar edges** - Labels maintain proper spacing from the bar
2. **Bars shrink appropriately** - As offsets grow, the bar width adjusts to accommodate the label
3. **Visual consistency** - The effect creates the illusion of the bar moving away from the label rather than the label leaving the window

## Key Concepts

### Label Placement Types

- **Inside**: Label is rendered inside the bar (overlaid on the progress fill)
- **Outside**: Label is positioned outside the bar with configurable direction (top, bottom, left, right, center)

### Offset Behavior

- **X Offset**: Moves label horizontally
  - For **center row** outside labels: Directly translates the label
  - For **top/bottom row** outside labels: Shrinks the bar width instead of moving the label
- **Y Offset**: Moves label vertically (always applied as transform)

### Constraints

The system enforces these invariants:

- **Right-aligned outside label**: `labelLeft >= barRight + gap` AND `labelRight <= windowWidth`
- **Left-aligned outside label**: `labelRight <= barLeft - gap` AND `labelLeft >= 0`
- **Center-aligned outside label**: Centered on bar, constrained by window edges

## How It Works

### 1. Bounds Computation with Offset

The bounds computation functions (`computePreviewOutsideLabelBounds` and `computePreviewInsideLabelBounds`) now accept an `offsetX` parameter. This allows the reserve calculation loops to "see" where the label will be after the offset is applied.

**Key Change:**
```typescript
// Before: Offset was ignored in bounds calculation
const bounds = computePreviewOutsideLabelBounds(
    loadBar.labelPosition,
    anchorXCandidate,
    measuredLabelWidth,
    0 // Don't include offset in bounds
)

// After: Offset is included so reserves account for it
const bounds = computePreviewOutsideLabelBounds(
    loadBar.labelPosition,
    anchorXCandidate,
    measuredLabelWidth,
    labelOffsetXValue // Include offset in bounds
)
```

**Why this works:**
- The reserve calculation loops iterate to find the minimum `reserveLeft` and `reserveRight` needed to keep the label within `windowWidth`
- By including the offset, the loops see the label's final position and adjust reserves accordingly
- This causes the bar to move inward (via increased reserves) as the offset grows

### 2. Bar Width Adjustment for Top/Bottom Labels

For outside labels on the top or bottom rows, the X offset should shrink the bar rather than move the label. This is achieved by:

**Step 1: Identify top/bottom outside labels**
```typescript
const isTopBottomOutside = isOutside && loadBar.labelOutsideDirection !== "center"
```

**Step 2: Calculate width adjustment**
```typescript
const barWidthAdjustment = isTopBottomOutside ? Math.abs(labelOffsetXValue) : 0
```

**Step 3: Apply adjustment to bar width**
```typescript
const previewBarWidth = Math.max(
    minBarWidth,
    windowWidth - reserveLeft - reserveRight - barWidthAdjustment
)
```

**Why this works:**
- The `barWidthAdjustment` directly reduces the available width for the bar
- This mirrors the Y-axis behavior where vertical space is reduced when Y offset grows
- The bar visually shrinks as the X offset increases, creating the desired effect

### 3. Bar Position from Reserves

Instead of centering the bar and then applying offset-based shifts, the bar position is now derived directly from the reserves:

```typescript
// Bar starts after left reserve
const previewBarOffsetX = reserveLeft

const barLeft = previewBarOffsetX
const barRight = barLeft + previewBarWidth
```

**Why this works:**
- The reserves already account for the label's position (including offset)
- By starting the bar at `reserveLeft`, the bar is automatically positioned correctly
- The bar and label stay properly aligned without additional centering calculations

### 4. Transform Clamping

To prevent labels from crossing bar edges, the transform offset is clamped based on the bar's final geometry:

```typescript
let effectiveOffsetX = labelOffsetX || 0
const baseGap = 5

if (labelOutside && loadBar.labelPosition === "right" && axisY === 0) {
    // For right-aligned: labelLeft >= barRight + gap and labelRight <= windowWidth
    const minOffset = barRect.right + baseGap - anchorX
    const maxOffset = containerWidth - anchorX - labelRect.width
    effectiveOffsetX = Math.max(minOffset, Math.min(effectiveOffsetX, maxOffset))
} else if (labelOutside && loadBar.labelPosition === "left" && axisY === 0) {
    // For left-aligned: labelRight <= barLeft - gap and labelLeft >= 0
    const maxOffset = barRect.left - baseGap - anchorX
    const minOffset = labelRect.width - anchorX
    effectiveOffsetX = Math.max(minOffset, Math.min(effectiveOffsetX, maxOffset))
}
```

**Why this works:**
- The clamping happens after the bar geometry is finalized
- It ensures the label transform never pushes the label past the bar edge
- Once the label reaches the bar edge, `effectiveOffsetX` stops increasing
- The bar continues to shrink via the bounds/reserve system, creating the "bar moving away" effect

## Detailed Process for Replicating

### Step 1: Update Bounds Computation Functions

Ensure your bounds computation functions accept an `offsetX` parameter:

```typescript
const computePreviewOutsideLabelBounds = (
    position: LabelPosition,
    anchorX: number,
    labelWidth: number,
    offsetX: number  // ← Add this parameter
) => {
    // ... compute bounds including offsetX
    const left = anchorX - labelWidth / 2 + offsetX
    return { left, right: left + labelWidth }
}
```

### Step 2: Pass Offset to Bounds Calls

In your reserve calculation loops, pass the offset value instead of `0`:

```typescript
const labelOffsetXValue = labelOffsetX || 0

// In the reserve calculation loop:
const bounds = computePreviewOutsideLabelBounds(
    loadBar.labelPosition,
    anchorXCandidate,
    measuredLabelWidth,
    labelOffsetXValue  // ← Pass offset here
)
```

Do this for both outside and inside label bounds calculations.

### Step 3: Add Bar Width Adjustment

After computing reserves, add width adjustment for top/bottom outside labels:

```typescript
// Identify top/bottom outside labels
const isTopBottomOutside = isOutside && loadBar.labelOutsideDirection !== "center"

// Calculate adjustment based on X offset
const barWidthAdjustment = isTopBottomOutside ? Math.abs(labelOffsetXValue) : 0

// Apply to bar width calculation
const previewBarWidth = Math.max(
    minBarWidth,
    windowWidth - reserveLeft - reserveRight - barWidthAdjustment
)
```

### Step 4: Derive Bar Position from Reserves

Instead of centering the bar, derive position from reserves:

```typescript
// Bar starts after left reserve
const previewBarOffsetX = reserveLeft

const barLeft = previewBarOffsetX
const barRight = barLeft + previewBarWidth
const barCenterX = barLeft + previewBarWidth / 2
```

### Step 5: Implement Transform Clamping

In your label positioning logic (typically in a `useLayoutEffect` or similar), add clamping:

```typescript
// Get container dimensions
const containerEl = barEl.parentElement?.parentElement
const containerWidth = containerEl ? containerEl.getBoundingClientRect().width : barRect.width

// Start with raw offset
let effectiveOffsetX = labelOffsetX || 0
const baseGap = 5

// Clamp based on label position and bar geometry
if (labelOutside && loadBar.labelPosition === "right" && axisY === 0) {
    // Right-aligned: ensure label stays right of bar and within window
    const minOffset = barRect.right + baseGap - anchorX
    const maxOffset = containerWidth - anchorX - labelRect.width
    effectiveOffsetX = Math.max(minOffset, Math.min(effectiveOffsetX, maxOffset))
} else if (labelOutside && loadBar.labelPosition === "left" && axisY === 0) {
    // Left-aligned: ensure label stays left of bar and within window
    const maxOffset = barRect.left - baseGap - anchorX
    const minOffset = labelRect.width - anchorX
    effectiveOffsetX = Math.max(minOffset, Math.min(effectiveOffsetX, maxOffset))
}

// Use effectiveOffsetX in transform instead of raw labelOffsetX
if (effectiveOffsetX !== 0 && axisY === 0) {
    transforms.push(`translateX(${effectiveOffsetX}px)`)
}
```

### Step 6: Apply to All Bar Styles

Repeat steps 2-4 for each bar style variant (e.g., "solid", "lines") in your preview rendering logic.

## Creating the Offset

The offset system was created through the following process:

### Initial Problem

Originally, the preview system had a disconnect:
- The `outsidePadding` was being expanded to accommodate label offsets
- But the bar width and X-position were computed from the full window width
- This meant the bar never actually got shorter or re-centered as X offset grew

### Solution Development

1. **Identified the root cause**: Bar width and position were computed before considering how offsets affect available space

2. **Separated concerns**:
   - **Bounds computation**: Determines how much space labels need (including offsets)
   - **Reserve calculation**: Finds minimum left/right reserves to keep labels in bounds
   - **Bar width calculation**: Uses reserves + offset adjustment to determine final width
   - **Bar positioning**: Derived from reserves (not centered)
   - **Transform clamping**: Ensures labels never cross bar edges

3. **Applied the pattern**:
   - Feed offset into bounds → reserves adjust → bar shrinks
   - Clamp transform → label stops at bar edge → bar continues shrinking
   - Result: Visual effect of bar moving away from label

### Key Insights

- **Bounds must include offset**: Without this, reserves don't account for where the label will actually be
- **Top/bottom labels need special handling**: They shrink the bar instead of moving the label
- **Position from reserves, not centering**: Reserves already encode the correct position
- **Clamp at transform time**: This happens after geometry is finalized, ensuring constraints are met

## Testing Checklist

When implementing this system, verify:

- [ ] Labels never cross bar edges when offset is applied
- [ ] Bar width shrinks appropriately for top/bottom outside labels with X offset
- [ ] Bar position adjusts correctly as reserves change
- [ ] Labels stay within window bounds
- [ ] Center row labels move with offset (not bar shrinking)
- [ ] Top/bottom row labels cause bar to shrink (not label moving)
- [ ] Clamping prevents label from going past bar edge
- [ ] Visual effect matches: "bar moving away from label"

## Example: Right-Aligned Outside Label with Positive X Offset

1. User sets `labelOffsetX = 50` for a right-aligned outside label
2. Bounds computation includes offset → label would be 50px further right
3. Reserve calculation sees label would exceed `windowWidth` → increases `reserveRight`
4. Bar width calculation: `windowWidth - reserveLeft - reserveRight - 0` (not top/bottom, so no adjustment)
5. Bar position: starts at `reserveLeft`, width is reduced
6. Transform clamping: if label would cross `barRight`, `effectiveOffsetX` is clamped
7. Result: Bar shrinks and moves left, label moves right but stops at bar edge

## Example: Top-Row Outside Label with Positive X Offset

1. User sets `labelOffsetX = 50` for a top-row outside label
2. Bounds computation includes offset → label would be 50px further right
3. Reserve calculation adjusts reserves if needed
4. Bar width calculation: `windowWidth - reserveLeft - reserveRight - 50` (top/bottom, so adjustment applied)
5. Bar position: starts at `reserveLeft`, width is reduced by 50px
6. Transform: No X offset applied (top/bottom labels don't use X offset in transform)
7. Result: Bar shrinks by 50px, label stays in same relative position

## Summary

The alignment and offset system creates a cohesive interaction where:
- Offsets are properly accounted for in space calculations
- Bars adjust their size and position to accommodate labels
- Labels are constrained to never cross bar edges
- The visual effect matches user expectations

This is achieved through the careful coordination of bounds computation, reserve calculation, bar geometry, and transform clamping.

