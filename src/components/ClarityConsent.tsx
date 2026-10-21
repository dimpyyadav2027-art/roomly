"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "roomly-analytics-consent";
const CLARITY_ID = "z12bx6klis";

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };
type ClarityWindow = Window & { clarity?: ClarityFn };

function loadClarity() {
  if (typeof window === "undefined") return;
  const w = window as ClarityWindow;
  if (w.clarity) return;
  const clarity = function (...args: unknown[]) {
    (clarity.q = clarity.q || []).push(args);
  } as ClarityFn;
  w.clarity = clarity;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.clarity.ms/tag/" + CLARITY_ID;
  const first = document.getElementsByTagName("script")[0];
  if (first && first.parentNode) {
    first.parentNode.insertBefore(script, first);
  } else {
    document.head.appendChild(script);
  }
  // Tell Clarity the visitor has accepted analytics cookies (Consent API).
  w.clarity("consent");
}

export default function ClarityConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(CONSENT_KEY);
    } catch {
      stored = null;
    }
    if (stored === "accepted") {
      loadClarity();
    } else if (stored !== "declined") {
      setVisible(true);
    }
  }, []);

  const choose = (accepted: boolean) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "declined");
    } catch {
      // Private mode etc. - choice applies to this visit only.
    }
    setVisible(false);
    if (accepted) loadClarity();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "16px",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: "520px",
        width: "calc(100% - 32px)",
        background: "#ffffff",
        color: "#1f2430",
        border: "1px solid #e3e6ee",
        borderRadius: "14px",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
        padding: "14px 16px",
        fontFamily: "inherit",
      }}
    >
      <p style={{ margin: "0 0 10px", fontSize: "13px", lineHeight: 1.5 }}>
        Roomly uses Microsoft Clarity to see how visitors use the site (clicks,
        scrolls and session replays). Your room photo stays on your device and
        is masked from analytics. Accept analytics cookies?
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => choose(false)}
          style={{
            border: "1px solid #d4d9e4",
            background: "#ffffff",
            color: "#1f2430",
            borderRadius: "8px",
            padding: "7px 14px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          No thanks
        </button>
        <button
          type="button"
          onClick={() => choose(true)}
          style={{
            border: "none",
            background: "#1f2430",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "7px 14px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
