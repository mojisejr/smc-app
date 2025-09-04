import React from "react";
import type { AppProps } from "next/app";
import { AppProvider } from "../contexts/appContext";
import { DispensingProvider } from "../contexts/dispensingContext";
import { ErrorProvider } from "../contexts/errorContext";
import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorProvider>
      <AppProvider>
        <DispensingProvider>
          <Component {...pageProps} />
        </DispensingProvider>
      </AppProvider>
    </ErrorProvider>
  );
}

export default MyApp;
