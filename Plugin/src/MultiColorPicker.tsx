/**
 * Multi-Color Picker Component
 * A custom color picker that allows selecting two colors (start and end) for gradients
 * Adapted from Plugin-Basics repository for Loading plugin
 */

import * as React from "react"

interface MultiColorPickerProps {
    colorStart: string
    colorEnd: string
    onChange: (type: 'colorStart' | 'colorEnd', value: string) => void
    label?: string
}

export function MultiColorPicker({ 
    colorStart, 
    colorEnd, 
    onChange,
    label = "Colors"
}: MultiColorPickerProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <label className="formLabel">{label}</label>
            
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "0",
                borderRadius: "6px",
                overflow: "hidden",
                height: "32px",
                boxSizing: "border-box"
            }}>
                {/* Color Start */}
                <div style={{ 
                    position: "relative", 
                    height: "100%",
                    overflow: "hidden"
                }}>
                    <input
                        type="color"
                        value={colorStart}
                        onChange={(e) => onChange('colorStart', e.target.value)}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            opacity: 0,
                            cursor: "pointer",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            zIndex: 2
                        }}
                    />
                    <div
                        style={{
                            backgroundColor: colorStart,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRight: "1px solid var(--border-soft)",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                            zIndex: 1
                        }}
                    />
                </div>
                
                {/* Color End */}
                <div style={{ 
                    position: "relative", 
                    height: "100%",
                    overflow: "hidden"
                }}>
                    <input
                        type="color"
                        value={colorEnd}
                        onChange={(e) => onChange('colorEnd', e.target.value)}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            opacity: 0,
                            cursor: "pointer",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            zIndex: 2
                        }}
                    />
                    <div
                        style={{
                            backgroundColor: colorEnd,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                            zIndex: 1
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
