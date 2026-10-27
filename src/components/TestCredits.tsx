"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Info = { enabled: boolean; signedIn?: boolean; testCredits?: number; freeAvailable?: boolean; pack: { credits: number; amountRupees: number } };
type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpWindow = Window & { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } };

async function authHeaders(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowser();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as RzpWindow).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function TestCreditsButton({ signedIn, onNeedSignIn, email }: { signedIn: boolean; onNeedSignIn: () => void; email: string | null }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const r = await fetch("/api/credits", { headers: await authHeaders(), cache: "no-store" });
      setInfo(await r.json());
    } catch { setInfo(null); }
  };
  useEffect(() => { refresh(); }, [signedIn]);
  useEffect(() => { const f = () => { refresh(); }; window.addEventListener("roomly-credits-changed", f); return () => window.removeEventListener("roomly-credits-changed", f); }, []);

  if (!info?.enabled) return null;


  const buy = async () => {
    setBusy(true); setMsg(null);
    try {
      const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
      const o = await fetch("/api/pay/order", { method: "POST", headers });
      const order = await o.json();
      if (!o.ok) throw new Error(order.error || "Could not start test checkout.");
      if (!(await loadCheckout())) throw new Error("Could not load the test checkout.");
      const Rzp = (window as RzpWindow).Razorpay!;
      const rzp = new Rzp({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Roomly (TEST MODE)",
        description: `${info.pack.credits} extra images - test payment, no real money`,
        prefill: { email: email ?? undefined, contact: "9000090000" }, // Razorpay documented test contact; this component only runs with a test key
        theme: { color: "#4d6042" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (res: RzpResponse) => {
          try {
            const v = await fetch("/api/pay/verify", { method: "POST", headers, body: JSON.stringify(res) });
            const out = await v.json();
            if (!v.ok) throw new Error(out.error || "Could not confirm the test payment.");
            setMsg(`Test payment confirmed. You now have ${out.testCredits} test credits.`);
            await refresh();
          } catch (e) { setMsg(e instanceof Error ? e.message : "Could not confirm the test payment."); }
          setBusy(false);
        },
      });
      rzp.on("payment.failed", () => { setMsg("The test payment failed. Nothing was added."); setBusy(false); });
      rzp.open();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); }
  };

  return (
    <>
      <button className="text-button" onClick={() => (signedIn ? setOpen(true) : onNeedSignIn())}>Credits (test)</button>
      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Test credits">
          <div className="signin-modal">
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">Close</button>
            <h2>Test credits</h2>
            <p><b>Test mode.</b> No real money is charged. This only checks that payments work before launch.</p>
            <p>Free image (one per Google account): <b data-testid="free-status">{info.freeAvailable ? "available" : "used"}</b></p>
            <p>Your test credits: <b data-testid="test-credits">{info.testCredits ?? 0}</b></p>
            <p>{info.pack.credits} extra images for ₹{info.pack.amountRupees} (test payment). Each AI image uses 1 image: your 1 free image first, then test credits. Failed images are refunded.</p>
            <button className="email-login" onClick={buy} disabled={busy}>{busy ? "Working..." : `Pay ₹${info.pack.amountRupees} (test)`}</button>
            {msg && <p role="status">{msg}</p>}
            <small>Use Razorpay test payment details in the checkout window. Real cards and UPI will not be charged.</small>
          </div>
        </div>
      )}
    </>
  );
}
