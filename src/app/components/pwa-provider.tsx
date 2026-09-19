"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type UpdateState = "idle" | "available" | "ready";

export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          // A new version is already waiting (e.g. SW updated while tab closed).
          if (registration.waiting && navigator.serviceWorker.controller) {
            setUpdateState("available");
          }

          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateState("available");
              }
            });
          });

          // Check for updates when the tab becomes visible again.
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") registration.update().catch(() => {});
          });
        })
        .catch(() => {});
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Standalone display means the app is already installed.
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
    );

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setInstallEvent(null);
    }
  }

  async function applyUpdate() {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.waiting?.postMessage("SKIP_WAITING");
    setUpdateState("ready");
    // The new SW takes over; reload once it controls this page.
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }

  const showInstall = installEvent !== null && !isInstalled && !dismissed;
  const showUpdate = updateState === "available" && !dismissed;

  if (!showInstall && !showUpdate) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none sm:inset-auto sm:bottom-5 sm:left-5">
      <div className="pointer-events-auto m-3 flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg sm:m-0">
        {showUpdate ? (
          <>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <CheckCircle2 size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Update available</p>
              <p className="text-xs text-slate-500">A new version of the app is ready.</p>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-800"
            >
              <RefreshCw size={13} /> Update Now
            </button>
          </>
        ) : (
          <>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <svg viewBox="0 0 512 512" className="size-5" aria-hidden="true">
                <rect width="512" height="512" rx="96" fill="#0f766e" />
                <circle cx="256" cy="224" r="128" fill="#ffffff" />
                <circle cx="256" cy="224" r="72" fill="#5eead4" />
                <rect x="248" y="216" width="16" height="184" rx="8" fill="#ffffff" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Install Northstar LIMS</p>
              <p className="text-xs text-slate-500">Quick access from your home screen.</p>
            </div>
            <button
              type="button"
              onClick={install}
              className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-800"
            >
              Install
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
