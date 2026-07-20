import * as React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

/**
 * ── Design notes ──────────────────────────────────────────────────────────
 * Theme:    SaaS Modern Grid & Blocks System (Accents: Rose, Violet, Amber, Blue, Emerald, Cyan)
 * Palette:  bg #030408 · grid-border white/5 · core blue #2563eb
 *           sky #0ea5e9 · neon-cyan #06b6d4 · dark-card #08090f
 * Signature: a live "route line" — a dashed path with a traveling rider dot —
 *           behind the hero headline, standing in for Guzo's live-tracking core.
 *           A thin three-stripe gradient (green/yellow/red) bookends the page
 *           in the nav and footer as a quiet nod to the product's home market.
 * Type:     Display  → 'Space Grotesk'
 *           Body     → 'Inter'
 *           Data     → 'JetBrains Mono'
 * ───────────────────────────────────────────────────────────────────────── */

interface ViewObserver {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
}

function useScrollReveal(): ViewObserver {
  const [visible, setVisible] = React.useState(false);
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, visible };
}

function useGoogleFonts() {
  React.useEffect(() => {
    const id = 'guzo-font-links';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);
}

function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 animate-fade-in">
      <div className="max-w-7xl mx-auto h-full w-full relative flex justify-between px-6">
        <div className="w-px h-full bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-transparent" />
        <div className="w-px h-full bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-transparent hidden md:block" />
        <div className="w-px h-full bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-transparent hidden md:block" />
        <div className="w-px h-full bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-transparent" />
      </div>
    </div>
  );
}

function GridDot() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.012)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
  );
}

/** Signature element: a live dispatch route winding behind the headline, with a
 *  rider dot animated along the path — a direct visual echo of Guzo's live tracking. */
function RouteSignature() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-10 md:top-2 h-[420px] pointer-events-none select-none z-0"
    >
      <svg viewBox="0 0 1200 420" className="w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="guzoRouteGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="18%" stopColor="#3b82f6" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.55" />
            <stop offset="82%" stopColor="#8b5cf6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          id="guzoRoutePath"
          d="M -60 300 C 140 300, 210 60, 410 95 S 690 350, 890 205 S 1140 45, 1320 95"
          stroke="url(#guzoRouteGradient)"
          strokeWidth="1.5"
          strokeDasharray="1.5 13"
          strokeLinecap="round"
          fill="none"
        />
        <circle r="9" fill="#3b82f6" opacity="0.25">
          <animateMotion dur="10s" repeatCount="indefinite" rotate="auto">
            <mpath href="#guzoRoutePath" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#e2e8f0">
          <animateMotion dur="10s" repeatCount="indefinite" rotate="auto">
            <mpath href="#guzoRoutePath" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
}

/** Quiet three-stripe accent — a nod to Guzo's home market, used sparingly as a page bookend. */
function TricolorRule({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-[2px] w-full ${className}`}
      style={{ background: 'linear-gradient(90deg, #0f9d58 0%, #0f9d58 33%, #fbbc04 33%, #fbbc04 66%, #da3b2f 66%, #da3b2f 100%)', opacity: 0.55 }}
    />
  );
}

const partners = [
  { name: 'Addis Delivery Co.', logo: '🚚 ADCO' },
  { name: 'Sheger Logistics', logo: '⚡ SHEGER' },
  { name: 'Habesha Eats', logo: '🍔 HABESHA' },
  { name: 'Ethio Express', logo: '📦 ETHIO-X' },
  { name: 'Lucy Logistics', logo: '🦴 LUCY' },
];

const features = [
  {
    icon: (
      <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Precision Live Tracking',
    desc: 'Real-time rider telemetry updated every 2 seconds on highly responsive maps. Share public tracking links that keep customers updated without phone calls.',
    color: 'from-blue-600/20 via-blue-500/5 to-transparent',
    border: 'group-hover:border-blue-500/40 border-slate-900',
    text: 'text-blue-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: 'Fleet Command Center',
    desc: 'Invite, manage, approve, or suspend riders directly. Oversee multiple delivery regions, monitor active duty statuses, and handle safety alerts.',
    color: 'from-violet-600/20 via-violet-500/5 to-transparent',
    border: 'group-hover:border-violet-500/40 border-slate-900',
    text: 'text-violet-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.12)]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Financial Intelligence',
    desc: 'Real-time billing, cash reserves calculations, and structured payout flows. Access beautiful profit curves and transaction ledgers at a glance.',
    color: 'from-emerald-600/20 via-emerald-500/5 to-transparent',
    border: 'group-hover:border-emerald-500/40 border-slate-900',
    text: 'text-emerald-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Automated Rider Payouts',
    desc: 'Calculate base fees, distance premiums, and tips dynamically. Issue automated settlement files and logs that speed up your accounting cycles.',
    color: 'from-amber-600/20 via-amber-500/5 to-transparent',
    border: 'group-hover:border-amber-500/40 border-slate-900',
    text: 'text-amber-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Native Android App',
    desc: 'Fully offline-resilient rider app. Automatic background GPS logging, battery status syncing, document scanner, and digital delivery signatures.',
    color: 'from-rose-600/20 via-rose-500/5 to-transparent',
    border: 'group-hover:border-rose-500/40 border-slate-900',
    text: 'text-rose-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.12)]',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'AfroMessage SMS Alerts',
    desc: 'Keep customers in the loop with transactional updates. Automatically sends localized SMS updates when riders begin transit or complete handoffs.',
    color: 'from-cyan-600/20 via-cyan-500/5 to-transparent',
    border: 'group-hover:border-cyan-500/40 border-slate-900',
    text: 'text-cyan-400',
    glow: 'group-hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]',
  },
];

const faqs = [
  {
    q: 'How do riders connect to my merchant account?',
    a: 'Each approved merchant gets a unique "Fleet Key" on their dashboard. Drivers enter this key in their native Guzo Rider app during registration to automatically map themselves to your company workflow.',
  },
  {
    q: 'Does it support offline tracking when network fails?',
    a: 'Yes. The rider mobile application buffers GPS coordinates locally into encrypted memory if connections drop. As soon as the rider moves back online, the cached route trail is instantly flushed back to your dashboard map.',
  },
  {
    q: 'How does cash settlement for Cash on Delivery (COD) work?',
    a: 'Riders collect physical cash from customers. The system tracks these values inside the cash held logs. Merchants can review outstanding cash, trigger a digital settlement proof upload, and approve balance paydowns to zero out rider limits.',
  },
  {
    q: 'Is there a limit on API requests or tracked riders?',
    a: 'Our production architecture processes over 2,000 requests per merchant every 15 minutes, which supports fleets of several hundred concurrent riders with near zero latency.',
  },
];

const stats = [
  { label: 'Riders onboarded', value: '420+' },
  { label: 'Route telemetry SLA', value: '99.9%' },
  { label: 'COD Cash deposits', value: '1.2M ETB' },
  { label: 'API dispatch latency', value: '<240ms' },
];

const steps = [
  { n: '01', title: 'Sign Up & Configure', desc: 'Securely create your company profile and specify your base delivery prices and service zones.' },
  { n: '02', title: 'Onboard Drivers', desc: 'Distribute your unique B2B fleet key. Drivers connect automatically using the Android pilot application.' },
  { n: '03', title: 'Track and Maximize', desc: 'Create live dispatches, monitor path coordinates, and automate transactional ledger updates.' },
];

export default function LandingPage() {
  useGoogleFonts();

  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  // Live simulator states
  const [dispatchStatus, setDispatchStatus] = React.useState<'idle' | 'assigned' | 'transit' | 'delivered'>('idle');
  const [progress, setProgress] = React.useState(0);
  const [activeRiders, setActiveRiders] = React.useState(12);

  const heroRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const simRef = useScrollReveal();
  const bentoRef = useScrollReveal();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Simulator loop
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (dispatchStatus === 'assigned') {
      timer = setTimeout(() => {
        setDispatchStatus('transit');
        setProgress(35);
      }, 1500);
    } else if (dispatchStatus === 'transit') {
      timer = setTimeout(() => {
        setProgress(70);
        timer = setTimeout(() => {
          setDispatchStatus('delivered');
          setProgress(100);
          setActiveRiders(prev => prev + 1);
        }, 1500);
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [dispatchStatus]);

  const runSimulation = () => {
    if (dispatchStatus === 'delivered') setProgress(0);
    setDispatchStatus('assigned');
    setProgress(15);
  };

  const getStatusLabel = () => {
    switch (dispatchStatus) {
      case 'assigned': return 'Rider Assigned';
      case 'transit': return 'In Transit (2s updates)';
      case 'delivered': return 'Package Handoff Complete';
      default: return 'Awaiting Dispatch';
    }
  };

  const fontVars: React.CSSProperties = {
    ['--font-display' as any]: "'Space Grotesk', system-ui, sans-serif",
    ['--font-body' as any]: "'Inter', system-ui, sans-serif",
    ['--font-mono' as any]: "'JetBrains Mono', ui-monospace, monospace",
  };

  return (
    <div
      style={fontVars}
      className="min-h-screen bg-[#02040a] text-slate-100 font-sans overflow-x-hidden selection:bg-blue-600/30 selection:text-blue-300 relative"
    >
      {/* ── SaaS Structural Blocks Grid & Radial spots ────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <GridLines />
        <div className="absolute top-[20px] left-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[80px] right-[10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[320px] left-[40%] w-[350px] h-[350px] bg-cyan-600/5 rounded-full blur-[90px]" />
        <GridDot />
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#02040a]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl shadow-black/60' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105">
              <img src="/favicon.png" alt="Guzo Logo" className="w-full h-full object-cover scale-[1.08]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-lg leading-none tracking-tight">GUZO</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold mt-0.5" lang="am">ጉዞ</span>
            </div>
          </a>

          <div className="hidden sm:flex items-center gap-3">
            <SignedOut>
              <Link to="/sign-in" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors duration-200 px-4 py-2.5 hover:bg-white/[0.06] rounded-xl">
                Sign In
              </Link>
              <Link to="/sign-up" className="relative overflow-hidden text-sm font-bold bg-white text-slate-950 px-5 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-100 hover:shadow-[0_0_24px_rgba(255,255,255,0.18)] hover:-translate-y-0.5">
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:-translate-y-0.5">
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>

          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-slate-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />}
            </svg>
          </button>
        </div>

        <div className={`sm:hidden overflow-hidden transition-[max-height] duration-300 border-b border-white/[0.06] ${menuOpen ? 'max-h-40' : 'max-h-0'}`}>
          <div className="px-6 py-4 flex flex-col gap-2 bg-[#02040a]/95 backdrop-blur-xl">
            <SignedOut>
              <Link to="/sign-in" onClick={() => setMenuOpen(false)} className="text-sm text-slate-400 px-3 py-2.5 rounded-lg hover:bg-white/[0.06]">Sign In</Link>
              <Link to="/sign-up" onClick={() => setMenuOpen(false)} className="text-sm font-semibold bg-white text-slate-950 px-3 py-2.5 rounded-xl text-center">Get Started</Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm font-semibold bg-blue-600 text-white px-3 py-2.5 rounded-xl text-center">Dashboard</Link>
            </SignedIn>
          </div>
        </div>

        <TricolorRule />
      </nav>

      {/* ── Hero Block Area ─────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 content-center text-center border-b border-white/[0.05] overflow-hidden">
        <RouteSignature />

        <div
          ref={heroRef.ref}
          className={`max-w-4xl mx-auto relative z-10 transition-all duration-1000 ease-out ${heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/[0.07] border border-blue-500/20 px-4 py-2 rounded-full mb-8 backdrop-blur-md shadow-inner shadow-white/5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            Built for Ethiopia's Delivery Networks
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1.05] text-white max-w-4xl mx-auto mb-8 font-display">
            The Logistics<br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Operating System
              </span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            Manage drivers, automate order lifecycles, and gain real-time precision tracking routes inside one robust enterprise command center.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignedOut>
              <Link
                to="/sign-up"
                className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-blue-500/15 hover:shadow-blue-500/25 hover:-translate-y-0.5"
              >
                Launch Startup Fleet
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/sign-in" className="inline-flex items-center gap-2 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 px-8 py-4 rounded-xl transition-all duration-200 font-semibold backdrop-blur-md">
                Administrator Login
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 bg-white text-slate-950 font-extrabold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-slate-100 shadow-xl shadow-white/5 hover:-translate-y-0.5"
              >
                Access Control Console
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </SignedIn>
          </div>

          {/* Modern SaaS Keyboard command tags */}
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-600">
            <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded font-mono">F1</span>
            <span>Open live tracking guide</span>
            <span className="mx-2">•</span>
            <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded font-mono">⌘ K</span>
            <span>Search rider telemetry</span>
          </div>

          {/* Trusted Companies */}
          <div className="mt-14 pt-10 border-t border-white/[0.05]">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-bold mb-6">Powering Delivery Crews Across Ethiopia</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
              {partners.map((p: any) => (
                <div key={p.name} className="text-sm font-black text-slate-400 tracking-wider hover:opacity-100 hover:text-slate-200 transition-all duration-200 select-none cursor-default">
                  {p.logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats block strip ───────────────────────────────────────────── */}
      <section className="relative z-10 border-b border-white/[0.05]">
        <div ref={statsRef.ref} className="max-w-7xl mx-auto px-6 py-10">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.08] shadow-xl transition-all duration-1000 ${statsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {stats.map((s: any) => (
              <div
                key={s.label}
                className="bg-[#02040a] px-6 py-8 flex flex-col gap-1.5 transition-colors duration-300 hover:bg-[#0c0e18]"
              >
                <span className="font-display text-3xl font-bold text-white tracking-tight tabular-nums">{s.value}</span>
                <span className="text-xs text-slate-400 font-semibold tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Live Simulation Demo ───────────────────────────────── */}
      <section className="px-6 py-20 relative z-10 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          {/* Section label */}
          <div className="text-center mb-12">
            <span className="text-[10px] font-bold tracking-[0.22em] text-blue-500 uppercase font-mono">Live command simulator</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mt-2 tracking-tight">See a dispatch happen</h2>
          </div>

          <div
            ref={simRef.ref}
            className={`relative rounded-3xl overflow-hidden border border-slate-800 bg-[#070b13]/85 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] transition-all duration-1000 ease-out ${simRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Header / Chrome Mock */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500/25 border border-red-500/40" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500/25 border border-amber-500/40" />
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/25 border border-emerald-500/40" />
              </div>
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-900 rounded-lg px-4 py-1 text-xs text-slate-500 font-mono select-none">
                <span className="text-emerald-500 font-extrabold animate-pulse">●</span> live_dispatch_simulator.sh
              </div>
              <div className="text-xs text-slate-500 font-medium">B2B Core Panel</div>
            </div>

            {/* Simulated Live View */}
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* Simulator Controls Side */}
              <div className="lg:col-span-1 border border-slate-900 bg-slate-950/50 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-white mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    Interactive Dispatcher
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-6 font-sans">
                    Trigger a mock dispatch sequence to test routing logic, state transitions, and GPS updater intervals.
                  </p>

                  {/* Status Indicator Card */}
                  <div className="border border-slate-900/80 bg-slate-950/80 rounded-xl p-3.5 space-y-2 mb-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Simulation State</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">{getStatusLabel()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        dispatchStatus === 'idle' ? 'bg-slate-900 text-slate-500' :
                        dispatchStatus === 'assigned' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        dispatchStatus === 'transit' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {dispatchStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={runSimulation}
                  disabled={dispatchStatus === 'assigned' || dispatchStatus === 'transit'}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-xs text-white transition-all duration-200 shadow-md shadow-blue-500/15 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 text-center"
                >
                  {dispatchStatus === 'idle' ? '⚡ Dispatch Mock Order' :
                   dispatchStatus === 'delivered' ? '🔄 Reset Simulation' : '🚀 Processing Path...'}
                </button>
              </div>

              {/* Fake Live Screen Side */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-4">

                {/* Metrics top */}
                <div className="bg-[#030712] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 block mb-1">Rider Fleet</span>
                    <h4 className="font-display text-3xl font-black text-white">{activeRiders} pilots</h4>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/[0.07] border border-emerald-500/15 px-2.5 py-1.5 rounded-lg self-start mt-4">
                    Active Handshake Connects
                  </span>
                </div>

                <div className="bg-[#030712] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 block mb-1">Telemetry Status</span>
                    <h4 className="font-display text-3xl font-black text-amber-400">99.9% Uptime</h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium mt-4 font-mono">
                    Interval updates: 2s
                  </span>
                </div>

                {/* Simulated Order Board */}
                <div className="col-span-2 bg-[#030712] border border-slate-900 rounded-2xl p-5 md:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <span className="text-xs font-bold text-slate-400">Merchant Dispatch Desk (Active Orders)</span>
                    <span className="text-xs font-mono text-slate-500">Order ID: OR-49520-ET</span>
                  </div>

                  <div className="space-y-4">
                    {/* Simulated Path Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Transit to Addis Ababa City Center</span>
                        <span className="text-blue-400 font-mono">{progress}%</span>
                      </div>
                      <div className="h-3 bg-slate-900/60 border border-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Timeline logs */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1. Order Created', active: progress >= 0 },
                        { label: '2. Pilot Dispatched', active: progress >= 15 },
                        { label: '3. Handed Off', active: progress >= 100 },
                      ].map(step => (
                        <div
                          key={step.label}
                          className={`p-2.5 rounded-lg border text-center text-[10px] font-bold transition-all duration-500 ${
                            step.active
                              ? 'bg-blue-500/[0.07] border-blue-500/20 text-blue-400 shadow-md shadow-blue-500/5'
                              : 'bg-transparent border-slate-900 text-slate-600'
                          }`}
                        >
                          {step.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ── Value Proposition / Bento Grid Block pack ───────────────────────── */}
      <section className="px-6 py-28 border-t border-white/[0.05] bg-slate-950/20">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-400 font-extrabold mb-3">Enterprise Core Features</p>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight font-display">
              Logistics management<br />re-imagined for performance
            </h2>
          </div>

          <div
            ref={bentoRef.ref}
            className={`grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all duration-1000 ease-out ${
              bentoRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {features.map((f: any) => (
              <div
                key={f.title}
                className={`group relative bg-[#02040a] p-8 flex flex-col justify-between gap-6 transition-all duration-300 hover:bg-[#0c0e18] ${f.glow}`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-6 text-slate-300 group-hover:scale-105 group-hover:border-white/[0.14] transition-transform duration-300">
                    <span className={f.text}>{f.icon}</span>
                  </div>
                  <h3 className="font-extrabold text-lg text-white mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-sans">{f.desc}</p>
                </div>

                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider group-hover:text-blue-400 transition-colors duration-300">
                  Learn more →
                </span>

                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${f.color} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Animated How It Works Section ───────────────────────────────────── */}
      <section className="px-6 py-28 border-t border-white/[0.05] relative">
        <div className="absolute right-0 top-1/4 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.25em] text-violet-400 font-extrabold mb-3">Getting Started</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Setup takes under 10 minutes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((s: any, i: number) => (
              <div key={s.n} className="flex flex-col items-center text-center group p-6 bg-white/[0.015] border border-white/[0.05] rounded-2xl hover:border-white/[0.12] hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/10 via-violet-600/5 to-transparent border border-slate-800 flex items-center justify-center text-blue-400 font-display font-black text-xl mb-6 group-hover:border-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] transition-all duration-300">
                  {s.n}
                </div>
                <h3 className="font-bold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-sans">{s.desc}</p>

                {/* Horizontal line connector for desktop */}
                {i < steps.length - 1 && (
                  <div
                    style={{ left: `calc(${33.3 * (i + 1)}% - 50px)` }}
                    className="hidden md:block absolute top-14 w-[100px] border-t border-dashed border-slate-800"
                  />
                )}
              </div>
            ))}
          </div>

        </div>
      </section>
      {/* ── FAQ Accordion Section ───────────────────────────────────────────── */}
      <section className="px-6 py-28 border-t border-white/[0.05] bg-slate-950/10">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-extrabold mb-3">Frequently Asked Questions</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Got Questions? We got answers.</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq: any, i: number) => (
              <div
                key={faq.q}
                className="border border-slate-900 bg-slate-950/60 rounded-xl overflow-hidden transition-colors duration-300 hover:border-slate-800"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-sm md:text-base text-white select-none hover:bg-slate-900/25 active:bg-slate-900/40 transition-colors duration-200"
                >
                  <span className="font-sans">{faq.q}</span>
                  <svg
                    className={`w-4 h-4 shrink-0 ml-4 text-slate-400 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    openFaq === i ? 'max-h-[220px] border-t border-slate-900/60 p-5' : 'max-h-0'
                  }`}
                >
                  <p className="text-xs text-slate-400 leading-relaxed font-normal font-sans">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Ready to Scale Call to Action ───────────────────────────────────── */}
      <section className="px-6 py-28 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">

          <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-800 bg-gradient-to-br from-[#060c18] via-[#040810] to-transparent p-12 text-center shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 bg-[#02040a]/40 backdrop-blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent_75%)] pointer-events-none" />
            <GridDot />

            <div className="relative z-10 space-y-6">
              <p className="text-xs uppercase tracking-[0.25em] text-blue-400 font-extrabold">Ready to begin?</p>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">Start managing your<br />fleet today</h2>
              <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Connect your riders, automate COD bank paydowns, and get reliable delivery telemetry. Zero startup fee.
              </p>

              <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <SignedOut>
                  <Link
                    to="/sign-up"
                    className="group inline-flex items-center justify-center gap-2 bg-white text-slate-950 font-bold px-8 py-[18px] rounded-xl hover:bg-slate-100 transition-all duration-200 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Setup Free Merchant
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <a
                    href="mailto:support@guzologistics.com"
                    className="inline-flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/20 text-slate-300 font-bold px-8 py-[18px] rounded-xl transition-all duration-200"
                  >
                    Discuss Enterprise SLA
                  </a>
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-[18px] rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/15 hover:-translate-y-0.5"
                  >
                    Navigate to Dashboard →
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] bg-slate-950/45">
        <TricolorRule />
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center border border-white/[0.08] shadow-md shadow-blue-500/10">
                <img src="/favicon.png" alt="Guzo Logo" className="w-full h-full object-cover scale-[1.08]" />
              </div>
              <div>
                <p className="font-extrabold text-white text-base tracking-tight leading-tight">GUZO Logistics</p>
                <p className="text-[10px] text-slate-500 tracking-wider">Enterprise-grade dispatch networks</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-400">
              <a href="mailto:support@guzologistics.com" className="hover:text-white transition-colors">support@guzologistics.com</a>
              <span className="font-mono">+251 900 11 22 33</span>
              <Link to="/sign-up" className="hover:text-white transition-colors">Register Hub</Link>
              <button
                onClick={() => { throw new Error('Guzo Test Error: Sentry configuration verified.'); }}
                className="hover:text-red-400 transition-colors text-[10px] uppercase tracking-wider font-bold border border-slate-900/60 bg-[#02040a] px-2.5 py-1 rounded-lg cursor-pointer"
              >
                Test Diagnostics
              </button>
            </div>

            <div className="flex flex-col items-center md:items-end gap-1.5 text-[11px] text-slate-500 font-medium">
              <p>© 2026 Guzo Logistics. All rights reserved.</p>
              <p>Built for scale in Addis Ababa, Ethiopia.</p>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
}
