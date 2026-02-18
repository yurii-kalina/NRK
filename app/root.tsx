import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { Provider } from "react-redux";
import { store } from "./store/store";

export default function App() {
    return (
        <html lang="uk">
        <head>
            <Meta />
            <Links />
        </head>
        <body>
        <Provider store={store}>
            <Outlet />
        </Provider>

        <ScrollRestoration />
        <Scripts />
        </body>
        </html>
    );
}
