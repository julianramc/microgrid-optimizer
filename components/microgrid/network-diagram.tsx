"use client"

import React, { useMemo } from 'react'
import type { NetworkData, ICSAResult } from '@/lib/microgrid/icsa-types'

interface NetworkDiagramProps {
    network: NetworkData
    result: ICSAResult
}

function getIEEE33Positions() {
    const dx = 45;
    const dy = 45;
    const pos = new Map<number, { x: number, y: number }>();

    // Main line 1-18
    for (let i = 1; i <= 18; i++) {
        pos.set(i, { x: (i - 1) * dx, y: 0 });
    }

    // Branch 19-22 from node 2 (upwards)
    for (let i = 19; i <= 22; i++) {
        pos.set(i, { x: 1 * dx, y: -(i - 18) * dy });
    }

    // Branch 23-25 from node 3 (downwards)
    for (let i = 23; i <= 25; i++) {
        pos.set(i, { x: 2 * dx, y: (i - 22) * dy });
    }

    // Branch 26-33 from node 6 (upwards and right)
    pos.set(26, { x: 5 * dx, y: -2 * dy });
    for (let i = 27; i <= 33; i++) {
        pos.set(i, { x: (i - 27 + 6) * dx, y: -2 * dy });
    }

    return pos;
}

function getIEEE69Positions() {
    const dx = 35;
    const dy = 45;
    const pos = new Map<number, { x: number, y: number }>();

    // Main line 1-27
    for (let i = 1; i <= 27; i++) {
        pos.set(i, { x: (i - 1) * dx, y: 0 });
    }

    // Branch 36-46 from node 3 (upwards)
    for (let i = 36; i <= 46; i++) {
        pos.set(i, { x: (i - 36 + 4) * dx, y: -2.5 * dy });
    }

    // Branch 47-50 from node 4 (upwards)
    for (let i = 47; i <= 50; i++) {
        pos.set(i, { x: (i - 47 + 4) * dx, y: -1.25 * dy });
    }

    // Branch 51-52 from node 8 (downwards)
    pos.set(51, { x: 7 * dx, y: 1 * dy });
    pos.set(52, { x: 7 * dx, y: 2 * dy });

    // Branch 53-65 from node 9 (upwards)
    for (let i = 53; i <= 65; i++) {
        pos.set(i, { x: (i - 53 + 9) * dx, y: -1.25 * dy });
    }

    // Branch 66-67 from node 11 (downwards)
    pos.set(66, { x: 10 * dx, y: 1 * dy });
    pos.set(67, { x: 10 * dx, y: 2 * dy });

    // Branch 68-69 from node 12 (downwards)
    pos.set(68, { x: 11 * dx, y: 1 * dy });
    pos.set(69, { x: 11 * dx, y: 2 * dy });

    // Branch 28-35 from node 3 (downwards)
    for (let i = 28; i <= 35; i++) {
        pos.set(i, { x: (i - 28 + 4) * dx, y: 2.5 * dy });
    }

    return pos;
}

export function NetworkDiagram({ network, result }: NetworkDiagramProps) {
    const { nodes, links, width, height } = useMemo(() => {
        let positions = new Map<number, { x: number, y: number }>();

        if (network.nNodes === 33) {
            positions = getIEEE33Positions();
        } else if (network.nNodes === 69) {
            positions = getIEEE69Positions();
        } else {
            // Fallback circular layout
            const radius = 200;
            for (let i = 1; i <= network.nNodes; i++) {
                const angle = (i / network.nNodes) * 2 * Math.PI;
                positions.set(i, {
                    x: radius * Math.cos(angle) + radius,
                    y: radius * Math.sin(angle) + radius
                });
            }
        }

        // Find min max for bounding box
        let minX = Infinity, maxX = -Infinity
        let minY = Infinity, maxY = -Infinity
        positions.forEach(p => {
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
        })

        // Add padding
        const paddingX = 60;
        const paddingY = 60;

        const finalNodes = Array.from({ length: network.nNodes }, (_, i) => {
            const p = positions.get(i + 1) || { x: 0, y: 0 }
            return {
                id: i + 1,
                x: p.x - minX + paddingX,
                y: p.y - minY + paddingY
            }
        })

        const finalLinks = network.lines.map(l => {
            const from = positions.get(l.from) || { x: 0, y: 0 }
            const to = positions.get(l.to) || { x: 0, y: 0 }
            return {
                from: l.from,
                to: l.to,
                x1: from.x - minX + paddingX,
                y1: from.y - minY + paddingY,
                x2: to.x - minX + paddingX,
                y2: to.y - minY + paddingY
            }
        })

        return {
            nodes: finalNodes,
            links: finalLinks,
            width: (maxX - minX) + (paddingX * 2),
            height: (maxY - minY) + (paddingY * 2)
        }

    }, [network])

    const optimalNodesSet = new Set(result.optimalNodes)

    // Profile de tensión a las 13:00hrs (pico de inyección solar aprox)
    const hourIdx = 12
    const vProfile = result.voltageProfiles?.[hourIdx] || []

    // Slack node is always node 1
    const slackNode = 1

    const getVoltageColor = (v: number) => {
        if (!v) return "#64748b"
        if (v < 0.95) return "#ef4444" // Subtensión
        if (v > 1.05) return "#eab308" // Sobretensión
        return "#10b981" // Óptima
    }

    return (
        <div className="w-full overflow-auto border border-white/10 rounded-xl bg-slate-50 dark:bg-black/95 shadow-inner relative flex items-center justify-center min-h-[400px]">
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 bg-background/90 p-3 rounded-lg backdrop-blur-md border border-border text-xs text-foreground shadow-xl">
                <h4 className="font-bold mb-1 opacity-80 uppercase tracking-widest text-[10px]">Leyenda Red {network.nNodes} Nodos</h4>
                <div className="flex items-center gap-2 font-mono"><div className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> V Óptima (0.95 - 1.05 pu)</div>
                <div className="flex items-center gap-2 font-mono"><div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div> V Crítica (&lt; 0.95 pu)</div>
                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border font-medium">
                    <svg width="14" height="14" className="mr-1 overflow-visible"><circle cx="7" cy="7" r="5" stroke="#f59e0b" strokeWidth="2" fill="#fef3c7" className="drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]" /></svg>
                    Inyección Solar FV (ICSA)
                </div>
            </div>

            <svg width={width} height={height} className="max-w-full my-12" style={{ minWidth: width }}>
                {/* Draw edges */}
                {links.map((link, i) => {
                    const isDiagonal = link.x1 !== link.x2 && link.y1 !== link.y2;

                    if (isDiagonal) {
                        // Corner logic for elegant schematics: from (x1,y1) to (x1,y2) then to (x2,y2)
                        const pts = `${link.x1},${link.y1} ${link.x1},${link.y2} ${link.x2},${link.y2}`;
                        return (
                            <polyline
                                key={i}
                                points={pts}
                                stroke="#94a3b8"
                                strokeWidth="2.5"
                                fill="none"
                                opacity="0.8"
                                strokeLinejoin="round"
                            />
                        )
                    }

                    return (
                        <line
                            key={i}
                            x1={link.x1}
                            y1={link.y1}
                            x2={link.x2}
                            y2={link.y2}
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                            opacity="0.8"
                            strokeLinecap="round"
                        />
                    )
                })}

                {/* Draw nodes */}
                {nodes.map((node) => {
                    const isOptimal = optimalNodesSet.has(node.id)
                    const v = vProfile[node.id - 1] || 1.0
                    const color = getVoltageColor(v)
                    const isSlack = node.id === slackNode

                    return (
                        <g key={node.id} transform={`translate(${node.x},${node.y})`} className="hover:opacity-80 transition-opacity cursor-crosshair">

                            {/* Highlight halo for optimal nodes representing FV injections */}
                            {isOptimal && (
                                <>
                                    <circle r="18" fill="#f59e0b" className="animate-pulse opacity-30" />
                                    <circle r="12" stroke="#f59e0b" strokeWidth="2.5" fill="none" className="drop-shadow-[0_0_6px_rgba(245,158,11,1)]" />
                                </>
                            )}

                            {/* Node shape */}
                            {isSlack ? (
                                <g className="drop-shadow-md">
                                    <circle r="14" fill="white" stroke="#0f172a" strokeWidth="2.5" />
                                    <path d="M -8 0 Q -4 -6 0 0 T 8 0" fill="none" stroke="#0f172a" strokeWidth="2" />
                                    <text y="-20" textAnchor="middle" fill="#0f172a" fontSize="12px" fontWeight="bold" className="dark:fill-slate-300">
                                        SLACK
                                    </text>
                                </g>
                            ) : (
                                <circle
                                    r="6"
                                    fill={isOptimal ? "#fef3c7" : color}
                                    stroke={isOptimal ? "#f59e0b" : "#0f172a"}
                                    strokeWidth="2"
                                    className="transition-all duration-300 drop-shadow-sm"
                                />
                            )}

                            {/* Node ID Label */}
                            <text
                                y={isSlack ? 22 : isOptimal ? -16 : -10}
                                textAnchor="middle"
                                fill={isOptimal ? "#d97706" : "#64748b"}
                                fontSize={isOptimal ? "11px" : "10px"}
                                className="font-mono stroke-white dark:stroke-black stroke-[3px] paint-order-stroke"
                                fontWeight={isOptimal ? "bold" : "600"}
                            >
                                {node.id}
                            </text>

                            {/* FV injection text label */}
                            {isOptimal && (
                                <text y="22" textAnchor="middle" fill="#d97706" fontSize="9px" className="font-bold drop-shadow-sm tracking-widest bg-white">
                                    +FV
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}
