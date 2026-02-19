import React, { useMemo } from "react";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { toast } from "react-toastify";

import { useLazyBridgLogQuery } from "~/store/mastApi";

type Point = { angle: number; signal: number };

function parseLogToPoints(text: string): Point[] {
    if (!text) return [];

    // Підтримує будь-який другий індекс:
    // r_status->estim_data->strength_map[40][3] = -74
    // r_status->estim_data->strength_map[255][20] = -75
    const re = /strength_map\[(\d+)\]\[(\d+)\]\s*=\s*(-?\d+)/g;

    // збираємо сигнали по куту
    const byAngle = new Map<number, number[]>();

    // щоб потім замінити -999 на мінімальний валідний
    let minValid: number | null = null;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const angle = Number(m[1]);
        const signal = Number(m[3]);

        if (!Number.isFinite(angle) || !Number.isFinite(signal)) continue;

        // шукаємо мінімальний валідний (НЕ -999)
        if (signal !== -999) {
            if (minValid === null || signal < minValid) minValid = signal;
        }

        if (!byAngle.has(angle)) byAngle.set(angle, []);
        byAngle.get(angle)!.push(signal);
    }

    // якщо валідних немає — нема що малювати
    if (minValid === null) return [];

    const points: Point[] = [];

    for (const [angle, arr] of byAngle.entries()) {
        // заміна -999 на мінімальний валідний
        const fixed = arr.map((s) => (s === -999 ? minValid! : s));

        // якщо по одному куту багато значень (через різні [][index]) — беремо "краще" (максимальний, бо -70 краще ніж -80)
        const best = Math.max(...fixed);

        points.push({ angle, signal: best });
    }

    points.sort((a, b) => a.angle - b.angle);
    return points;
}


function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function toRad(deg: number) {
    return (deg * Math.PI) / 180;
}

export default function BridgPattern() {
    // /log ТІЛЬКИ по кнопці
    const [triggerLog, logMeta] = useLazyBridgLogQuery();

    const raw = (logMeta.data ?? "") as string;

    const titleFont = useMemo(
        () => ({
            fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            letterSpacing: 1.2,
            color: "#fff",
        }),
        []
    );

    const points = useMemo(() => parseLogToPoints(raw), [raw]);

    const stats = useMemo(() => {
        if (!points.length) return null;
        let best = points[0];
        for (const p of points) {
            if (p.signal > best.signal) best = p; // -70 краще ніж -80
        }
        const min = Math.min(...points.map((p) => p.signal));
        const max = Math.max(...points.map((p) => p.signal));
        return { best, min, max, count: points.length };
    }, [points]);

    // --- Polar SVG ---
    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const R = 140;

    const pathD = useMemo(() => {
        if (!points.length || !stats) return "";
        const { min, max } = stats;
        const denom = max - min || 1;

        const coords = points.map((p) => {
            const t = clamp01((p.signal - min) / denom);
            const r = 0.12 * R + t * 0.88 * R;

            // 0° вверх (компас) => -90°
            const a = toRad(p.angle - 90);
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            return { x, y };
        });

        const d = coords
            .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
            .join(" ");
        return `${d} Z`;
    }, [points, stats, R, cx, cy]);

    const cardSx = {
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        backdropFilter: "blur(12px)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        color: "#fff",
    };

    const onLoadLog = async () => {
        try {
            await triggerLog().unwrap();
        } catch (e) {
            console.error(e);
            toast.error("Не вдалося отримати /log");
        }
    };

    return (
        <Card variant="outlined" sx={cardSx}>
            <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography sx={{ ...titleFont, fontWeight: 900 }}>CALIBRATION DATA</Typography>

                    <Button
                        variant="text"
                        onClick={onLoadLog}
                        startIcon={
                            <RefreshIcon
                                sx={{
                                    fontSize: 18,
                                    ...(logMeta.isFetching && { animation: "spin 0.9s linear infinite" }),
                                    "@keyframes spin": {
                                        from: { transform: "rotate(0deg)" },
                                        to: { transform: "rotate(360deg)" },
                                    },
                                }}
                            />
                        }
                        sx={{
                            ...titleFont,
                            fontWeight: 900,
                            letterSpacing: 1.1,
                            background: "rgba(34,211,238,0.10)",
                            color: "#CFFAFE",
                            "&:hover": { background: "rgba(34,211,238,0.18)" },
                            borderRadius: 2,
                        }}
                    >
                        LOG
                    </Button>
                </Box>

                {stats ? (
                    <Stack direction="row" spacing={2} sx={{ mb: 1 }} alignItems="center">
                        <Typography sx={{ ...titleFont, fontSize: 12, opacity: 0.8 }}>
                            points: <b style={{ color: "#CFFAFE" }}>{stats.count}</b>
                        </Typography>
                        <Typography sx={{ ...titleFont, fontSize: 12, opacity: 0.8 }}>
                            best:{" "}
                            <b style={{ color: "#CFFAFE" }}>
                                {stats.best.angle}° / {stats.best.signal.toFixed(0)} dB
                            </b>
                        </Typography>
                        <Typography sx={{ ...titleFont, fontSize: 12, opacity: 0.8 }}>
                            range:{" "}
                            <b style={{ color: "#CFFAFE" }}>
                                {stats.min.toFixed(0)}…{stats.max.toFixed(0)} dB
                            </b>
                        </Typography>
                    </Stack>
                ) : (
                    <Typography sx={{ ...titleFont, fontSize: 12, opacity: 0.7, mb: 1 }}>
                        Даних strength_map[*][0] поки немає.
                    </Typography>
                )}

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Box
                        sx={{
                            borderRadius: 3,
                            border: "1px solid rgba(34,211,238,0.14)",
                            background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.18))",
                            p: 1,
                        }}
                    >
                        <svg width={size} height={size} style={{ display: "block" }}>
                            {[0.25, 0.5, 0.75, 1].map((k) => (
                                <circle
                                    key={k}
                                    cx={cx}
                                    cy={cy}
                                    r={R * k}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.10)"
                                    strokeWidth="1"
                                />
                            ))}

                            {Array.from({ length: 12 }).map((_, i) => {
                                const deg = i * 30;
                                const a = toRad(deg - 90);
                                const x = cx + R * Math.cos(a);
                                const y = cy + R * Math.sin(a);
                                return (
                                    <line
                                        key={deg}
                                        x1={cx}
                                        y1={cy}
                                        x2={x}
                                        y2={y}
                                        stroke="rgba(255,255,255,0.10)"
                                        strokeWidth="1"
                                    />
                                );
                            })}

                            {[
                                { deg: 0, txt: "0°", x: cx, y: cy - R - 8, anchor: "middle" },
                                { deg: 90, txt: "90°", x: cx + R + 8, y: cy + 4, anchor: "start" },
                                { deg: 180, txt: "180°", x: cx, y: cy + R + 18, anchor: "middle" },
                                { deg: 270, txt: "270°", x: cx - R - 8, y: cy + 4, anchor: "end" },
                            ].map((l) => (
                                <text
                                    key={l.deg}
                                    x={l.x}
                                    y={l.y}
                                    fill="rgba(255,255,255,0.65)"
                                    fontSize="12"
                                    textAnchor={l.anchor as any}
                                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace"
                                >
                                    {l.txt}
                                </text>
                            ))}

                            {pathD && (
                                <>
                                    <path
                                        d={pathD}
                                        fill="rgba(34,211,238,0.18)"
                                        stroke="rgba(34,211,238,0.85)"
                                        strokeWidth="2"
                                    />
                                    <circle cx={cx} cy={cy} r="2.2" fill="rgba(255,255,255,0.65)" />
                                </>
                            )}
                        </svg>
                    </Box>

                    <Box
                        sx={{
                            flex: "1 1 260px",
                            borderRadius: 3,
                            border: "1px solid rgba(168,85,247,0.14)",
                            background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.18))",
                            p: 1.5,
                            minWidth: 260,
                            maxHeight: 340,
                            overflow: "auto",
                            color: "#CFFAFE",
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                            fontSize: 12,
                            lineHeight: 1.35,
                        }}
                    >
                        {raw ? raw : "log empty"}
                    </Box>
                </Box>

                {logMeta.isError && (
                    <Typography sx={{ ...titleFont, fontSize: 12, opacity: 0.9, color: "#FCA5A5", mt: 1 }}>
                        /log error
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
