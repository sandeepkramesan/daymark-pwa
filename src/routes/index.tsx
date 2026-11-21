import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

export const Route = createFileRoute("/")({
  component: Home,
});

function asset(path: string) {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${path}`;
}

function Home() {
  useEffect(() => {
    const host = document.getElementById("daymark-root");
    if (!host) return;
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(asset("/daymark/index.html"));
        if (!res.ok) throw new Error(`Daymark failed to load (${res.status})`);
        const doc = new DOMParser().parseFromString(await res.text(), "text/html");
        if (cancel) return;
        doc.body.querySelectorAll("script").forEach((node) => node.remove());
        host.replaceChildren(...Array.from(doc.body.childNodes));
        await loadScript(asset("/daymark/app.js"));
        if (cancel) return;
        (window as Window & { daymarkBoot?: () => void }).daymarkBoot?.();
      } catch (error) {
        if (cancel) return;
        host.textContent = error instanceof Error ? error.message : "Daymark could not be loaded.";
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div id="daymark-root">
      <div id="splash" aria-label="Daymark">
        <div className="splash-logo">✓</div>
      </div>
    </div>
  );
}

function loadScript(src: string) {
  const win = window as Window & { daymarkBoot?: () => void };
  if (win.daymarkBoot) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.type = "module";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Daymark could not be loaded."));
    document.body.appendChild(script);
  });
}
