"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stylePlans } from "@/lib/style-plans";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { TestCreditsButton } from "@/components/TestCredits";
import { ADD_ITEMS, type AddItemKey, buildMask, changedFraction, composite, cropBox, canvasToObjectURL, dataUrlToCanvas, makeWorkCanvas, CROP , maskForApi } from "@/lib/add-edits";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";

type IconName =
  | "arrow"
  | "sparkle"
  | "camera"
  | "upload"
  | "check"
  | "lock"
  | "zap"
  | "sliders"
  | "bag"
  | "heart"
  | "close"
  | "play"
  | "chevron"
  | "quote"
  | "info";

type Product = {
  id: string;
  title: string;
  detail: string;
  price: number;
  category: string;
  position: { left: string; top: string };
  tone: "rust" | "olive" | "ink" | "amber";
};

const baseRoom =
  "https://images.pexels.com/photos/33688058/pexels-photo-33688058.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600";

const themes = [
  { name: "Warm minimal", swatch: "#d77243" },
  { name: "Earthy retreat", swatch: "#8a995c" },
  { name: "Coastal calm", swatch: "#7999a4" },
  { name: "Modern Indian", swatch: "#b96545" },
];

function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    sparkle: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z" /><path d="m19 17-.6 2.4L16 20l2.4.6L19 23l.6-2.4L22 20l-2.4-.6L19 17Z" /><path d="m5 2-.5 2L2 4.5l2 .5.5 2 .5-2 2-.5-2-.5L5 2Z" /></>,
    camera: <><path d="M4 7h3l1.4-2h7.2L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3" /></>,
    upload: <><path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    sliders: <><path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M1 14h6" /><path d="M9 8h6" /><path d="M17 16h6" /></>,
    bag: <><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    quote: <path d="M8.8 8A5.7 5.7 0 0 0 5 14.1V17h5v-5H7.6A3.2 3.2 0 0 1 10 9V5.5A7.2 7.2 0 0 0 8.8 8Zm9 0A5.7 5.7 0 0 0 14 14.1V17h5v-5h-2.4A3.2 3.2 0 0 1 19 9V5.5A7.2 7.2 0 0 0 17.8 8Z" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  };

  return <svg {...props}>{paths[name]}</svg>;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

async function roomlyAuth(): Promise<Record<string, string>> {
  const sb = getSupabaseBrowser();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, "X-Roomly-Action": crypto.randomUUID() } : {};
}

export default function HomePage() {
  const pageRef = useRef<HTMLElement>(null);
  const [motion, setMotion] = useState(true);
  const [view, setView] = useState<"landing" | "studio">("landing");
  
  useEffect(() => {
    if (!motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations = Array.from(pageRef.current?.querySelectorAll('.hero-copy h1 span, .hero-frame, .shop-ready') || []).map((el, i) => el.animate([{ transform: 'translateY(18px)' }, { transform: 'translateY(0)' }], { duration: 650, delay: i * 75, easing: 'cubic-bezier(.2,.7,.3,1)' }));
    return () => animations.forEach(a => a.cancel());
  }, [view, motion]);

  const [roomType, setRoomType] = useState("Rented apartment");
  const [theme, setTheme] = useState<keyof typeof stylePlans>("Warm minimal");
  const plan = stylePlans[theme];
  const products: Product[] = useMemo(() => plan.pieces.map((p, i) => ({ id: String(i), title: p[0], detail: p[1], price: p[2], category: p[3], position: { left: "0", top: "0" }, tone: (["rust", "olive", "ink", "amber"] as const)[i % 4] })), [plan]);
  const [budget, setBudget] = useState(6000);
  
  const [generated, setGenerated] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInSent, setSignInSent] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const signInWithGoogle = async () => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };
  const sendMagicLink = async () => {
    const supabase = getSupabaseBrowser();
    const email = signInEmail.trim();
    if (!supabase || !email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) notify("Could not send the sign-in link - please try again.");
    else setSignInSent(true);
  };
  const isGenerating = false;
  const [cart, setCart] = useState<string[]>([]);
  const [showPhoto, setShowPhoto] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [showList, setShowList] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editStack, setEditStack] = useState<string[]>([]);
  const [addedItems, setAddedItems] = useState<AddItemKey[]>([]);
  const [placingItem, setPlacingItem] = useState<AddItemKey | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editConsent, setEditConsent] = useState(false);

  useEffect(() => {
    try { setHasSaved(!!localStorage.getItem("roomly-brief-v1")); } catch { /* Storage can be disabled. */ }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/ai-makeover")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { enabled?: boolean } | null) => {
        if (active) setAiAvailable(data?.enabled === true);
      })
      .catch(() => {
        if (active) setAiAvailable(false);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setShowPhoto(false); setShowList(false); setShowApi(false); setShowSignIn(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const roomImage = uploadedImage || "";
  const cartProducts = useMemo(() => products.filter((product) => cart.includes(product.id)), [cart]);
  const cartTotal = cartProducts.reduce((total, product) => total + product.price, 0);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => { void handleFile(event.target.files?.[0]); };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      notify("For the best result, use a room photo under 7 MB.");
      return;
    }
    // Use an object URL, never a data URL: object URLs carry no image bytes,
    // so analytics style/attribute capture can never exfiltrate the photo.
    // Read the bytes first so the blob behind the URL is fully materialised
    // before any <img> starts loading it.
    let blobUrl: string;
    try {
      const bytes = await file.arrayBuffer();
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: file.type }));
    } catch {
      notify("That photo could not be read. Please try a different one.");
      return;
    }
    setUploadedImage((previous) => {
      if (previous && previous.startsWith("blob:")) URL.revokeObjectURL(previous);
      return blobUrl;
    });
    setGenerated(false);
    setAiImage(null);
    setAiConsent(false);
    setAiError(null);
    workCanvasRef.current = null;
    setEditImage(null);
    setEditStack([]);
    setAddedItems([]);
    setPlacingItem(null);
    setEditError(null);
    notify("Room photo ready. Your layout stays private.");
  };

  const fitBudget = () => {
    // Exhaustive selection over six editorial ideas: most items, then highest allocation within budget.
    let best: string[] = []; let bestTotal = 0;
    for (let mask = 1; mask < 1 << products.length; mask++) {
      const chosen = products.filter((_, i) => mask & (1 << i));
      const total = chosen.reduce((sum, p) => sum + p.price, 0);
      if (total <= budget && (chosen.length > best.length || (chosen.length === best.length && total > bestTotal))) { best = chosen.map(p => p.id); bestTotal = total; }
    }
    setCart(best);
  };
  const generateMakeover = () => {
    if (!uploadedImage) { notify("Add a room photo first - the plan is for your space."); return; }
    fitBudget(); setGenerated(true);
    notify("Your style plan is ready. Your photo is unchanged.");
  };
  const saveBrief = () => {
    try { localStorage.setItem("roomly-brief-v1", JSON.stringify({ theme, roomType, budget, cart, generated })); setHasSaved(true); notify("Brief and list saved on this browser. Your photo is not saved."); }
    catch { notify("This browser blocked saving. You can still download your list."); }
  };
  const loadBrief = () => {
    try {
      const data = JSON.parse(localStorage.getItem("roomly-brief-v1") || "null");
      if (!data || !(data.theme in stylePlans) || !["Rented apartment", "PG / shared room", "Own house", "Boutique hotel"].includes(data.roomType) || !Number.isFinite(data.budget) || data.budget < 2000 || data.budget > 10000 || !Array.isArray(data.cart)) throw Error("Invalid draft");
      setTheme(data.theme); setRoomType(data.roomType); setBudget(data.budget); setCart(data.cart.filter((id: unknown) => typeof id === "string" && /^[0-5]$/.test(id))); setGenerated(!!data.generated); setView("studio"); notify("Saved brief loaded. Add your photo again if needed.");
    } catch { notify("No usable saved brief found in this browser."); }
  };
  const toggleCart = (productId: string) => {
    setCart((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    );
  };

  const placeAddEdit = async (item: AddItemKey, tapX: number, tapY: number) => {
    if (!uploadedImage || editBusy || !editConsent) return;
    setEditBusy(true);
    setEditError(null);
    try {
      if (!workCanvasRef.current) {
        workCanvasRef.current = await makeWorkCanvas(editImage ?? uploadedImage);
      }
      const work = workCanvasRef.current;
      const { bx, by } = cropBox(item, tapX, tapY, work.width, work.height);
      const mask = buildMask(item);
      const before = document.createElement("canvas");
      before.width = CROP; before.height = CROP;
      before.getContext("2d")?.drawImage(work, bx, by, CROP, CROP, 0, 0, CROP, CROP);
      let after: HTMLCanvasElement | null = null;
      let lastError = "";
      const auth = await roomlyAuth();
      if (!auth.Authorization) { setShowSignIn(true); setEditError("Sign in with Google to use your free image."); return; }
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await fetch("/api/add-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth },
          body: JSON.stringify({ crop: before.toDataURL("image/png"), mask: maskForApi(mask).toDataURL("image/png"), item, seed: Math.floor(Math.random() * 1e9), consent: true }),
        });
        const data = (await response.json().catch(() => ({}))) as { image?: string; error?: string };
        if (!response.ok || typeof data.image !== "string") {
          lastError = typeof data.error === "string" ? data.error : "The edit did not work this time.";
          if (response.status === 429 || response.status === 401 || response.status === 402) break;
          continue;
        }
        const candidate = await dataUrlToCanvas(data.image);
        if (changedFraction(before, candidate, mask) >= 0.2) {
          after = candidate;
          break;
        }
        lastError = "Nothing appeared at that spot - trying a different roll.";
      }
      if (!after) {
        setEditError(lastError || "Nothing appeared at that spot. Try a slightly different place or item.");
        return;
      }
      const previousUrl = editImage ?? uploadedImage;
      composite(work, after, mask, bx, by);
      const nextUrl = await canvasToObjectURL(work);
      setEditStack((stack) => [...stack, previousUrl]);
      setEditImage(nextUrl);
      setAddedItems((items) => [...items, item]);
      setPlacingItem(null);
      notify(`${ADD_ITEMS[item].label} added. Only that spot changed - the rest is still your photo.`);
    } catch {
      setEditError("The edit did not work this time. Please try again in a moment.");
    } finally {
      setEditBusy(false);
      window.dispatchEvent(new Event("roomly-credits-changed"));
    }
  };

  const undoAddEdit = () => {
    setEditStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;
      workCanvasRef.current = null;
      setEditImage(previous);
      setAddedItems((items) => items.slice(0, -1));
      return stack.slice(0, -1);
    });
  };

  const resetAddEdits = () => {
    workCanvasRef.current = null;
    setEditImage(null);
    setEditStack([]);
    setAddedItems([]);
    setPlacingItem(null);
    setEditError(null);
  };

  const runAiRestyle = async () => {
    if (!uploadedImage || !aiConsent || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      // Downscale client-side to max 1024px before upload: smaller upload,
      // lower AI cost, and the visitor's full-resolution original never leaves the device.
      const img = new Image();
      img.src = uploadedImage;
      await img.decode();
      const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const auth = await roomlyAuth();
      if (!auth.Authorization) { setShowSignIn(true); setAiError("Sign in with Google to use your free image."); return; }
      const response = await fetch("/api/ai-makeover", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ image: dataUrl, theme, roomType, consent: true, width: w, height: h }),
      });
      const data = (await response.json().catch(() => ({}))) as { image?: string; error?: string };
      if (!response.ok || typeof data.image !== "string") {
        setAiError(typeof data.error === "string" ? data.error : "The AI restyle did not work this time. Please try again later.");
      } else {
        setAiImage(data.image);
        notify("AI restyle ready. Details may differ from your room.");
      }
    } catch {
      setAiError("The AI restyle did not work this time. Please try again in a moment.");
    } finally {
      setAiBusy(false);
      window.dispatchEvent(new Event("roomly-credits-changed"));
    }
  };

  const goToStudio = () => {
    setView("studio");
    window.setTimeout(() => document.getElementById("studio")?.scrollIntoView({ behavior: motion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto", block: "start" }), 20);
  };

  const goToShop = () => {
    setView("studio");
    window.setTimeout(() => document.getElementById("decor-edit")?.scrollIntoView({ behavior: motion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto", block: "start" }), 30);
  };

  return (
    <main ref={pageRef} className={motion ? "motion-on" : "motion-off"}>
      <header className="topbar">
        <button className="brand" onClick={() => setView("landing")} aria-label="Roomly home">
          <span className="brand-mark"><span /></span>
          <span>roomly</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button onClick={() => { setView("landing"); window.setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: motion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" }), 30); }}>How it works</button>
          <button onClick={() => setShowApi(true)}>Feature status</button>
        </nav>
        <div className="nav-actions"><button className="motion-switch" aria-pressed={!motion} onClick={() => setMotion(!motion)}>{motion ? "Reduce motion" : "Motion off"}</button>
          <button className="text-button" onClick={goToShop}>Shop</button>
          <TestCreditsButton signedIn={Boolean(sessionEmail)} email={sessionEmail} onNeedSignIn={() => setShowSignIn(true)} />
          {sessionEmail ? (
            <button className="text-button" title="Tap to sign out" onClick={async () => { const sb = getSupabaseBrowser(); await sb?.auth.signOut(); setSessionEmail(null); notify("Signed out."); }}>{sessionEmail} · sign out</button>
          ) : (
            <button className="text-button" onClick={() => setShowSignIn(true)}>Sign in</button>
          )}
          <button className="mini-primary" onClick={goToStudio}>Try it free </button>
        </div>
      </header>

      {view === "landing" && (
        <>
          <section className="hero-shell">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="eyebrow">REAL ROOMS. FRESH IDEAS.</div>
                <h1><span>Come home</span><span>to a room</span><span>you love.</span></h1>
                <p className="hero-text">A brighter corner. A softer landing. Start with your room, choose what feels right and make a plan within your budget.</p>
                <div className="hero-actions"><button className="primary-button" onClick={goToStudio}>Start your makeover</button></div>
                <p className="generation-note hero-demo-note">Free room planner. No account needed.<br />Optional AI images (beta): sign in with Google, 1 free image per account.</p>
              </div>
              <div className="hero-visual" aria-label="Sample room, stock photo">
                <div className="hero-frame"><div className="hero-room-image" style={{ backgroundImage: `url(${baseRoom})` }} /><div className="hero-wash" /><div className="homely-caption"><b>A little more<br />at home.</b><small>Stock photo - not an AI result</small></div></div>
                <p className="homely-palette"><i /><i /><i /><span>Warm light. Soft textures. Natural tones.</span></p><p className="homely-note">Your space, at your pace.</p>
              </div>
            </div>
          </section>
          <section className="steps-section" id="how-it-works">
            <div className="section-kicker">A PLAN FOR YOUR REAL LIFE</div>
            <div className="steps-heading"><h2>A room you like.<br />A budget you choose.<br />A little more you.</h2></div>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><h3>Your room</h3><p>Bring your original room photo. It stays on your device unless you choose an optional AI edit.</p></article>
              <article className="step-card"><span className="step-number">02</span><h3>Your direction</h3><p>Choose a style, room type and comfortable decor budget.</p></article>
              <article className="step-card"><span className="step-number">03</span><h3>Your edit and shop</h3><p>Explore curated ideas, edit your list and shop similar pieces on Flipkart and Zepto.</p></article>
            </div><button className="primary-button" onClick={goToStudio}>Explore the studio</button>
          </section>
        </>
      )}

      <section className={`studio-section ${view === "studio" ? "studio-active" : ""}`} id="studio">
        <div className="studio-heading"><div><span className="section-kicker">YOUR MAKEOVER STUDIO</span><h2>Design the room <em>you’ve got.</em></h2></div><div className="secure-note"><Icon name="lock" size={15} /> Your photo stays on this device unless you choose AI restyle or tap-to-add - those send it, or just the part you tap, to Cloudflare for processing. Roomly never saves your photo.</div></div>

        <div className="studio-layout">
          <section className="canvas-panel">
            <div className="canvas-topline"><div><span className="eyebrow-number">01</span><h3>Your room, unchanged</h3></div><span className="image-hint">JPG, PNG or WEBP · under 7MB</span></div>
            <input ref={inputRef} onChange={handleUpload} type="file" accept="image/jpeg,image/png,image/webp" hidden />
            {!uploadedImage ? (
              <button className="upload-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} onClick={() => inputRef.current?.click()}><span className="upload-icon"></span><strong>Drop a room photo here</strong><span>or <u>choose from your device</u></span><small>Best results: stand back, include the walls and windows</small></button>
            ) : (
              <div className="work-canvas">
                <div className="canvas-photo" data-clarity-mask="true" style={{ backgroundImage: `url(${roomImage})` }} />
                {generated && <span className="compare-label after-label">ORIGINAL PHOTO · UNCHANGED</span>}
                <button className="expand-photo" onClick={() => setShowPhoto(true)}>Expand photo</button>
                {!isGenerating && <button className="change-photo" onClick={() => inputRef.current?.click()}> Change photo</button>}
              </div>
            )}
            <button className="makeover-button" onClick={generateMakeover} disabled={isGenerating}><> {generated ? "Rebuild my plan" : "Build my style plan"}<span className="button-price">Free</span></></button>
            {generated && <button className="plan-jump" onClick={() => document.getElementById("decor-edit")?.scrollIntoView({ behavior: motion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" })}>Shop my decor edit</button>}
            <p className="generation-note">A real planning tool, not an AI render. Your original photo stays unchanged; the style plan is based on curated ideas and illustrative prices.</p>
            {uploadedImage && (
              <div className="ai-block add-block" data-clarity-mask="true">
                <span className="section-kicker">ADD A FEW THINGS · BETA</span>
                <p className="ai-block-copy">Place a plant, wall art, a vase or a cushion into <b>your actual photo</b>. Only the spot you tap changes - the rest of the room stays exactly as it is.</p>
                <label className="ai-consent">
                  <input type="checkbox" checked={editConsent} onChange={(event) => setEditConsent(event.target.checked)} />
                  <span>I agree to send the part of the photo I tap to Cloudflare for AI editing. Cloudflare's policy: photos are not used to train AI and are not kept beyond processing needs, except where legally required; technical logs are kept.</span>
                </label>
                <div className="add-item-row">
                  {(Object.keys(ADD_ITEMS) as AddItemKey[]).map((key) => (
                    <button key={key} className={`theme-choice ${placingItem === key ? "selected" : ""}`} disabled={!editConsent || editBusy} onClick={() => setPlacingItem(placingItem === key ? null : key)}>{ADD_ITEMS[key].label}</button>
                  ))}
                </div>
                {placingItem && !editBusy && <p className="add-place-hint">Now {ADD_ITEMS[placingItem].hint} on the photo below.</p>}
                {editBusy && <p className="add-place-hint"><span className="spinner" /> Adding to your photo - can take up to half a minute...</p>}
                {editError && <p className="ai-error">{editError}</p>}
                <div className="add-edit-photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={`add-edit-photo ${placingItem && !editBusy ? "placing" : ""}`}
                    src={editImage ?? roomImage}
                    alt="Your room photo with any additions you placed"
                    onPointerDown={(event) => {
                      if (!placingItem || editBusy) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const work = workCanvasRef.current;
                      const scaleX = (work?.width ?? event.currentTarget.naturalWidth) / rect.width;
                      const scaleY = (work?.height ?? event.currentTarget.naturalHeight) / rect.height;
                      placeAddEdit(placingItem, (event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY);
                    }}
                  />
                </div>
                {editStack.length > 0 && (
                  <div className="add-actions">
                    <button className="add-undo-button" onClick={undoAddEdit} disabled={editBusy}>Undo last</button>
                    <button className="add-undo-button" onClick={resetAddEdits} disabled={editBusy}>Start over</button>
                    <a className="ai-download" href={editImage ?? roomImage} download="roomly-my-room-edit.png">Download photo</a>
                  </div>
                )}
                {addedItems.length > 0 && (
                  <p className="shop-links add-similar"><span className="shop-links-label">Shop similar (search results, not exact matches):</span>
                    {[...new Set(addedItems)].map((key) => (
                      <span key={key} className="add-similar-group">{ADD_ITEMS[key].label}: <a href={`https://www.flipkart.com/search?q=${encodeURIComponent(ADD_ITEMS[key].search)}`} target="_blank" rel="noopener noreferrer">Flipkart</a> <a href={`https://www.zepto.com/search?query=${encodeURIComponent(ADD_ITEMS[key].search)}`} target="_blank" rel="noopener noreferrer">Zepto</a></span>
                    ))}
                  </p>
                )}
                <p className="generation-note">Free - shared daily limit. AI adds can look artificial and sometimes miss the spot or the colour; undo and try again cost nothing extra. Roomly does not store your photo or the result.</p>
              </div>
            )}
            {uploadedImage && (
              <div className="ai-block" data-clarity-mask="true">
                <span className="section-kicker">AI RESTYLE · BETA</span>
                <p className="ai-block-copy">AI re-imagines your room in your chosen style - a concept, not an exact preview. Walls, windows, furniture and the layout itself can change.</p>
                <label className="ai-consent">
                  <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} />
                  <span>I agree to send this room photo to Cloudflare for AI processing. Cloudflare's policy: photos are not used to train AI and are not kept beyond processing needs, except where legally required; technical logs are kept.</span>
                </label>
                <button className="makeover-button ai-button" onClick={runAiRestyle} disabled={!aiAvailable || !aiConsent || aiBusy}>
                  {aiBusy ? <><span className="spinner" /> Restyling your room...</> : aiAvailable ? "Create AI restyle" : "AI restyle setup required"}
                  {!aiBusy && <span className="button-price">{aiAvailable ? "Beta" : "Offline"}</span>}
                </button>
                <p className="generation-note">{aiAvailable ? "Needs Google sign-in. Uses 1 image (1 free per account, then test credits). Failed images are refunded. Shared daily limit applies. Roomly does not store your photo or the result." : "AI restyle is not configured yet. The owner must add Cloudflare server credentials and run the one-time daily-budget SQL setup. Your photo stays on this device."}</p>
                {aiError && <p className="ai-error">{aiError}</p>}
                {aiImage && (
                  <div className="ai-result">
                    <div className="ai-result-grid">
                      <figure>
                        <div className="ai-result-img" style={{ backgroundImage: `url(${roomImage})` }} />
                        <figcaption>YOUR ORIGINAL PHOTO · UNCHANGED</figcaption>
                      </figure>
                      <figure>
                        <div className="ai-result-img" style={{ backgroundImage: `url(${aiImage})` }} />
                        <figcaption>AI RESTYLE · A CONCEPT - DETAILS, WINDOWS AND LAYOUT CAN CHANGE</figcaption>
                      </figure>
                    </div>
                    <a className="ai-download" href={aiImage} download="roomly-ai-restyle.jpg">Download AI restyle</a>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="brief-panel">
            <div className="panel-heading"><span className="eyebrow-number">02</span><h3>Your room brief</h3></div>

            <label className="field-label">ROOM TYPE</label>
            <div className="select-wrap"><select aria-label="Room type" value={roomType} onChange={(event) => setRoomType(event.target.value)}><option>Rented apartment</option><option>PG / shared room</option><option>Own house</option><option>Boutique hotel</option></select><Icon name="chevron" size={16} /></div>

            <label className="field-label">STYLE DIRECTION</label>
            <div className="theme-list">{themes.map((item) => <button className={`theme-choice ${theme === item.name ? "selected" : ""}`} key={item.name} aria-pressed={theme === item.name} onClick={() => { setTheme(item.name as keyof typeof stylePlans); setCart([]); setGenerated(false); }}><span className="theme-swatch" style={{ background: item.swatch }} />{item.name}</button>)}</div>

            <label className="field-label budget-label">TOTAL DECOR BUDGET <span>₹{formatPrice(budget)}</span></label>
            <input aria-label="Decor budget" className="budget-range" type="range" min="2000" max="10000" step="500" value={budget} onChange={(event) => setBudget(Number(event.target.value))} style={{ "--range-progress": `${((budget - 2000) / 8000) * 100}%` } as CSSProperties} />
            <div className="range-ends"><span>₹2,000</span><span>₹10,000+</span></div>

            <div className="palette-strip" aria-label={`${theme} color palette`}>{plan.palette.map(([name, color]) => <div key={name}><span style={{ background: color }} /><small>{name}</small></div>)}</div>
            <div className="local-tools"><button onClick={saveBrief}>Save on this device</button>{hasSaved && <><button onClick={loadBrief}>Load saved brief</button><button onClick={() => { try { localStorage.removeItem("roomly-brief-v1"); setHasSaved(false); notify("Saved brief removed."); } catch { notify("Could not clear the saved brief."); } }}>Clear saved brief</button></>}<small>Only your brief and list are saved here. Never your photo.</small></div>
          </aside>

          <aside id="decor-edit" className={`shop-panel ${generated ? "shop-ready" : ""}`}>
            <span className="section-kicker">SHOP SECTION</span>
            <div className="panel-heading"><span className="eyebrow-number">03</span><h3>Shop your decor edit</h3></div>
            {generated ? <>
              <p className="shop-intro">Curated {theme.toLowerCase()} ideas. Illustrative budget allocations, not live prices or objects detected in your photo.</p>
              <div className="budget-card"><span>{cartTotal > budget ? "Over your budget" : "Your budget, in view"}</span><strong>₹{formatPrice(cartTotal)} <small>/ ₹{formatPrice(budget)}</small></strong><div className="budget-track"><i style={{ width: `${Math.min(100, cartTotal / budget * 100)}%`, background: cartTotal > budget ? "#b9502e" : "#7d8b58" }} /></div><p>{cartTotal > budget ? `Remove ₹${formatPrice(cartTotal - budget)} to fit your budget.` : `₹${formatPrice(budget - cartTotal)} left for delivery or other changes.`}</p><button onClick={() => { fitBudget(); notify("List adjusted to fit your budget."); }}>Fit list to my budget</button></div>
              <div className="decor-cards">{products.map(product => <div key={product.id} className={`decor-card ${cart.includes(product.id) ? "in-list" : ""}`}><button className="decor-pick" onClick={() => toggleCart(product.id)} aria-pressed={cart.includes(product.id)} aria-label={`${cart.includes(product.id) ? "Remove" : "Add"} ${product.title}`}><span className="decor-symbol"></span><span><small>{product.category}</small><b>{product.title}</b><em>{product.detail}</em><strong>₹{formatPrice(product.price)} <small>allocation</small></strong></span><span className="decor-toggle">{cart.includes(product.id) ? "Added" : "Add"}</span></button><div className="shop-links"><span className="shop-links-label">Shop similar</span><a href={`https://www.flipkart.com/search?q=${encodeURIComponent(product.title)}`} target="_blank" rel="noopener noreferrer">Flipkart</a><a href={`https://www.zepto.com/search?query=${encodeURIComponent(product.title)}`} target="_blank" rel="noopener noreferrer">Zepto</a><span className="shop-link-pending" title="Not available yet">Amazon · soon</span><span className="shop-link-pending" title="Not available yet">Meesho · soon</span></div></div>)}</div>
              <p className="shop-links-note">Store buttons open that store's own search results for similar pieces - prices, stock and delivery are the store's. These are similar items, not exact matches to your plan. Amazon and Meesho links are not available yet.</p>
              <div className="cart-summary"><div><span>Your edit list</span><b>{cart.length} pieces · ₹{formatPrice(cartTotal)}</b></div><button onClick={() => setShowList(true)}>View list </button></div>
            </> : <div className="shop-empty"><div><Icon name="bag" size={24} /></div><b>This is the shop section</b><p>Add your photo, choose a style and budget, then build your plan. Every decor suggestion here gets Flipkart and Zepto buttons so you can browse similar pieces and buy them on those stores. Amazon and Meesho are not connected yet.</p><span><Icon name="info" size={14} /> Sample prices - confirm before buying</span></div>}
          </aside>
        </div>
      </section>

      {view === "studio" && <section className="styling-section"><div className="styling-heading"><span className="section-kicker">YOUR {theme.toUpperCase()} DIRECTION</span><h2>{plan.tagline}</h2><p>Editorial guidance for your chosen style, not an analysis of your photo.</p></div><div className="styling-steps">{plan.steps.map((step, i) => <article key={step}><span>0{i + 1}</span><p>{step}</p></article>)}</div><div className="renter-note"><Icon name="info" size={18} /><p>{roomType === "PG / shared room" || roomType === "Rented apartment" ? "Renting? Start with movable pieces. Check your agreement before drilling, painting or using adhesives; removable does not always mean damage-free." : "Before buying: measure your space, check power points and clear walking routes. These are styling ideas, not a measured floor plan."}</p></div></section>}
      {showPhoto && <div className="photo-viewer" data-clarity-mask="true" role="dialog" aria-modal="true" aria-label="Full room photo"><button onClick={() => setShowPhoto(false)} aria-label="Close full photo"> Close</button><img src={roomImage} alt="Your original room photo, unchanged" /><p>Original photo. No AI changes. Only visible on this device.</p></div>}

      <footer><button className="brand" onClick={() => setView("landing")}><span className="brand-mark"><span /></span><span>roomly</span></button><span>Imagined for real life, not just the feed.</span><div><button onClick={() => { setView("landing"); window.setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: motion && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" }), 30); }}>How it works</button><button onClick={() => setShowApi(true)}>Feature status</button></div></footer>

      {showSignIn && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sign in"><div className="signin-modal"><button className="modal-close" onClick={() => setShowSignIn(false)} aria-label="Close">Close</button><div className="modal-mark"><Icon name="sparkle" size={22} /></div><h2>Sign in with Google.</h2><p>Sign-in with Google is new. Saved makeovers are not enabled yet - your rooms still stay on this device. The public workspace works without an account.</p>{!getSupabaseBrowser() ? <p>Sign-in is not enabled in this public demo yet. Your photo and results stay on this device unless you choose the AI restyle above.</p> : signInSent ? <p>Check your email - we sent a secure sign-in link to <b>{signInEmail}</b>. Open it on this device to finish signing in.</p> : <><button className="email-login" onClick={signInWithGoogle}>Continue with Google</button></>}<small>Room photos stay on your device unless you choose AI restyle or tap-to-add, which sends the photo - or just the part you tap - to Cloudflare for processing after your OK.</small></div></div>}

      {showApi && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Roomly feature status"><div className="api-modal"><button className="modal-close" onClick={() => setShowApi(false)} aria-label="Close">Close</button><span className="section-kicker">CURRENT FEATURE STATUS</span><h2>Plan your room. Keep your real photo.</h2><p>Build a style-specific plan with a palette, styling steps and a budget-fitting decor list. Expand your original photo, save your brief locally, or download the list. Store buttons link out to search results for similar items on Flipkart and Zepto; Amazon and Meesho are not connected yet. Live in-app retailer prices, checkout and public sign-in are not enabled. The optional AI restyle (beta) re-imagines your room - a concept, not an exact preview: walls, windows, furniture and the layout can change - and sends your photo to Cloudflare for processing only after you agree. Cloudflare's policy: photos are not used to train AI and are not kept beyond processing needs, except where legally required; technical logs are kept. It is available only after the owner configures Cloudflare credentials and the shared daily-budget table. Usage limits or charges depend on the Cloudflare account plan.</p><button className="primary-button" onClick={() => { setShowApi(false); goToStudio(); }}>Open the studio </button></div></div>}
      {showList && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Your decor list"><div className="api-modal"><button className="modal-close" onClick={() => setShowList(false)} aria-label="Close">Close</button><h2>Your decor list</h2><p>{theme} · {roomType} · Budget ₹{formatPrice(budget)}</p>{cartProducts.length ? cartProducts.map(product => <div className="list-item" key={product.id}><div><b>{product.title}</b><p>{product.detail} · estimate ₹{formatPrice(product.price)}</p><span className="shop-links list-shop"><span className="shop-links-label">Shop similar</span><a href={`https://www.flipkart.com/search?q=${encodeURIComponent(product.title)}`} target="_blank" rel="noopener noreferrer">Flipkart</a><a href={`https://www.zepto.com/search?query=${encodeURIComponent(product.title)}`} target="_blank" rel="noopener noreferrer">Zepto</a></span></div><button onClick={() => toggleCart(product.id)}>Remove</button></div>) : <p>Your list is empty. Add a sample piece from the studio.</p>}<p>Total estimate: ₹{formatPrice(cartTotal)} {cartTotal > budget ? "- over your budget" : "- within your budget"}</p><p>Illustrative allocations only. Check real prices, dimensions and delivery before buying. Save your brief on this device to keep this list, or download it.</p><button className="primary-button" onClick={() => { const blob = new Blob([`Roomly style plan\n${theme} | ${roomType}\nBudget: INR ${budget}\n${cartProducts.map(p => `${p.title} - INR ${p.price} (estimate)`).join("\n")}\nTotal estimate: INR ${cartTotal}\nIllustrative allocations, not live prices. Verify dimensions, delivery and prices before buying.\n\nSTYLING STEPS\n${plan.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n\nPALETTE\n${plan.palette.map(([name, color]) => `${name}: ${color}`).join("\n")}`], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "roomly-decor-list.txt"; a.click(); URL.revokeObjectURL(url); }}>Download list</button></div></div>}

      {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
    </main>
  );
}
