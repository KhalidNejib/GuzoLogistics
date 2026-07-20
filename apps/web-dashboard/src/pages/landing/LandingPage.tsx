import * as React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

/**
 * ── Design notes ──────────────────────────────────────────────────────────
 * Theme:    SaaS Modern Grid & Blocks System
 * Palette:  bg #030408 · grid-border white/5 · core blue #2563eb
 *           sky #0ea5e9 · neon-cyan #06b6d4 · dark-card #08090f
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
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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
    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
  );
}

const stats = [
  { label: 'Riders onboarded', value: '420+' },
  { label: 'Route telemetry SLA', value: '99.9%' },
  { label: 'COD Cash deposits', value: '1.2M ETB' },
  { label: 'API dispatch latency', value: '<240ms' },
];

const features = [
  {
    icon: (
      <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Precision live tracking',
    desc: 'Rider telemetry updates every 2 seconds on a responsive map. Share a public tracking link so customers stop calling to ask where their order is.',
    glowStyle: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.08)]',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: 'Fleet command center',
    desc: 'Invite, approve, or suspend riders yourself. Watch duty status and safety alerts across every service zone you run.',
    glowStyle: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.08)]',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Financial intelligence',
    desc: 'Cash reserves, structured payouts, and a running transaction ledger — the numbers a merchant actually checks every morning.',
    glowStyle: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.08)]',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Automated rider payouts',
    desc: 'Base fare, distance premiums, and tips calculated per delivery. Settlement logs come out ready for your books.',
    glowStyle: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.08)]',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Native rider app',
    desc: 'Works through dead zones. Background GPS keeps logging, cached routes flush once the signal returns, no lost trips.',
    glowStyle: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.08)]',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'SMS handoff alerts',
    desc: 'Customers get a local-language text the moment a rider starts transit and again on handoff — no app required on their end.',
    glowStyle: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.08)]',
  },
];

const faqs = [
  {
    q: 'How do riders connect to my company fleet?',
    a: 'Each approved web merchant gets a unique Fleet Key on their dashboard. Riders enter it once in the Guzo Rider app during registration and they’re mapped to your fleet automatically.',
  },
  {
    q: 'Does tracking still work when a rider loses or drops signal?',
    a: 'Yes. The rider app buffers GPS points locally when the cellular signal drops, and flushes the cached trail back to your dashboard the moment it reconnects.',
  },
  {
    q: 'How does cash-on-delivery settlement work?',
    a: 'Riders collect cash from customers and it’s logged against their held balance. They upload a digital receipt or screenshot, and you approve it to zero the balance back out.',
  },
  {
    q: 'Is there a limit on tracked riders or requests?',
    a: 'Our production setup handles 2,000+ requests per merchant every 15 minutes — enough for a fleet of several hundred concurrent riders with near-zero lag.',
  },
];

const steps = [
  { n: '01', title: 'Sign up & configure', desc: 'Create your company profile, set base delivery prices, and mark your service zones on the map.' },
  { n: '02', title: 'Onboard your riders', desc: 'Share your Fleet Key. Riders connect themselves through the Android app — no manual invites needed.' },
  { n: '03', title: 'Dispatch & reconcile', desc: 'Send live orders, watch the route in real time, and let payouts settle themselves at the end of the day.' },
];

function RouteLine({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={`w-full h-16 ${className}`}
      viewBox="0 0 1200 60"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={flip ? 'M0 45 Q 300 10 600 30 T 1200 15' : 'M0 15 Q 300 50 600 30 T 1200 45'}
        stroke="url(#route-gradient)"
        strokeWidth="1.5"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="route-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
          <stop offset="15%" stopColor="#0ea5e9" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#2563eb" stopOpacity="0.5" />
          <stop offset="85%" stopColor="#0ea5e9" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (dispatchStatus === 'assigned') {
      timer = setTimeout(() => {
        setDispatchStatus('transit');
        setProgress(35);
      }, 1400);
    } else if (dispatchStatus === 'transit') {
      timer = setTimeout(() => {
        setProgress(70);
        timer = setTimeout(() => {
          setDispatchStatus('delivered');
          setProgress(100);
          setActiveRiders(prev => prev + 1);
        }, 1400);
      }, 1400);
    }
    return () => clearTimeout(timer);
  }, [dispatchStatus]);

  const runSimulation = () => {
    if (dispatchStatus === 'delivered') setProgress(0);
    setDispatchStatus('assigned');
    setProgress(15);
  };

  const statusLabel: Record<typeof dispatchStatus, string> = {
    idle: 'Awaiting dispatch',
    assigned: 'Rider assigned',
    transit: 'In transit — 2s updates',
    delivered: 'Handoff complete',
  };

  const fontVars: React.CSSProperties = {
    ['--font-display' as any]: "'Space Grotesk', system-ui, sans-serif",
    ['--font-body' as any]: "'Inter', system-ui, sans-serif",
    ['--font-mono' as any]: "'JetBrains Mono', ui-monospace, monospace",
  };

  return (
    <div
      style={fontVars}
      className="min-h-screen bg-[#030408] text-[#EEF0F4] [font-family:var(--font-body)] overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-200 relative"
    >
      {/* ── SaaS Structural Blocks Grid & Radial spots ────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <GridLines />
        <div className="absolute top-[-300px] left-[15%] w-[680px] h-[680px] bg-blue-600/[0.04] rounded-full blur-[160px] motion-safe:animate-pulse [animation-duration:11s]" />
        <div className="absolute top-[-150px] right-[8%] w-[585px] h-[585px] bg-sky-500/[0.03] rounded-full blur-[140px] motion-safe:animate-pulse [animation-duration:14s]" />
        <GridDot />
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled ? 'bg-[#030408]/80 backdrop-blur-xl border-white/[0.06] shadow-2xl' : 'bg-transparent border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-650 flex items-center justify-center border border-white/[0.08] shadow-md shadow-blue-550/20 transition-transform group-hover:scale-[1.04]">
              <img src="/favicon.png" alt="Guzo Logo" className="w-full h-full object-cover scale-[1.08]" />
            </div>
            <span className="font-display font-semibold text-white text-[16px] tracking-tight">
              Guzo <span className="text-[#4A5266] text-xs font-normal" lang="am">ጉዞ</span>
            </span>
          </a>

          <div className="hidden sm:flex items-center gap-1">
            <SignedOut>
              <Link to="/sign-in" className="text-sm font-medium text-[#8B93A7] hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/[0.03]">Sign in</Link>
              <Link to="/sign-up" className="text-sm font-semibold bg-[#2563eb] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/10 ml-1">
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="text-sm font-semibold bg-[#2563eb] hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/10">
                Go to dashboard →
              </Link>
            </SignedIn>
          </div>

          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-[#EEF0F4]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />}
            </svg>
          </button>
        </div>

        <div className={`sm:hidden overflow-hidden transition-[max-height] duration-300 border-b border-white/[0.05] ${menuOpen ? 'max-h-40' : 'max-h-0'}`}>
          <div className="px-6 py-4 flex flex-col gap-2 bg-[#05060b]/95 backdrop-blur-xl">
            <SignedOut>
              <Link to="/sign-in" onClick={() => setMenuOpen(false)} className="text-sm text-[#8B93A7] px-3 py-2.5">Sign in</Link>
              <Link to="/sign-up" onClick={() => setMenuOpen(false)} className="text-sm font-semibold bg-[#2563eb] text-white px-3 py-2.5 rounded-xl text-center">Get started</Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm font-semibold bg-[#2563eb] text-white px-3 py-2.5 rounded-xl text-center">Dashboard</Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ── Hero Block Area ─────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 text-center border-b border-white/[0.04]">
        <div
          ref={heroRef.ref}
          className={`max-w-4xl mx-auto relative z-10 transition-all duration-1000 ${heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0ea5e9] bg-[#0ea5e9]/[0.06] border border-[#0ea5e9]/[0.15] px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] animate-pulse" />
            Live for delivery fleets in Addis Ababa
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-7xl md:text-[84px] font-bold tracking-[-0.03em] leading-[1.02] text-white mb-6">
            Run your fleet like
            <br />
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400">
              you see every mile
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#8B93A7] max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            Dispatch orders, track riders in real time, and settle cash payouts — all from one dashboard built for how delivery actually runs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignedOut>
              <Link to="/sign-up" className="group inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5">
                Set up your fleet free
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/sign-in" className="inline-flex items-center gap-2 text-[#E8EAF0] border border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.03] px-7 py-3.5 rounded-xl transition-all font-medium">
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="group inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/10">
                Open dashboard
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </SignedIn>
          </div>

          {/* SaaS Keyboard commands & layout hint */}
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-[#4A5266]">
            <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded font-mono">F1</span>
            <span>Open live tracking guide</span>
            <span className="mx-2">•</span>
            <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded font-mono">⌘ K</span>
            <span>Search rider telemetry</span>
          </div>

          {/* Trusted by */}
          <div className="mt-14 pt-10 border-t border-white/[0.04]">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#4A5266] font-semibold mb-5">Trusted by delivery crews across Ethiopia</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {['ADCO', 'SHEGER', 'HABESHA', 'ETHIO-X', 'LUCY'].map(m => (
                <span key={m} className="font-mono text-xs font-semibold text-[#4A5266] tracking-wider hover:text-white transition-colors cursor-default">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats block strip ───────────────────────────────────────────── */}
      <section className="relative z-10 border-b border-white/[0.04] bg-[#030408]/60">
        <div ref={statsRef.ref} className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.07] shadow-xl">
            {stats.map((s, i) => (
              <div 
                key={s.label} 
                className="bg-[#05060b] px-6 py-8 flex flex-col gap-1 transition-all duration-300 hover:bg-[#0c0e18]"
              >
                <span className="font-mono text-3xl font-semibold text-white tracking-tight">{s.value}</span>
                <span className="text-xs text-[#8B93A7] font-semibold tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Simulator Block ─────────────────────────────────── */}
      <section className="px-6 py-20 relative z-10 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          {/* Section label */}
          <div className="text-center mb-12">
            <span className="text-[10px] font-bold tracking-[0.22em] text-blue-500 uppercase font-mono">Live command simulator</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mt-2 tracking-tight">
              See a dispatch happen
            </h2>
          </div>

          <div
            ref={simRef.ref}
            className={`relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#08090f] shadow-[0_30px_100px_rgba(0,0,0,0.8)] transition-all duration-1000 ${simRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Window chrome header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840] shadow" />
                </div>
                <span className="font-mono text-[11px] text-[#4A5266] ml-2">dispatch_console — Guzo Merchant OS</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0ea5e9]/[0.06] border border-[#0ea5e9]/[0.15] px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] animate-pulse" />
                <span className="font-mono text-[9px] text-[#0ea5e9] font-bold uppercase tracking-wider">LIVE</span>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Control Panel Block */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between gap-6">
                <div>
                  <h3 className="font-display font-semibold text-base text-white mb-2">Try a dispatch</h3>
                  <p className="text-[#8B93A7] text-xs leading-relaxed mb-4">
                    Trigger a mock order and watch it move through assignment, transit, and handoff.
                  </p>
                  <div className="border border-white/[0.06] bg-black/40 rounded-xl p-4 mb-1">
                    <span className="text-[9px] font-bold text-[#4A5266] uppercase tracking-widest block mb-2">Status</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#EEF0F4]">{statusLabel[dispatchStatus]}</span>
                      <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border ${
                        dispatchStatus === 'idle' ? 'bg-white/[0.03] text-[#4A5266] border-white/[0.06]'
                        : dispatchStatus === 'assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : dispatchStatus === 'transit' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {dispatchStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={runSimulation}
                  disabled={dispatchStatus === 'assigned' || dispatchStatus === 'transit'}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/20 shadow-md shadow-blue-500/10"
                >
                  {dispatchStatus === 'idle' ? '⚡ Dispatch mock order' : dispatchStatus === 'delivered' ? '↺ Reset simulation' : 'Processing…'}
                </button>
              </div>

              {/* Console Dashboard Blocks */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#4A5266] block mb-2">Active riders</span>
                    <span className="font-mono text-3xl font-semibold text-white">{activeRiders}</span>
                  </div>
                  <span className="text-[#0ea5e9] text-[10px] font-mono mt-3">● online and connected</span>
                </div>
                
                <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#4A5266] block mb-2">Uptime guarantee</span>
                    <span className="font-mono text-3xl font-semibold text-blue-500">99.9%</span>
                  </div>
                  <span className="text-[#4A5266] text-[10px] font-mono mt-3">Telemetry SLA ok</span>
                </div>

                <div className="col-span-2 bg-white/[0.015] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                    <span className="text-xs font-semibold text-[#8B93A7]">Bole, Addis Ababa</span>
                    <span className="font-mono text-[10px] text-[#4A5266]">OR-49520-ET</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#4A5266]">Route progress</span>
                      <span className="font-mono text-[#0ea5e9] font-semibold">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Created', active: progress >= 0 },
                      { label: 'Dispatched', active: progress >= 15 },
                      { label: 'Delivered', active: progress >= 100 },
                    ].map(step => (
                      <div
                        key={step.label}
                        className={`p-2.5 rounded-xl border text-center text-[10px] font-bold transition-all ${
                          step.active ? 'bg-blue-500/[0.07] border-blue-500/20 text-blue-400' : 'bg-transparent border-white/[0.04] text-[#4A5266]'
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
      </section>

      {/* ── Bento scale grid block (Pac-styling) ───────────────────────── */}
      <section className="px-6 py-20 relative z-10 border-b border-white/[0.04] bg-[#030408]/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <span className="text-[10px] font-bold tracking-[0.22em] text-blue-500 uppercase font-mono">Bento Features Grid</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mt-2">
              Everything you need to dispatch
            </h2>
          </div>

          <div
            ref={bentoRef.ref}
            className={`grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-white/[0.06] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all duration-1000 ${
              bentoRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`bg-[#05060b] p-8 flex flex-col justify-between gap-6 transition-all duration-300 group hover:bg-[#0c0e18] ${f.glowStyle}`}
              >
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-[1.04] group-hover:border-white/[0.15] transition-all">
                    {f.icon}
                  </div>
                  <h3 className="font-display font-bold text-lg text-white mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-[#8B93A7] text-sm leading-relaxed font-sans">{f.desc}</p>
                </div>
                
                <span className="text-[10px] font-mono text-[#4A5266] uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                  Learn more →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Onboarding / Getting Started Blocks ─────────────────────────── */}
      <section className="px-6 py-24 relative z-10 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-[10px] font-bold tracking-[0.22em] text-blue-500 uppercase font-mono">Workflow steps</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mt-2 tracking-tight">Three steps to your first dispatch</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-9 left-[16%] right-[16%] h-px bg-gradient-to-r from-blue-500/20 via-sky-500/20 to-blue-500/20" />

            {steps.map((s) => (
              <div key={s.n} className="relative group p-6 bg-white/[0.015] border border-white/[0.05] rounded-2xl hover:border-white/[0.1] transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-[#08090f] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-blue-500/30 transition-all">
                  <span className="font-mono text-sm font-semibold text-blue-500">{s.n}</span>
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-[#8B93A7] text-sm leading-relaxed font-sans">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 relative z-10 border-b border-white/[0.04]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-bold tracking-[0.22em] text-blue-500 uppercase font-mono">Accordions</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mt-2">Before you sign up</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q} className="border border-white/[0.07] bg-[#08090f] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-all duration-350">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left font-medium text-sm md:text-base text-white hover:bg-white/[0.015] transition-colors"
                  >
                    <span className="font-sans font-semibold">{faq.q}</span>
                    <svg className={`w-4 h-4 text-[#3A3F50] shrink-0 transition-transform duration-300 ${open ? 'rotate-185' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="text-sm text-[#8B93A7] leading-relaxed px-6 pb-5 border-t border-white/[0.04] pt-4 font-sans">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] p-10 md:p-16 text-center"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.06) 0%, transparent 60%), #08090f' }}>
            <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            <GridDot />
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-bold tracking-[0.22em] text-blue-500 uppercase font-mono">Ready to deploy?</span>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                Start running your fleet today
              </h2>
              <p className="text-[#8B93A7] max-w-md mx-auto text-sm leading-relaxed font-sans mb-4">
                Connect your riders, automate cash settlements, and get delivery telemetry you can trust. No setup fee.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <SignedOut>
                  <Link to="/sign-up" className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-95 duration-200">
                    Set up your fleet, free
                  </Link>
                  <a href="mailto:support@guzologistics.com" className="inline-flex items-center justify-center gap-2 border border-white/[0.1] hover:border-white/[0.18] hover:bg-white/[0.03] text-[#E8EAF0] font-medium px-7 py-3.5 rounded-xl transition-all">
                    Talk enterprise
                  </a>
                </SignedOut>
                <SignedIn>
                  <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/25">
                    Go to your dashboard →
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] px-6 py-12 relative z-10 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-650 flex items-center justify-center border border-white/[0.08] shadow-md shadow-blue-550/10">
              <img src="/favicon.png" alt="Guzo Logo" className="w-full h-full object-cover scale-[1.08]" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Guzo Logistics</p>
              <p className="text-[10px] text-[#3A3F50]">Built for scale in Addis Ababa, Ethiopia.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#8B93A7]">
            <a href="mailto:support@guzologistics.com" className="hover:text-white transition-colors">support@guzologistics.com</a>
            <span className="font-mono">+251 900 11 22 33</span>
            <Link to="/sign-up" className="hover:text-white transition-colors">Register fleet</Link>
            <button onClick={() => { throw new Error('Guzo Test Error: Sentry verified.'); }} className="hover:text-red-400 transition-colors text-[10px] uppercase tracking-wider font-bold border border-white/[0.05] bg-white/[0.01] px-2 py-0.5 rounded cursor-pointer">
              test diagnostics
            </button>
          </div>

          <p className="text-[10px] text-[#3A3F50]">© 2026 Guzo Logistics</p>
        </div>
      </footer>
    </div>
  );
}
