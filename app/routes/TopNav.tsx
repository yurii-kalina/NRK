import React from "react";
import { Box, Button, Stack } from "@mui/material";
import { NavLink } from "react-router";

const linkBtnSx = (active: boolean) => ({
    borderRadius: 2,
    fontWeight: 900,
    letterSpacing: 1,
    color: active ? "#041014" : "rgba(255,255,255,0.85)",
    borderColor: active ? "transparent" : "rgba(255,255,255,0.18)",
    background: active
        ? "linear-gradient(135deg, rgba(34,211,238,1), rgba(168,85,247,1))"
        : "rgba(0,0,0,0.12)",
    "&:hover": {
        background: active
            ? "linear-gradient(135deg, rgba(34,211,238,1), rgba(139,92,246,1))"
            : "rgba(0,0,0,0.18)",
    },
});

export default function TopNav() {
    return (
        <Box
            sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.20)",
                backdropFilter: "blur(10px)",
                position: "sticky",
                top: 0,
                zIndex: 10,
            }}
        >
            <Stack direction="row" spacing={1}>
                <NavLink to="/mast" style={{ textDecoration: "none" }}>
                    {({ isActive }) => (
                        <Button variant="outlined" sx={linkBtnSx(isActive)}>
                            MAST
                        </Button>
                    )}
                </NavLink>

                <NavLink to="/bridg" style={{ textDecoration: "none" }}>
                    {({ isActive }) => (
                        <Button variant="outlined" sx={linkBtnSx(isActive)}>
                            BRIDG
                        </Button>
                    )}
                </NavLink>
            </Stack>
        </Box>
    );
}
