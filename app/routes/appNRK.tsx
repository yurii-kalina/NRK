import TopNav from "~/routes/TopNav";
import { Outlet } from "react-router";
import { Box } from "@mui/material";

export default function AppNRK() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    "radial-gradient(1000px 700px at 12% 10%, rgba(34,211,238,0.18), transparent 60%)," +
                    "radial-gradient(900px 650px at 88% 20%, rgba(168,85,247,0.18), transparent 55%)," +
                    "linear-gradient(135deg, #05070b, #060a12 40%, #070a18)",
            }}
        >
            <TopNav />
            <Outlet />
        </Box>
    );
}
