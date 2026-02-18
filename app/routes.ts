import { type RouteConfig, layout, route, index } from "@react-router/dev/routes";

export default [
    layout("routes/appNRK.tsx", [
        index("routes/_index.tsx"),
        route("mast", "routes/mast/Mast.tsx"),
        route("bridg", "routes/mast/Bridg.tsx"),
    ]),
] satisfies RouteConfig;
