import React from "react";
import type { AppProps } from "next/app";
import { AppProvider } from "../contexts/appContext";
import { DispensingProvider } from "../contexts/dispensingContext";
import { ErrorProvider } from "../contexts/errorContext";
import { KuStatesProvider } from "../contexts/kuStatesContext";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorProvider>
      <AppProvider>
        <KuStatesProvider>
          <DispensingProvider>
            <Component {...pageProps} />
          </DispensingProvider>
        </KuStatesProvider>
      </AppProvider>
    </ErrorProvider>
  );
}

export default MyApp;
