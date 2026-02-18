import { configureStore } from "@reduxjs/toolkit";
import { mastApi } from "./mastApi";

export const store = configureStore({
    reducer: {
        [mastApi.reducerPath]: mastApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(mastApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
