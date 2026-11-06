"use client";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registers the service worker and offers "Install app". Android/Chrome get the real prompt; iPhone gets instructions. */
export default function InstallApp({ dark = false }: { dark?: boolean }) {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  return (
    <div className={`install ${dark ? "dark" : ""}`}>
      <div>
        <b>Get the Manchilui app</b>
        <small>{ios ? "Install it on your iPhone home screen." : "Install it on your phone. It opens like an app."}</small>
      </div>
      {prompt ? (
        <button type="button" className="btn btn-orange btn-sm" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>Install</button>
      ) : (
        <button type="button" className="btn btn-orange btn-sm" onClick={() => setHelp((h) => !h)}>How?</button>
      )}
      {help && ios && (
        <p className="install-help">In Safari, tap the <b>Share</b> button (square with an arrow), then <b>Add to Home Screen</b>, then <b>Add</b>.</p>
      )}
    </div>
  );
}
