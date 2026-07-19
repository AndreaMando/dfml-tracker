import "../globals.css";
import React from "react";
import { AppShell } from "../components/app-shell";
import { TranslationProvider } from "../lib/i18n";

export const metadata = {
  title: "DFML Tracker",
  description: "Dynasty Fantamanager League companion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TranslationProvider>
          <AppShell>{children}</AppShell>
        </TranslationProvider>
      </body>
    </html>
  );
}
