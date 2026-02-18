import React from "react";
import { Box, Container, Typography, Card, CardContent } from "@mui/material";

export default function Bridg() {
    const cardSx = {
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        backdropFilter: "blur(12px)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    };

    const mono = {
        fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        letterSpacing: 1.2,
    };

    return (
        <Box sx={{ minHeight: "calc(100vh - 56px)", py: 3 }}>
            <Container maxWidth="md">
                <Card variant="outlined" sx={cardSx}>
                    <CardContent>
                        <Typography variant="h5" fontWeight={900} sx={mono} color="rgba(255,255,255,0.92)">
                            BRIDG
                        </Typography>
                        <Typography sx={{ opacity: 0.75, mt: 1, ...mono, color: "rgba(207,250,254,0.85)" }}>
                            Тут буде логіка ХЗ ШО
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
