"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isRunningStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PWAInstallButton() {
  const hydrated = useHydrated();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    setInstalled(isRunningStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!hydrated || installed || !installEvent) {
    return null;
  }

  const handleInstall = async () => {
    setIsPrompting(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallEvent(null);
      }
    } finally {
      setIsPrompting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleInstall()}
      disabled={isPrompting}
      className="inline-flex rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={isPrompting ? "Opening install prompt" : "Install app"}
      title={isPrompting ? "Opening install prompt" : "Install app"}
    >
      {isPrompting ? "Opening..." : "Install app"}
    </button>
  );
}
