### Visual Slider with Vertical Lines
Custom slider component that displays vertical lines scaling based on value, providing visual feedback without numerical display.

#### Component Template
```tsx
const VisualsSlider = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    lineCount = 12,
}: {
    value: number
    onChange: (value: number) => void
    min: number
    max: number
    step?: number
    lineCount?: number
}) => {
    const range = max - min
    const normalizedValue = Math.max(0, Math.min(1, (value - min) / range))
    
    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = event.currentTarget.closest('.visualsSlider-lines')
        if (!container) return
        const rect = container.getBoundingClientRect()
        const percent = (event.clientX - rect.left) / rect.width
        const newValue = min + percent * range
        onChange(Math.max(min, Math.min(max, newValue)))
    }
    
    return (
        <div className="visualsSlider">
            <div className="visualsSlider-lines" onPointerDown={handlePointerDown}>
                <div className="visualsSlider-label">Width</div>
                <div className="visualsSlider-content">
                    {Array.from({ length: lineCount }).map((_, index) => {
                        const linePosition = (index + 1) / lineCount
                        const isActive = linePosition <= normalizedValue
                        const heightPercent = Math.max(15, linePosition * 100)
                        
                        return (
                            <div
                                key={index}
                                className={`visualsSlider-line ${isActive ? "is-active" : ""}`}
                                style={{
                                    height: `${heightPercent}%`,
                                }}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
```

#### CSS Styling
```css
/* Visual Slider with Vertical Lines */
.visualsSlider {
    position: relative;
    width: 100%;
}

.visualsSlider-lines {
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
    position: relative;
    /* Fine-tune positioning as needed */
    top: -5px;
    left: 5px;
}

.visualsSlider-label {
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 500;
    padding: 6px 2px 0 2px;
    line-height: 1;
    position: relative;
    /* Fine-tune label positioning */
    top: 5px;
    left: -3px;
}

.visualsSlider-content {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 2px;
    height: 20px;
}

.visualsSlider-line {
    flex: 1;
    min-width: 1.5px;
    background: var(--text-tertiary);
    border-radius: 1px;
    transition: background-color 0.15s ease, opacity 0.15s ease;
    opacity: 0.5;
}

.visualsSlider-line.is-active {
    background: var(--accent-primary);
    opacity: 1;
}
```

#### Usage Example
```tsx
// In your settings component
<label>
    <span>Track Thickness</span>
    <VisualsSlider
        value={controls.trackThickness}
        onChange={(value) => setControls(prev => ({
            ...prev,
            trackThickness: value
        }))}
        min={1}
        max={8}
        step={0.5}
        lineCount={12}
    />
</label>

<label>
    <span>Border Width</span>
    <VisualsSlider
        value={controls.borderWidth}
        onChange={(value) => setControls(prev => ({
            ...prev,
            borderWidth: value
        }))}
        min={1}
        max={6}
        step={0.5}
        lineCount={16}
    />
</label>
```

#### Key Features
- **Visual Feedback**: Vertical lines scale proportionally based on value
- **Active State**: Lines at or below current value show full height in accent color
- **Inactive State**: Lines above current value show proportional height in muted color
- **Direct Interaction**: Click anywhere on the lines to set value
- **Compact Design**: Integrated label, no numerical display, matches other form controls
- **Responsive**: Works with different line counts and value ranges

#### Positioning Strategy
Use relative positioning for fine-tuned layout adjustments:
- `.visualsSlider-lines`: Position the interactive lines container
- `.visualsSlider-label`: Position the label independently
- Allows overlapping and precise alignment without affecting container size

#### Customization Options
- `lineCount`: Number of vertical lines (12-16 recommended)
- `min/max/step`: Value range and increment
- Label text: Customize by changing the content of `.visualsSlider-label`
- Heights: Adjust `heightPercent` calculation for different visual effects
- Colors: Uses theme variables (`--accent-primary`, `--text-tertiary`)
