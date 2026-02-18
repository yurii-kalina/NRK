import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type MastConfig = { ip: string };
export type SetIpReq = { ip: string };

export type MastReq = { task: string; value: number };
export type MastResp = any;

export const LS_MAST_HOST = "mast_host";
export const LS_MAST_PORT = "mast_port";

export const DEFAULT_HOST = "192.168.189.11";
export const DEFAULT_PORT = "8070";

function getHostPort(): { host: string; port: string } {
    if (typeof window === "undefined") {
        return { host: DEFAULT_HOST, port: DEFAULT_PORT };
    }

    const host = window.localStorage.getItem(LS_MAST_HOST) || DEFAULT_HOST;
    const port = window.localStorage.getItem(LS_MAST_PORT) || DEFAULT_PORT;

    return { host, port };
}

function buildBaseUrl(host: string, port: string): string {
    return `http://${host}:${port}`;
}

const rawBaseQuery = fetchBaseQuery({
    baseUrl: "",
    prepareHeaders: (headers) => {
        headers.set("content-type", "application/json");
        return headers;
    },
});

const baseQuery = async (args: any, api: any, extraOptions: any) => {
    const { host, port } = getHostPort();
    const base = buildBaseUrl(host, port);

    const withBase =
        typeof args === "string"
            ? `${base}${args}`
            : { ...args, url: `${base}${args.url}` };

    return rawBaseQuery(withBase, api, extraOptions);
};

export const mastApi = createApi({
    reducerPath: "mastApi",
    baseQuery,
    tagTypes: ["MastConfig", "MastState", "MastVertical", "MastAngle", "MastSetHigh", "MastForceHigh"],
    endpoints: (builder) => ({
        state: builder.mutation<MastResp, void>({
            query: () => ({ url: "/mast", method: "POST", body: { task: "s", value: 0 } }),
            invalidatesTags: ["MastState"],
        }),
        vertical: builder.mutation<MastResp, number>({
            query: (direction: number) => ({ url: "/mast", method: "POST", body: { task: "v", value: direction } }),
            invalidatesTags: ["MastVertical"],
        }),
        angle: builder.mutation<MastResp, number>({
            query: (direction: number) => ({ url: "/mast", method: "POST", body: { task: "a", value: direction } }),
            invalidatesTags: ["MastAngle"],
        }),
        setHeight: builder.mutation<MastResp, number>({
            query: (height: number) => ({ url: "/mast", method: "POST", body: { task: "h", value: height } }),
            invalidatesTags: ["MastSetHigh"],
        }),
        forceHeight: builder.mutation<MastResp, number>({
            query: (height: number) => ({ url: "/mast", method: "POST", body: { task: "f", value: height } }),
            invalidatesTags: ["MastForceHigh"],
        }),
    }),
});

export const {
    useStateMutation,
    useVerticalMutation,
    useAngleMutation,
    useSetHeightMutation,
    useForceHeightMutation,
} = mastApi;

export const mastStorage = {
    get(): { host: string; port: string } {
        return getHostPort();
    },
    set(host: string, port: string) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(LS_MAST_HOST, (host ?? "").trim());
        window.localStorage.setItem(LS_MAST_PORT, (port ?? "").trim());
    },
    preview(host: string, port: string) {
        const h = (host ?? "").trim() || DEFAULT_HOST;
        const p = (port ?? "").trim() || DEFAULT_PORT;
        return buildBaseUrl(h, p);
    },
};
