"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { PWARegistration } from "@/components/PWARegistration";
import { TRPCReactProvider } from "@/lib/trpc";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      richColors
      position="top-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <TRPCReactProvider>
          {children}
          <PWARegistration />
          <ThemedToaster />
        </TRPCReactProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
