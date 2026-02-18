import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import RefreshIcon from "@mui/icons-material/Refresh";

import {
    mastStorage,
    useBridgStateMutation,
    useBridgSetAzimuthAngleMutation,
    useBridgAzimuthCalibrationMutation,
    useBridgWifiSearchMutation,
} from "~/store/mastApi";

type BridgState = {
    Azimuth_current_steps?: number;
    Azimuth_full_steps?: number;
    status?: string;
    [k: string]: any;
};

function round1(n?: number): string {
    if (!Number.isFinite(n as number)) return "-";
    return (Math.round((n as number) * 10) / 10).toFixed(1);
}

function stepsToAngleDeg(steps?: number, fullSteps?: number): number | null {
    if (!Number.isFinite(steps as number) || !Number.isFinite(fullSteps as number)) return null;
    const fs = fullSteps as number;
    if (fs <= 0) return null;
    return ((steps as number) / fs) * 360;
}

export default function Bridg() {
    const [getState, stateMeta] = useBridgStateMutation();
    const [setAzimuth, setAzimuthMeta] = useBridgSetAzimuthAngleMutation();
    const [calib, calibMeta] = useBridgAzimuthCalibrationMutation();
    const [wifiSearch, wifiMeta] = useBridgWifiSearchMutation();

    const [isOnline, setIsOnline] = useState(false);
    const [stateData, setStateData] = useState<BridgState | null>(null);
    const [angleDegInput, setAngleDegInput] = useState<string>("");
    const [deviceBusy, setDeviceBusy] = useState(false);

    const cmdBusy =
        deviceBusy ||
        stateMeta.isLoading ||
        setAzimuthMeta.isLoading ||
        calibMeta.isLoading ||
        wifiMeta.isLoading;

    const titleFont = useMemo(
        () => ({
            fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            letterSpacing: 1.2,
            color: "#fff",
        }),
        []
    );

    const pingIp = async () => {
        const { host, port } = mastStorage.get();
        const url = `http://${host}:${port}/heartbit`;

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 1200);

        try {
            const resp = await fetch(url, {
                method: "GET",
                cache: "no-store",
                signal: controller.signal,
            });

            setIsOnline(resp.ok);
        } catch {
            setIsOnline(false);
        } finally {
            window.clearTimeout(timeout);
        }
    };

    useEffect(() => {
        pingIp();
        const t = window.setInterval(pingIp, 5000);
        return () => window.clearInterval(t);
    }, []);

    useEffect(() => {
        fetchState(false);
    }, []);

    const fetchState = async (notify = false) => {
        try {
            const resp = (await getState().unwrap()) as BridgState;
            setStateData(resp);
            setIsOnline(true);
            setDeviceBusy(resp?.is_busy === true);
            return resp;
        } catch (e) {
            console.error(e);
            setIsOnline(false);
            setDeviceBusy(false);
            if (notify) toast.error("State недоступний. Плата OFFLINE.");
            return null;
        }
    };

    async function run<T extends { status?: string; is_busy?: boolean }>(
        fn: () => Promise<T>
    ) {
        try {
            const resp = await fn();

            if (resp?.is_busy === true) {
                setDeviceBusy(true);
                toast.warning("Відбувається калібрування. Запити тимчасово недоступні.");
                return;
            } else {
                setDeviceBusy(false);
            }
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


    const currentAngle = useMemo(() => {
        const deg = stepsToAngleDeg(
            stateData?.Azimuth_current_steps,
            stateData?.Azimuth_full_steps
        );
        return deg === null ? "-" : `${round1(deg)}°`;
    }, [stateData]);

    const cardSx = {
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        backdropFilter: "blur(12px)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        color: "#fff",
    };

    const btnPrimarySx = {
        borderRadius: 2,
        fontWeight: 900,
        letterSpacing: 1,
        background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(168,85,247,1))",
        "&:hover": {
            background: "linear-gradient(135deg, rgba(34,211,238,1), rgba(139,92,246,1))",
        },
        "&.Mui-disabled": {
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)",
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

    const hostPort = mastStorage.get();

    return (
        <Box sx={{ minHeight: "calc(100vh - 56px)", py: 3 }}>
            <Container maxWidth="md">
                <ToastContainer autoClose={2500} hideProgressBar newestOnTop />

                {/* Header */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="h5" fontWeight={900} sx={titleFont}>
                            BRIDG
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
                                ...titleFont,
                            }}
                        >
                            {isOnline ? "ONLINE" : "OFFLINE"}
                        </Box>
                        {deviceBusy && (
                            <Box
                                sx={{
                                    px: 1.2,
                                    py: 0.35,
                                    borderRadius: 2,
                                    fontSize: 12,
                                    fontWeight: 900,
                                    background: "linear-gradient(135deg, rgba(239,68,68,1), rgba(185,28,28,1))",
                                    border: "1px solid rgba(255,255,255,0.14)",
                                    ...titleFont,
                                }}
                            >
                                BUSY
                            </Box>
                        )}


                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                            sx={{
                                px: 1.2,
                                py: 0.8,
                                borderRadius: 3,
                                border: "1px solid rgba(255,255,255,0.10)",
                                background: "rgba(0,0,0,0.18)",
                                boxShadow: "inset 0 0 0 1px rgba(34,211,238,0.08)",
                            }}
                        >
                            <Typography sx={{ ...titleFont, fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
                                angle: <b style={{ color: "#CFFAFE" }}>{currentAngle}</b>
                            </Typography>
                            <Typography sx={{ ...titleFont, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                                steps:{" "}
                                <b style={{ color: "rgba(221,214,254,0.95)" }}>
                                    {Number.isFinite(stateData?.Azimuth_current_steps as number)
                                        ? stateData?.Azimuth_current_steps
                                        : "-"}
                                    /
                                    {Number.isFinite(stateData?.Azimuth_full_steps as number)
                                        ? stateData?.Azimuth_full_steps
                                        : "-"}
                                </b>
                            </Typography>
                        </Box>

                        <Button
                            variant="text"
                            onClick={() => fetchState(true)}
                            startIcon={
                                <RefreshIcon
                                    sx={{
                                        fontSize: 18,
                                        ...(stateMeta.isLoading && { animation: "spin 0.9s linear infinite" }),
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
                            STATE
                        </Button>
                    </Stack>
                </Box>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined" sx={cardSx}>
                            <CardContent>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography sx={{ minWidth: 180, fontWeight: 900, ...titleFont }}>
                                            SET AZIMUTH (deg)
                                        </Typography>

                                        <TextField
                                            size="small"
                                            value={angleDegInput}
                                            onChange={(e) => setAngleDegInput(e.target.value)}
                                            type="number"
                                            sx={{ width: 160, ...inputSx }}
                                            slotProps={{
                                                input: {
                                                    inputProps: { min: -360, max: 360, step: 1 },
                                                },
                                            }}
                                        />

                                        <Button
                                            variant="contained"
                                            sx={btnPrimarySx}
                                            disabled={cmdBusy || angleDegInput.trim() === ""}
                                            onClick={() => {
                                                const raw = angleDegInput.trim();

                                                if (!/^-?\d+$/.test(raw)) {
                                                    toast.error("Допустиме тільки ціле число.");
                                                    return;
                                                }

                                                const value = Number(raw);

                                                if (value < -360 || value > 360) {
                                                    toast.error("Діапазон: -360 … 360.");
                                                    return;
                                                }

                                                run(() => setAzimuth(value).unwrap());
                                            }}
                                        >
                                            SEND
                                        </Button>
                                    </Stack>

                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            variant="contained"
                                            sx={btnPrimarySx}
                                            disabled={cmdBusy}
                                            onClick={() => run(() => calib().unwrap())}
                                        >
                                            ZERO POSITION
                                        </Button>

                                        <Button
                                            variant="contained"
                                            sx={btnPrimarySx}
                                            disabled={cmdBusy}
                                            onClick={() => run(() => wifiSearch().unwrap())}
                                        >
                                            WIFI SEARCH
                                        </Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Card variant="outlined" sx={cardSx}>
                            <CardContent>
                                <Typography
                                    sx={{
                                        ...titleFont,
                                        fontWeight: 900,
                                        mb: 1,
                                        color: "rgba(255,255,255,0.85)",
                                    }}
                                >
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
                                        fontFamily:
                                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                        lineHeight: 1.35,
                                    }}
                                >
                                    {JSON.stringify(stateData, null, 2)}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
