import React from "react";
import type { AppProps } from "next/app";
import { AppProvider } from "../contexts/appContext";

import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}

export default MyApp;
