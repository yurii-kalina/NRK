import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    Stack,
    Switch,
    TextField,
    Typography,
    FormControlLabel,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
    mastStorage,
    useStateMutation,
    useVerticalMutation,
    useAngleMutation,
    useSetHeightMutation,
    useForceHeightMutation,
} from "~/store/mastApi";

type MastState = {
    // важливе
    DS_ANGL_POWER_EN?: boolean;
    DS_ANGL_REVERS_EN?: boolean;
    DS_VERT_POWER_EN?: boolean;
    DS_VERT_REVERS_EN?: boolean;

    section_length_current?: number;
    section_length_target?: number;

    info_state?: string;
    status?: string;

    [k: string]: any;
};

function clampValidate(value: number, min: number, max: number): string | null {
    if (!Number.isFinite(value)) return "Введіть коректне число.";
    if (value < min) return `Значення має бути не менше ${min}.`;
    if (value > max) return `Значення має бути не більше ${max}.`;
    return null;
}

function round3(n?: number): string {
    if (!Number.isFinite(n as number)) return "-";
    return (Math.round((n as number) * 1000) / 1000).toFixed(3);
}

function InlineNumberCommand({
                                 label,
                                 busy,
                                 min,
                                 max,
                                 step,
                                 onSend,
                             }: {
    label: string;
    busy: boolean;
    min: number;
    max: number;
    step?: number;
    onSend: (n: number) => Promise<any> | any;
}) {
    const [v, setV] = useState<string>("");

    const send = () => {
        const n = Number(v);
        const err = clampValidate(n, min, max);
        if (err) {
            toast.error(err);
            return;
        }
        onSend(n);
    };

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ minWidth: 110, fontWeight: 800, letterSpacing: 0.6 }}>
                {label}
            </Typography>
            <TextField
                variant="outlined"
                size="small"
                value={v}
                onChange={(e) => setV(e.target.value)}
                type="number"
                slotProps={{
                    input: {
                        inputProps: {
                            min,
                            max,
                            step: step ?? 0.01,
                        },
                    },
                }}

                sx={{
                    width: 140,
                    "& .MuiInputBase-root": {
                        color: "#CFFAFE",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        background: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.25))",
                        borderRadius: 2,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(34, 211, 238, 0.25)",
                    },
                    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(34, 211, 238, 0.55)",
                    },
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(168, 85, 247, 0.75)",
                        boxShadow: "0 0 0 3px rgba(168, 85, 247, 0.12)",
                    },
                }}
            />
            <Button
                variant="contained"
                disabled={busy || v.trim() === ""}
                onClick={send}
                sx={{
                    borderRadius: 2,
                    fontWeight: 900,
                    letterSpacing: 0.8,
                    background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(168,85,247,1))",
                    boxShadow: "0 10px 22px rgba(34,211,238,0.18), 0 10px 28px rgba(168,85,247,0.14)",
                    "&:hover": {
                        background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(139,92,246,1))",
                        boxShadow: "0 12px 26px rgba(34,211,238,0.22), 0 12px 34px rgba(168,85,247,0.18)",
                    },
                    "&.Mui-disabled": {
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.35)",
                    },
                }}
            >
                SEND
            </Button>
        </Stack>
    );
}

function MotionBadge({
                         active,
                         dir,
                     }: {
    active: boolean;
    dir: "up" | "down" | "none";
}) {
    if (!active) return null;

    const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "";
    return (
        <Box
            sx={{
                ml: 1,
                px: 1,
                py: 0.25,
                borderRadius: 2,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1.2,
                color: "#041014",
                background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(34,197,94,1))",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 10px 22px rgba(34,211,238,0.18)",
                fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
        >
            MOVING {arrow}
        </Box>
    );
}

export default function Mast() {
    const initial = mastStorage.get();
    const [host, setHost] = useState(initial.host);
    const [port, setPort] = useState(initial.port);
    const hostError = host.trim().length === 0;
    const portError = !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535;

    const [getState, stateMeta] = useStateMutation();
    const [vertical, verticalMeta] = useVerticalMutation();
    const [angle, angleMeta] = useAngleMutation();
    const [setHeight, setHeightMeta] = useSetHeightMutation();
    const [forceHeight, forceHeightMeta] = useForceHeightMutation();

    const [poll, setPoll] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [stateData, setStateData] = useState<MastState | null>(null);

    const cmdBusy =
        verticalMeta.isLoading ||
        angleMeta.isLoading ||
        setHeightMeta.isLoading ||
        forceHeightMeta.isLoading;

    const lengths = useMemo(() => {
        return {
            current: round3(stateData?.section_length_current),
            target: round3(stateData?.section_length_target),
        };
    }, [stateData]);

    // рух/напрям
    const motion = useMemo(() => {
        const angP = !!stateData?.DS_ANGL_POWER_EN;
        const angR = !!stateData?.DS_ANGL_REVERS_EN;
        const vertP = !!stateData?.DS_VERT_POWER_EN;
        const vertR = !!stateData?.DS_VERT_REVERS_EN;

        const angleDir: "up" | "down" | "none" = !angP ? "none" : angR ? "down" : "up";
        const vertDir: "up" | "down" | "none" = !vertP ? "none" : vertR ? "down" : "up";

        return {
            angleActive: angP,
            angleDir,
            vertActive: vertP,
            vertDir,
        };
    }, [stateData]);

    const fetchState = async (notify = false) => {
        try {
            const resp = (await getState().unwrap()) as MastState;
            setStateData(resp);
            setIsOnline(true);
            return resp;
        } catch (e) {
            console.error(e);
            setIsOnline(false);
            if (notify) toast.error("State недоступний. Плата OFFLINE.");
            return null;
        }
    };

    async function run<T extends { status?: string }>(fn: () => Promise<T>) {
        try {
            const resp = await fn();

            if (resp?.status === "success") {
                toast.success("Запит виконано успішно.");
            } else {
                toast.error("Запит не пройшов.");
            }

            await fetchState(false);
        } catch (e) {
            console.error(e);
            toast.error("Помилка запиту.");
        }
    }

    const onSaveHostPort = async () => {
        mastStorage.set(host, port);
        const saved = mastStorage.get();
        setHost(saved.host);
        setPort(saved.port);
        await fetchState(true);
    };

    useEffect(() => {
        let timer: number | null = null;

        const tick = async () => {
            await fetchState(false);
        };

        tick();
        if (poll) timer = window.setInterval(tick, 10000);

        return () => {
            if (timer) window.clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poll, getState]);

    const blinkSx = (active: boolean) =>
        active
            ? {
                animation: "mastBlink 0.75s infinite",
                "@keyframes mastBlink": {
                    "0%": {
                        boxShadow: "0 0 0 rgba(0,0,0,0)",
                        borderColor: "rgba(34,211,238,0.25)",
                    },
                    "50%": {
                        boxShadow:
                            "0 0 0 3px rgba(34,211,238,0.18), 0 0 28px rgba(168,85,247,0.18)",
                        borderColor: "rgba(168,85,247,0.55)",
                    },
                    "100%": {
                        boxShadow: "0 0 0 rgba(0,0,0,0)",
                        borderColor: "rgba(34,211,238,0.25)",
                    },
                },
            }
            : {};

    const pageSx = {
        minHeight: "100vh",
        py: 4,
        background:
            "radial-gradient(1000px 700px at 12% 10%, rgba(34,211,238,0.18), transparent 60%)," +
            "radial-gradient(900px 650px at 88% 20%, rgba(168,85,247,0.18), transparent 55%)," +
            "linear-gradient(135deg, #05070b, #060a12 40%, #070a18)",
        color: "#fff",
    };

    const cardSx = {
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        backdropFilter: "blur(12px)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    };

    const titleFont = {
        fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        letterSpacing: 1.2,
        color: "#fff",
    };

    const btnPrimarySx = {
        borderRadius: 2,
        fontWeight: 900,
        letterSpacing: 1,
        background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(168,85,247,1))",
        boxShadow: "0 10px 22px rgba(34,211,238,0.16), 0 10px 28px rgba(168,85,247,0.14)",
        "&:hover": {
            background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(139,92,246,1))",
            boxShadow: "0 12px 26px rgba(34,211,238,0.22), 0 12px 34px rgba(168,85,247,0.18)",
        },
        "&.Mui-disabled": {
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)",
        },
    };

    const btnStopSx = {
        borderRadius: 2,
        fontWeight: 900,
        letterSpacing: 1,
        color: "rgba(255,255,255,0.85)",
        borderColor: "rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.10)",
        "&:hover": {
            borderColor: "rgba(34,211,238,0.45)",
            background: "rgba(0,0,0,0.18)",
            boxShadow: "0 0 0 3px rgba(34,211,238,0.10)",
        },
    };

    const inputSx = {
        "& .MuiInputBase-root": {
            color: "#CFFAFE",
            fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            background: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.25))",
            borderRadius: 2,
        },
        "& .MuiInputLabel-root": {
            color: "rgba(255,255,255,0.55)",
            fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            letterSpacing: 0.8,
        },
        "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(34, 211, 238, 0.25)",
        },
        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(34, 211, 238, 0.55)",
        },
        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(168, 85, 247, 0.75)",
            boxShadow: "0 0 0 3px rgba(168, 85, 247, 0.12)",
        },
    };

    return (
        <Box sx={pageSx}>
            <Container maxWidth="md" sx={{ py: 0 }}>
                <ToastContainer
                    position="top-right"
                    autoClose={2500}
                    hideProgressBar
                    newestOnTop
                    closeOnClick
                    pauseOnFocusLoss={false}
                    pauseOnHover={false}
                    toastStyle={{
                        background: "rgba(10,12,18,0.92)",
                        color: "#E5E7EB",
                        border: "1px solid rgba(34,211,238,0.18)",
                        borderRadius: 12,
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    }}
                />

                {/* Header */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2.5,
                        mt: 1,
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="h5" fontWeight={900} sx={{ ...titleFont }}>
                            MAST CONTROL
                        </Typography>

                        <Box
                            sx={{
                                px: 1.2,
                                py: 0.35,
                                borderRadius: 2,
                                fontSize: 12,
                                fontWeight: 900,
                                background: isOnline
                                    ? "linear-gradient(135deg, rgba(34,211,238,1), rgba(34,197,94,1))"
                                    : "linear-gradient(135deg, rgba(248,113,113,1), rgba(239,68,68,1))",
                                border: "1px solid rgba(255,255,255,0.14)",
                                boxShadow: isOnline
                                    ? "0 10px 22px rgba(34,211,238,0.14)"
                                    : "0 10px 22px rgba(239,68,68,0.14)",
                                ...titleFont,
                            }}
                        >
                            {isOnline ? "ONLINE" : "OFFLINE"}
                        </Box>
                    </Stack>

                    {/* lengths top-right */}
                    <Stack
                        spacing={0.25}
                        alignItems="flex-end"
                        sx={{
                            textAlign: "right",
                            px: 1.2,
                            py: 0.8,
                            borderRadius: 3,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.18)",
                            boxShadow: "inset 0 0 0 1px rgba(34,211,238,0.08)",
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                opacity: 0.9,
                                ...titleFont,
                                fontSize: 12,
                                color: "rgba(255,255,255,0.78)",
                            }}
                        >
                            current: <b style={{ color: "#CFFAFE" }}>{lengths.current}</b>
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                opacity: 0.9,
                                ...titleFont,
                                fontSize: 12,
                                color: "rgba(255,255,255,0.78)",
                            }}
                        >
                            target: <b style={{ color: "#DDD6FE" }}>{lengths.target}</b>
                        </Typography>
                    </Stack>
                </Box>

                {/* Host/Port */}
                <Card variant="outlined" sx={{ ...cardSx, mb: 2, borderColor: "rgba(255,255,255,0.10)" }}>
                    <CardContent>
                        <Grid container spacing={1.5} alignItems="center">
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    label="IP"
                                    value={host}
                                    onChange={(e) => setHost(e.target.value)}
                                    size="small"
                                    fullWidth
                                    error={hostError}
                                    sx={inputSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    label="PORT"
                                    value={port}
                                    onChange={(e) => setPort(e.target.value)}
                                    size="small"
                                    fullWidth
                                    error={portError}
                                    sx={inputSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={onSaveHostPort}
                                    disabled={hostError || portError}
                                    sx={btnPrimarySx}
                                >
                                    SAVE
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}
                                sx={{
                                    display: "flex",
                                    justifyContent: { xs: "flex-start", md: "flex-end" },
                                    gap: 1,
                                    alignItems: "center",
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={poll}
                                            onChange={(e) => setPoll(e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: "#22d3ee" },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                    backgroundColor: "rgba(34,211,238,0.55)",
                                                },
                                                "& .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.18)" },
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography sx={{ ...titleFont, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                                            AUTO
                                        </Typography>
                                    }
                                />
                                <Button
                                    variant="text"
                                    onClick={() => fetchState(true)}
                                    startIcon={
                                        <RefreshIcon
                                            sx={{
                                                mr: 0,
                                                fontSize: 18,
                                                transition: "transform 0.2s ease",
                                                ...(stateMeta.isLoading && {
                                                    animation: "spin 0.9s linear infinite",
                                                }),
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
                                        // letterSpacing: 1.1,
                                        background: "rgba(34,211,238,0.10)",
                                        color: "#CFFAFE",
                                        borderRadius: 2,
                                        "&:hover": {
                                            background: "rgba(34,211,238,0.18)",
                                        },
                                    }}
                                >
                                </Button>

                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Controls */}
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                            variant="outlined"
                            sx={{
                                ...cardSx,
                                ...blinkSx(motion.vertActive),
                                borderColor: motion.vertActive ? "rgba(168,85,247,0.45)" : "rgba(255,255,255,0.10)",
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Stack direction="row" alignItems="center">
                                        <Typography sx={{ ...titleFont, fontWeight: 900 }}>
                                            VERTICAL
                                        </Typography>
                                        <MotionBadge active={motion.vertActive} dir={motion.vertDir} />
                                    </Stack>
                                </Stack>

                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        disabled={cmdBusy}
                                        onClick={() => run(() => vertical(1).unwrap())}
                                        sx={btnPrimarySx}
                                    >
                                        UP
                                    </Button>
                                    <Button
                                        variant="contained"
                                        disabled={cmdBusy}
                                        onClick={() => run(() => vertical(-1).unwrap())}
                                        sx={btnPrimarySx}
                                    >
                                        DOWN
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        disabled={cmdBusy}
                                        onClick={() => run(() => vertical(0).unwrap())}
                                        sx={btnStopSx}
                                    >
                                        STOP
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                            variant="outlined"
                            sx={{
                                ...cardSx,
                                ...blinkSx(motion.angleActive),
                                borderColor: motion.angleActive ? "rgba(168,85,247,0.45)" : "rgba(255,255,255,0.10)",
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Stack direction="row" alignItems="center">
                                        <Typography sx={{ ...titleFont, fontWeight: 900,  }}>
                                            ANGLE
                                        </Typography>
                                        <MotionBadge active={motion.angleActive} dir={motion.angleDir} />
                                    </Stack>
                                </Stack>

                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        disabled={cmdBusy}
                                        onClick={() => run(() => angle(1).unwrap())}
                                        sx={btnPrimarySx}
                                    >
                                        UP
                                    </Button>
                                    <Button
                                        variant="contained"
                                        disabled={cmdBusy}
                                        onClick={() => run(() => angle(-1).unwrap())}
                                        sx={btnPrimarySx}
                                    >
                                        DOWN
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        disabled={cmdBusy}
                                        onClick={() => run(() => angle(0).unwrap())}
                                        sx={btnStopSx}
                                    >
                                        STOP
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined" sx={{ ...cardSx, borderColor: "rgba(255,255,255,0.10)" }}>
                            <CardContent>
                                <Stack spacing={1.25} sx={{ ...titleFont }}>
                                    <InlineNumberCommand
                                        label="Set height"
                                        busy={cmdBusy}
                                        min={0}
                                        max={1.4}
                                        step={0.01}
                                        onSend={(n) => run(() => setHeight(n).unwrap())}
                                    />
                                    <InlineNumberCommand
                                        label="Force height"
                                        busy={cmdBusy}
                                        min={0}
                                        max={1.4}
                                        step={0.01}
                                        onSend={(n) => run(() => forceHeight(n).unwrap())}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Raw */}
                <Card
                    variant="outlined"
                    sx={{
                        ...cardSx,
                        mt: 2,
                        borderColor: "rgba(255,255,255,0.10)",
                    }}
                >
                    <CardContent>
                        <Typography sx={{ ...titleFont, fontWeight: 900, mb: 1, color: "rgba(255,255,255,0.85)" }}>
                            RESPONSE STATE
                        </Typography>
                        <Box
                            component="pre"
                            sx={{
                                m: 0,
                                p: 1.5,
                                borderRadius: 2,
                                overflow: "auto",
                                fontSize: 12,
                                color: "#CFFAFE",
                                border: "1px solid rgba(34,211,238,0.14)",
                                background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.18))",
                                boxShadow: "inset 0 0 0 1px rgba(168,85,247,0.08)",
                                fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                lineHeight: 1.35,
                            }}
                        >
                            {JSON.stringify(stateData, null, 2)}
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
