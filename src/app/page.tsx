"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
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

const products: Product[] = [
  {
    id: "rug",
    title: "Textured jute rug",
    detail: "5 × 7 ft · warm natural",
    price: 1699,
    category: "Soft layers",
    position: { left: "47%", top: "72%" },
    tone: "rust",
  },
  {
    id: "lamp",
    title: "Mushroom table lamp",
    detail: "Ceramic · ambient glow",
    price: 1199,
    category: "Lighting",
    position: { left: "75%", top: "42%" },
    tone: "amber",
  },
  {
    id: "art",
    title: "Abstract line print set",
    detail: "A3 · set of 2",
    price: 749,
    category: "Wall story",
    position: { left: "55%", top: "25%" },
    tone: "ink",
  },
  {
    id: "throw",
    title: "Olive cotton throw",
    detail: "130 × 170 cm · woven",
    price: 899,
    category: "Soft layers",
    position: { left: "30%", top: "58%" },
    tone: "olive",
  },
];

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

export default function HomePage() {
  const [view, setView] = useState<"landing" | "studio">("landing");
  const [tier, setTier] = useState<"standard" | "pro">("standard");
  const [roomType, setRoomType] = useState("Rented apartment");
  const [theme, setTheme] = useState("Warm minimal");
  const [budget, setBudget] = useState(6000);
  
  const [generated, setGenerated] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInSent, setSignInSent] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
      setSessionToken(data.session?.access_token ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
      setSessionToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("Reading room geometry");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0]);
  const [cart, setCart] = useState<string[]>(["rug", "lamp", "art"]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [showList, setShowList] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const roomImage = uploadedImage || baseRoom;
  const cartProducts = useMemo(() => products.filter((product) => cart.includes(product.id)), [cart]);
  const cartTotal = cartProducts.reduce((total, product) => total + product.price, 0);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => handleFile(event.target.files?.[0]);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      notify("For the best result, use a room photo under 7 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(String(reader.result));
      setGenerated(false);
      notify("Room photo ready. Your layout stays private.");
    };
    reader.readAsDataURL(file);
  };

  const generateMakeover = async () => {
    if (!uploadedImage) {
      notify("Add a room photo first - the plan is for your space.");
      return;
    }
    setIsGenerating(true);
    setProgressText("Reading your style and budget brief");
    window.setTimeout(() => setProgressText("Putting your look plan together"), 900);
    window.setTimeout(() => setProgressText("Matching pieces to your budget"), 1900);

    try {
      const response = await fetch("/api/makeover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          prompt: theme,
          budget,
          tier: tier === "pro" ? "PAID_150" : "FREE",
          roomType,
          // The room photo never leaves the device in the current demo:
          // it is used for the local before/after preview only and is not
          // sent to the server.
        }),
      });
      const data = (await response.json()) as { configured?: boolean; mode?: string; message?: string };
      if (data.mode === "demo") notify("Live AI redesign isn't connected yet - your photo is untouched.");
    } catch {
      notify("Server unavailable - you can still edit a local sample list. Nothing was saved online.");
    } finally {
      window.setTimeout(() => {
        setIsGenerating(false);
        setGenerated(true);
        notify("Your look plan is ready - your photo stays exactly as you took it.");
      }, 2550);
    }
  };

  const toggleCart = (productId: string) => {
    setCart((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    );
  };

  const goToStudio = () => {
    setView("studio");
    window.setTimeout(() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  };

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("landing")} aria-label="Roomly home">
          <span className="brand-mark"><span /></span>
          <span>roomly</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button onClick={() => { setView("landing"); window.setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }), 30); }}>How it works</button>
          <button onClick={() => setShowApi(true)}>Feature status</button>
        </nav>
        <div className="nav-actions">
          <button className="text-button" onClick={() => setShowSignIn(true)}>{sessionEmail ? sessionEmail : "Sign in"}</button>
          <button className="mini-primary" onClick={goToStudio}>Try it free <Icon name="arrow" size={15} /></button>
        </div>
      </header>

      {view === "landing" && (
        <>
          <section className="hero-shell">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> Design intelligence for real homes</div>
                <h1>See your room’s<br /><em>next version.</em></h1>
                <p className="hero-text">Upload the room you have. Discover the space it could become - with a simple decor planning workspace. Live AI redesign is not connected yet.</p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={goToStudio}>Start your makeover <Icon name="arrow" size={18} /></button><p className="generation-note hero-demo-note">Free planning demo - live AI generation isn't connected yet.</p>
                  <button className="watch-button" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}><span className="play-dot"><Icon name="play" size={12} /></span> How it works</button>
                </div>
                <div className="proof-line"><span className="faces"><i>R</i><i>A</i><i>N</i><i>J</i></span><span><b>Made for</b> renters, PGs &amp; first homes</span></div>
              </div>

              <div className="hero-visual" aria-label="Sample room with a warm minimal styling mood">
                <div className="hero-badge"><Icon name="sparkle" size={15} /> Room planning studio</div>
                <div className="hero-frame">
                  <div className="hero-room-image" style={{ backgroundImage: `url(${baseRoom})` }} />
                  <div className="hero-wash" />
                  <div className="hero-caption hero-caption-top"><span>SAMPLE</span><b>Stock photo</b></div>
                  <div className="hero-caption hero-caption-bottom"><span>MOOD</span><b>Warm minimal</b></div>
                  <div className="style-stamp"><span>01</span><div><b>Made for<br />your life.</b><small>Not a moodboard.</small></div></div>
                </div>
                <div className="floating-note note-one"><span className="note-icon rust"><Icon name="sparkle" size={14} /></span><div><small>YOUR VIBE</small><b>Warm minimal</b></div></div>
                <div className="floating-note note-two"><span className="note-icon olive"><Icon name="check" size={14} /></span><div><small>EXAMPLE MOOD</small><b>Decor inspiration</b></div></div>
              </div>
            </div>
          </section>

          <section className="trust-strip">
            <span>Built for the way homes actually are</span>
            <div><b>PHOTO STAYS ON DEVICE</b><b>EDITABLE DECOR LIST</b><b>INDIA-READY BUDGETS</b></div>
          </section>

          <section className="steps-section" id="how-it-works">
            <div className="section-kicker">A REALISTIC PATH TO A NEW ROOM</div>
            <div className="steps-heading"><h2>Not a fantasy render.<br />A plan for <em>your space.</em></h2><p>Keep your real room photo in view while you choose a style and budget. Explore an editable sample decor list. AI image redesign is not connected yet.</p></div>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><div className="step-icon"><Icon name="camera" size={21} /></div><h3>Show us the room</h3><p>Snap, upload, or start with the space you live in now.</p><button className="step-link" onClick={goToStudio}>Your room, safely held <Icon name="arrow" size={15} /></button></article>
              <article className="step-card featured-step"><span className="step-number">02</span><div className="step-icon"><Icon name="sliders" size={21} /></div><h3>Set the brief</h3><p>Choose a vibe, room type, and a spend that feels comfortable.</p><button className="step-link" onClick={goToStudio}>No expert words needed <Icon name="arrow" size={15} /></button></article>
              <article className="step-card"><span className="step-number">03</span><div className="step-icon"><Icon name="bag" size={21} /></div><h3>Make it real</h3><p>Tap any piece you love, then download your sample decor list.</p><button className="step-link" onClick={goToStudio}>Edit your decor list <Icon name="arrow" size={15} /></button></article>
            </div>
          </section>
        </>
      )}

      <section className={`studio-section ${view === "studio" ? "studio-active" : ""}`} id="studio">
        <div className="studio-heading"><div><span className="section-kicker">YOUR MAKEOVER STUDIO</span><h2>Design the room <em>you’ve got.</em></h2></div><div className="secure-note"><Icon name="lock" size={15} /> Your photo stays on this device - it is never uploaded or saved</div></div>

        <div className="studio-layout">
          <section className="canvas-panel">
            <div className="canvas-topline"><div><span className="eyebrow-number">01</span><h3>Capture your space</h3></div><span className="image-hint">JPG, PNG or WEBP · under 7MB</span></div>
            <input ref={inputRef} onChange={handleUpload} type="file" accept="image/jpeg,image/png,image/webp" hidden />
            {!uploadedImage && !generated && !isGenerating ? (
              <button className="upload-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} onClick={() => inputRef.current?.click()}><span className="upload-icon"><Icon name="upload" size={24} /></span><strong>Drop a room photo here</strong><span>or <u>choose from your device</u></span><small>Best results: stand back, include the walls and windows</small></button>
            ) : (
              <div className="work-canvas">
                <div className="canvas-photo" style={{ backgroundImage: `url(${roomImage})` }} />
                {generated && <span className="compare-label after-label">YOUR PHOTO · LOOK PLAN READY</span>}
                {isGenerating && <div className="generation-overlay"><div className="generating-card"><span className="generating-star"><Icon name="sparkle" size={20} /></span><b>Putting your look plan together</b><p>{progressText}</p><div className="loading-track"><span /></div></div></div>}
                {!isGenerating && <button className="change-photo" onClick={() => inputRef.current?.click()}><Icon name="camera" size={15} /> Change photo</button>}
              </div>
            )}
            <button className="makeover-button" onClick={generateMakeover} disabled={isGenerating}>{isGenerating ? <><span className="spinner" /> Preparing your list</> : <><Icon name="sparkle" size={18} /> {generated ? "Update my look plan" : "Create my look plan"}<span className="button-price">{tier === "pro" ? "₹150" : "Free"}</span></>}</button>
            <p className="generation-note">Live AI redesign isn't connected yet, so nothing is rendered over your photo. The editable sample decor list below is not AI-generated.</p>
          </section>

          <aside className="brief-panel">
            <div className="panel-heading"><span className="eyebrow-number">02</span><h3>Your room brief</h3></div>

            <label className="field-label">ROOM TYPE</label>
            <div className="select-wrap"><select value={roomType} onChange={(event) => setRoomType(event.target.value)}><option>Rented apartment</option><option>PG / shared room</option><option>Own house</option><option>Boutique hotel</option></select><Icon name="chevron" size={16} /></div>

            <label className="field-label">STYLE DIRECTION</label>
            <div className="theme-list">{themes.map((item) => <button className={`theme-choice ${theme === item.name ? "selected" : ""}`} key={item.name} onClick={() => setTheme(item.name)}><span className="theme-swatch" style={{ background: item.swatch }} />{item.name}{theme === item.name && <Icon name="check" size={15} />}</button>)}</div>

            <label className="field-label budget-label">TOTAL DECOR BUDGET <span>₹{formatPrice(budget)}</span></label>
            <input className="budget-range" type="range" min="2000" max="10000" step="500" value={budget} onChange={(event) => setBudget(Number(event.target.value))} style={{ "--range-progress": `${((budget - 2000) / 8000) * 100}%` } as CSSProperties} />
            <div className="range-ends"><span>₹2,000</span><span>₹10,000+</span></div>

            <div className="tier-switcher">
              <button className={`tier-option ${tier === "standard" ? "selected" : ""}`} onClick={() => setTier("standard")}><span><b>Standard</b><small>Free · photo + decor list</small></span>{tier === "standard" && <Icon name="check" size={16} />}</button>
              <button className="tier-option" onClick={() => notify("HD generation isn't available in this free demo yet - the Standard preview is shown.")}><span className="pro-label"><i><Icon name="zap" size={12} /></i><b>HD precision</b><small>Unavailable · no payment taken</small></span></button>
            </div>
          </aside>

          <aside className={`shop-panel ${generated ? "shop-ready" : ""}`}>
            <div className="panel-heading"><span className="eyebrow-number">03</span><h3>Make it happen</h3></div>
            {generated ? <>
              <p className="shop-intro">Sample decor ideas to edit alongside your {theme.toLowerCase()} brief. These are not objects detected in your photo or live retailer offers. Check your list total against your budget.</p>
              <div className="product-choices">{products.map(product => <button key={product.id} className={`theme-choice ${selectedProduct?.id === product.id ? "selected" : ""}`} onClick={() => setSelectedProduct(product)}>{product.title}</button>)}</div>
              {selectedProduct && <div className="selected-product"><div className={`product-thumb ${selectedProduct.tone}`}><span /></div><div><small>{selectedProduct.category}</small><b>{selectedProduct.title}</b><span>₹{formatPrice(selectedProduct.price)}</span></div><button className="circle-action" onClick={() => toggleCart(selectedProduct.id)} aria-label="Toggle item in list">{cart.includes(selectedProduct.id) ? <Icon name="check" size={15} /> : <Icon name="bag" size={15} />}</button></div>}
              <div className="cart-summary"><div><span>Your edit list</span><b>{cart.length} pieces · ₹{formatPrice(cartTotal)}</b></div><button onClick={() => setShowList(true)}>View list <Icon name="arrow" size={14} /></button></div>
            </> : <div className="shop-empty"><div><Icon name="bag" size={24} /></div><b>Your shopping edit lives here</b><p>Create a look plan to browse sample decor ideas and edit your list. Prices are estimates, not live offers.</p><span><Icon name="info" size={14} /> Sample prices - confirm before buying</span></div>}
          </aside>
        </div>
      </section>

      {view === "studio" && <section className="result-details"><div className="details-copy"><span className="section-kicker">HONEST STATUS</span><h2>What Roomly does today -<br />and what it <em>doesn’t.</em></h2><p>Your original photo stays unchanged. Your photo stays on this device, and you can edit a sample decor list while keeping your style and budget brief in view.</p><button className="text-link" onClick={() => setShowApi(true)}>Feature status <Icon name="arrow" size={16} /></button></div><div className="pipeline-card"><div className="pipeline-head"><Icon name="sparkle" size={17} /><span>ROOMLY STATUS</span><b>Live</b></div><div className="pipeline-line"><span className="pipeline-node complete"><Icon name="check" size={14} /></span><div><b>Photo stays on your device</b><small>Never uploaded or transformed</small></div></div><div className="pipeline-line"><span className="pipeline-node complete"><Icon name="check" size={14} /></span><div><b>Your chosen brief</b><small>{theme} · {roomType.toLowerCase()} · ₹{formatPrice(budget)}</small></div></div><div className="pipeline-line"><span className="pipeline-node"><Icon name="sparkle" size={14} /></span><div><b>AI room redesign</b><small>Not connected yet - no fake images</small></div></div></div></section>}

      <footer><button className="brand" onClick={() => setView("landing")}><span className="brand-mark"><span /></span><span>roomly</span></button><span>Imagined for real life, not just the feed.</span><div><button onClick={() => { setView("landing"); window.setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }), 30); }}>How it works</button><button onClick={() => setShowApi(true)}>Feature status</button></div></footer>

      {showSignIn && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sign in"><div className="signin-modal"><button className="modal-close" onClick={() => setShowSignIn(false)} aria-label="Close"><Icon name="close" size={18} /></button><div className="modal-mark"><Icon name="sparkle" size={22} /></div><h2>Save rooms you love.</h2><p>Sign-in and saved makeovers are still being set up. The public workspace works without an account.</p>{!getSupabaseBrowser() ? <p>Sign-in is not enabled in this public demo yet - your photo and results stay on this device either way.</p> : signInSent ? <p>Check your email - we sent a secure sign-in link to <b>{signInEmail}</b>. Open it on this device to finish signing in.</p> : <><input className="email-input" type="email" placeholder="you@example.com" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} aria-label="Email address" /><button className="email-login" onClick={sendMagicLink}>Continue with email <Icon name="arrow" size={16} /></button></>}<small>In this demo, room photos stay on your device. No image-generation service receives them.</small></div></div>}

      {showApi && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Roomly feature status"><div className="api-modal"><button className="modal-close" onClick={() => setShowApi(false)} aria-label="Close"><Icon name="close" size={18} /></button><span className="section-kicker">CURRENT FEATURE STATUS</span><h2>A planning demo, not an AI render.</h2><p>You can add your room photo, set a style and budget, and edit a sample decor list. Your photo stays unchanged on this device. AI redesign, live retailer prices, checkout, public sign-in and cloud saving are not enabled yet.</p><button className="primary-button" onClick={() => { setShowApi(false); goToStudio(); }}>Open the studio <Icon name="arrow" size={17} /></button></div></div>}
      {showList && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Your decor list"><div className="api-modal"><button className="modal-close" onClick={() => setShowList(false)} aria-label="Close"><Icon name="close" size={18} /></button><h2>Your decor list</h2><p>{theme} · {roomType} · Budget ₹{formatPrice(budget)}</p>{cartProducts.length ? cartProducts.map(product => <div className="list-item" key={product.id}><div><b>{product.title}</b><p>{product.detail} · estimate ₹{formatPrice(product.price)}</p></div><button onClick={() => toggleCart(product.id)}>Remove</button></div>) : <p>Your list is empty. Add a sample piece from the studio.</p>}<p>Total estimate: ₹{formatPrice(cartTotal)} {cartTotal > budget ? "- over your budget" : "- within your budget"}</p><p>Sample prices only. No retailer links or checkout are available yet. This list is kept only until you refresh or leave.</p><button className="primary-button" onClick={() => { const blob = new Blob([`Roomly decor list\n${theme} | ${roomType}\nBudget: INR ${budget}\n${cartProducts.map(p => `${p.title} - INR ${p.price} (estimate)`).join("\n")}\nTotal estimate: INR ${cartTotal}\nSample items only. Verify prices before buying.`], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "roomly-decor-list.txt"; a.click(); URL.revokeObjectURL(url); }}>Download list</button></div></div>}

      {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
    </main>
  );
}
