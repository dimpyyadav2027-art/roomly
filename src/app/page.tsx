"use client";

import { useMemo, useRef, useState } from "react";
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
const refreshedRoom =
  "https://images.pexels.com/photos/15867752/pexels-photo-15867752.png?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600";

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
  const [comparison, setComparison] = useState(49);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("Reading room geometry");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0]);
  const [cart, setCart] = useState<string[]>(["rug", "lamp", "art"]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const roomImage = uploadedImage || baseRoom;
  const cartProducts = useMemo(() => products.filter((product) => cart.includes(product.id)), [cart]);
  const cartTotal = cartProducts.reduce((total, product) => total + product.price, 0);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    setIsGenerating(true);
    setProgressText("Mapping walls, windows & furniture");
    window.setTimeout(() => setProgressText("Styling your room within budget"), 900);
    window.setTimeout(() => setProgressText("Matching shoppable pieces"), 1900);

    try {
      const response = await fetch("/api/makeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (data.configured) notify("Your Replicate prediction has started — demo result shown while it runs.");
      else if (data.mode === "demo") notify("Demo preview - live AI generation isn't connected yet.");
    } catch {
      // The interface remains usable in demo mode if the local API is unavailable.
    } finally {
      window.setTimeout(() => {
        setIsGenerating(false);
        setGenerated(true);
        setComparison(46);
        notify("Your room is ready to explore.");
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
          <a href="#how-it-works">How it works</a>
          <button onClick={() => setShowApi(true)}>For builders</button>
        </nav>
        <div className="nav-actions">
          <button className="text-button" onClick={() => setShowSignIn(true)}>Sign in</button>
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
                <p className="hero-text">Upload the room you have. Discover the space it could become — with a makeover you can actually shop and a budget you can actually keep.</p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={goToStudio}>Start your makeover <Icon name="arrow" size={18} /></button><p className="generation-note hero-demo-note">Free demo preview - live AI generation isn't connected yet.</p>
                  <button className="watch-button" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}><span className="play-dot"><Icon name="play" size={12} /></span> How it works</button>
                </div>
                <div className="proof-line"><span className="faces"><i>R</i><i>A</i><i>N</i><i>J</i></span><span><b>Made for</b> renters, PGs &amp; first homes</span></div>
              </div>

              <div className="hero-visual" aria-label="Example of a room transformation">
                <div className="hero-badge"><Icon name="sparkle" size={15} /> AI room intelligence</div>
                <div className="hero-frame">
                  <div className="hero-room-image" style={{ backgroundImage: `url(${baseRoom})` }} />
                  <div className="hero-wash" />
                  <div className="hero-caption hero-caption-top"><span>BEFORE</span><b>Your room</b></div>
                  <div className="hero-caption hero-caption-bottom"><span>AFTER</span><b>Warm minimal</b></div>
                  <div className="style-stamp"><span>01</span><div><b>Made for<br />your life.</b><small>Not a moodboard.</small></div></div>
                </div>
                <div className="floating-note note-one"><span className="note-icon rust"><Icon name="sparkle" size={14} /></span><div><small>YOUR VIBE</small><b>Warm minimal</b></div></div>
                <div className="floating-note note-two"><span className="note-icon olive"><Icon name="check" size={14} /></span><div><small>WITHIN BUDGET</small><b>₹5,846 total</b></div></div>
              </div>
            </div>
          </section>

          <section className="trust-strip">
            <span>Built for the way homes actually are</span>
            <div><b>STRUCTURE-AWARE AI</b><b>SHOPPABLE RESULTS</b><b>INDIA-READY BUDGETS</b></div>
          </section>

          <section className="steps-section" id="how-it-works">
            <div className="section-kicker">A REALISTIC PATH TO A NEW ROOM</div>
            <div className="steps-heading"><h2>Not a fantasy render.<br />A plan for <em>your space.</em></h2><p>Roomly reads the perspective and permanent parts of your room first — then designs around the life already happening there.</p></div>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><div className="step-icon"><Icon name="camera" size={21} /></div><h3>Show us the room</h3><p>Snap, upload, or start with the space you live in now.</p><span className="step-link">Your room, safely held <Icon name="arrow" size={15} /></span></article>
              <article className="step-card featured-step"><span className="step-number">02</span><div className="step-icon"><Icon name="sliders" size={21} /></div><h3>Set the brief</h3><p>Choose a vibe, room type, and a spend that feels comfortable.</p><span className="step-link">No expert words needed <Icon name="arrow" size={15} /></span></article>
              <article className="step-card"><span className="step-number">03</span><div className="step-icon"><Icon name="bag" size={21} /></div><h3>Make it real</h3><p>Tap any piece you love, then take the exact shopping list with you.</p><span className="step-link">From vision to checkout <Icon name="arrow" size={15} /></span></article>
            </div>
          </section>
        </>
      )}

      <section className={`studio-section ${view === "studio" ? "studio-active" : ""}`} id="studio">
        <div className="studio-heading"><div><span className="section-kicker">YOUR MAKEOVER STUDIO</span><h2>Design the room <em>you’ve got.</em></h2></div><div className="secure-note"><Icon name="lock" size={15} /> Your photo stays on this device - it is never uploaded or saved</div></div>

        <div className="studio-layout">
          <aside className="brief-panel">
            <div className="panel-heading"><span className="eyebrow-number">01</span><h3>Your room brief</h3></div>

            <label className="field-label">ROOM TYPE</label>
            <div className="select-wrap"><select value={roomType} onChange={(event) => setRoomType(event.target.value)}><option>Rented apartment</option><option>PG / shared room</option><option>Own house</option><option>Boutique hotel</option></select><Icon name="chevron" size={16} /></div>

            <label className="field-label">STYLE DIRECTION</label>
            <div className="theme-list">{themes.map((item) => <button className={`theme-choice ${theme === item.name ? "selected" : ""}`} key={item.name} onClick={() => setTheme(item.name)}><span className="theme-swatch" style={{ background: item.swatch }} />{item.name}{theme === item.name && <Icon name="check" size={15} />}</button>)}</div>

            <label className="field-label budget-label">TOTAL DECOR BUDGET <span>₹{formatPrice(budget)}</span></label>
            <input className="budget-range" type="range" min="2000" max="10000" step="500" value={budget} onChange={(event) => setBudget(Number(event.target.value))} style={{ "--range-progress": `${((budget - 2000) / 8000) * 100}%` } as CSSProperties} />
            <div className="range-ends"><span>₹2,000</span><span>₹10,000+</span></div>

            <div className="tier-switcher">
              <button className={`tier-option ${tier === "standard" ? "selected" : ""}`} onClick={() => setTier("standard")}><span><b>Standard</b><small>Free · 720p preview</small></span>{tier === "standard" && <Icon name="check" size={16} />}</button>
              <button className={`tier-option ${tier === "pro" ? "selected" : ""}`} onClick={() => setTier("pro")}><span className="pro-label"><i><Icon name="zap" size={12} /></i><b>HD precision</b><small>₹150 · 1080p final</small></span>{tier === "pro" && <Icon name="check" size={16} />}</button>
            </div>
          </aside>

          <section className="canvas-panel">
            <div className="canvas-topline"><div><span className="eyebrow-number">02</span><h3>Capture your space</h3></div><span className="image-hint">JPG, PNG or WEBP · under 7MB</span></div>
            <input ref={inputRef} onChange={handleUpload} type="file" accept="image/jpeg,image/png,image/webp" hidden />
            {!uploadedImage && !generated && !isGenerating ? (
              <button className="upload-dropzone" onClick={() => inputRef.current?.click()}><span className="upload-icon"><Icon name="upload" size={24} /></span><strong>Drop a room photo here</strong><span>or <u>choose from your device</u></span><small>Best results: stand back, include the walls and windows</small></button>
            ) : (
              <div className="work-canvas">
                <div className="canvas-photo before-photo" style={{ backgroundImage: `url(${roomImage})` }} />
                {generated && <><div className="canvas-photo after-photo" style={{ backgroundImage: `url(${refreshedRoom})`, clipPath: `inset(0 0 0 ${comparison}%)` }} /><div className="comparison-line" style={{ left: `${comparison}%` }}><span /><input aria-label="Compare before and after" type="range" min="0" max="100" value={comparison} onChange={(event) => setComparison(Number(event.target.value))} /></div><span className="compare-label before-label">BEFORE</span><span className="compare-label after-label">DEMO PREVIEW · {theme.toUpperCase()}</span></>}
                {isGenerating && <div className="generation-overlay"><div className="scanline" /><div className="generating-card"><span className="generating-star"><Icon name="sparkle" size={20} /></span><b>Making it feel like yours</b><p>{progressText}</p><div className="loading-track"><span /></div></div></div>}
                {!generated && !isGenerating && <button className="change-photo" onClick={() => inputRef.current?.click()}><Icon name="camera" size={15} /> Change photo</button>}
              </div>
            )}
            <button className="makeover-button" onClick={generateMakeover} disabled={isGenerating}>{isGenerating ? <><span className="spinner" /> Creating your room</> : <><Icon name="sparkle" size={18} /> {generated ? "Recreate this look" : "Create my makeover"}<span className="button-price">{tier === "pro" ? "₹150" : "Free"}</span></>}</button>
            <p className="generation-note">Demo preview - live AI generation isn't connected yet, so the result is a sample. {tier === "pro" ? "HD includes high-detail texture, lighting and export." : "Standard previews preserve your room’s structure."}</p>
          </section>

          <aside className={`shop-panel ${generated ? "shop-ready" : ""}`}>
            <div className="panel-heading"><span className="eyebrow-number">03</span><h3>Make it happen</h3></div>
            {generated ? <>
              <p className="shop-intro">Tap a glowing dot in your room or add the pieces that make this look work.</p>
              <div className="hotspot-stage">
                <div className="mini-room" style={{ backgroundImage: `url(${refreshedRoom})` }} />
                {products.map((product, index) => <button key={product.id} className={`hotspot-dot ${selectedProduct?.id === product.id ? "active" : ""}`} style={product.position} onClick={() => setSelectedProduct(product)} aria-label={`Select ${product.title}`}>{index + 1}</button>)}
              </div>
              {selectedProduct && <div className="selected-product"><div className={`product-thumb ${selectedProduct.tone}`}><span /></div><div><small>{selectedProduct.category}</small><b>{selectedProduct.title}</b><span>₹{formatPrice(selectedProduct.price)}</span></div><button className="circle-action" onClick={() => toggleCart(selectedProduct.id)} aria-label="Toggle item in list">{cart.includes(selectedProduct.id) ? <Icon name="check" size={15} /> : <Icon name="bag" size={15} />}</button></div>}
              <div className="cart-summary"><div><span>Your edit list</span><b>{cart.length} pieces · ₹{formatPrice(cartTotal)}</b></div><button onClick={() => notify("Your edit list is saved here - links to buy come with the live catalog.")}>View list <Icon name="arrow" size={14} /></button></div>
            </> : <div className="shop-empty"><div><Icon name="bag" size={24} /></div><b>Your shopping edit lives here</b><p>Once your makeover is ready, tap any piece to see a curated, in-budget match.</p><span><Icon name="info" size={14} /> Sample prices - confirm before buying</span></div>}
          </aside>
        </div>
      </section>

      {view === "studio" && <section className="result-details"><div className="details-copy"><span className="section-kicker">STRUCTURE, NOT GUESSWORK</span><h2>Why this look still feels<br />like <em>your room.</em></h2><p>Roomly’s image pipeline considers the permanent details first. The walls, windows, doorway and the silhouette of your key furniture remain the design’s foundation.</p><button className="text-link" onClick={() => setShowApi(true)}>See the AI workflow <Icon name="arrow" size={16} /></button></div><div className="pipeline-card"><div className="pipeline-head"><Icon name="sparkle" size={17} /><span>ROOMLY SPATIAL ENGINE</span><b>Ready</b></div><div className="pipeline-line"><span className="pipeline-node complete"><Icon name="check" size={14} /></span><div><b>Depth & segmentation</b><small>Room geometry held in place</small></div></div><div className="pipeline-line"><span className="pipeline-node complete"><Icon name="check" size={14} /></span><div><b>Controlled generation</b><small>Prompt adapted for {roomType.toLowerCase()}</small></div></div><div className="pipeline-line"><span className="pipeline-node"><Icon name="bag" size={14} /></span><div><b>Shoppable detection</b><small>Pieces matched to your ₹{formatPrice(budget)} brief</small></div></div></div></section>}

      <footer><button className="brand" onClick={() => setView("landing")}><span className="brand-mark"><span /></span><span>roomly</span></button><span>Imagined for real life, not just the feed.</span><div><a href="#how-it-works">How it works</a><button onClick={() => setShowApi(true)}>For builders</button></div></footer>

      {showSignIn && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sign in"><div className="signin-modal"><button className="modal-close" onClick={() => setShowSignIn(false)} aria-label="Close"><Icon name="close" size={18} /></button><div className="modal-mark"><Icon name="sparkle" size={22} /></div><h2>Save rooms you love.</h2><p>Sign in to keep your makeover boards, shopping lists and HD creations in one place.</p><button className="social-login" onClick={() => { setShowSignIn(false); notify("Welcome back — your space is ready."); }}><span className="google-g">G</span> Continue with Google</button><button className="email-login" onClick={() => { setShowSignIn(false); notify("A secure sign-in link is on its way."); }}>Continue with email <Icon name="arrow" size={16} /></button><small>By continuing, you agree to roomly’s Terms and Privacy Policy.</small></div></div>}

      {showApi && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Replicate API setup"><div className="api-modal"><button className="modal-close" onClick={() => setShowApi(false)} aria-label="Close"><Icon name="close" size={18} /></button><span className="section-kicker">REPLICATE + CONTROLNET</span><h2>Ship the structure-aware workflow.</h2><p>Set your server-only token and a compatible image-to-image ControlNet model. Roomly sends the original room image, a room-specific prompt and the selected quality tier through the protected route.</p><div className="env-card"><span>.env.local</span><code>REPLICATE_API_TOKEN=r8_••••••••<br />REPLICATE_MODEL=owner/controlnet-inpaint-model</code></div><ol className="api-steps"><li><b>Capture the whole room.</b><span>Send the image as a data URL or upload it to durable storage first.</span></li><li><b>Preserve what is permanent.</b><span>Use your model’s depth / segmentation and mask inputs to keep layout intact.</span></li><li><b>Start a prediction securely.</b><span>The included <code>/api/makeover</code> route uses Bearer auth and <code>Prefer: wait=60</code>.</span></li><li><b>Match the generated objects.</b><span>Resolve product matches server-side before rendering tappable hotspots.</span></li></ol><button className="primary-button" onClick={() => { setShowApi(false); goToStudio(); }}>Open the studio <Icon name="arrow" size={17} /></button></div></div>}

      {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
    </main>
  );
}
