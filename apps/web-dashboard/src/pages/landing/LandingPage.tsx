import * as React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

/**
 * ── Design notes ──────────────────────────────────────────────────────────
 * Palette:  bg #06070a · ink #EEF0F4 · muted #8B93A7
 *           amber #E8A33D  (dispatch / primary action — reads "Ethiopian
 *           gold" without being literal, distinct from the generic
 *           blue-on-black SaaS default)
 *           teal   #2DD6C4  (live telemetry / motion — the "signal" color)
 * Type:     Display  → 'Space Grotesk' (headlines, wordmark)
 *           Body     → 'Inter'
 *           Data     → 'JetBrains Mono' (order IDs, coordinates, timestamps
 *           — logistics data should look like logistics data)
 * Signature: a dashed route-line with a moving waypoint dot threads behind
 *           the hero and reappears as the section divider — the one visual
 *           idea repeated deliberately rather than a new decoration per
 *           section. "ጉዞ" (Amharic for "journey") sits as a quiet mark next
 *           to the wordmark rather than a generic tagline.
 * Fonts are loaded at runtime below so this file works standalone; move the
 * <link> tags into index.html's <head> for production instead.
 * ───────────────────────────────────────────────────────────────────────── */

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

const partners = [
  { name: 'Addis Delivery Co.', mark: 'ADCO' },
  { name: 'Sheger Logistics', mark: 'SHEGER' },
  { name: 'Habesha Eats', mark: 'HABESHA' },
  { name: 'Ethio Express', mark: 'ETHIO-X' },
  { name: 'Lucy Logistics', mark: 'LUCY' },
];

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Precision live tracking',
    desc: 'Rider telemetry updates every 2 seconds on a responsive map. Share a public tracking link so customers stop calling to ask where their order is.',
    accent: 'teal',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: 'Fleet command center',
    desc: 'Invite, approve, or suspend riders yourself. Watch duty status and safety alerts across every service zone you run.',
    accent: 'amber',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Financial intelligence',
    desc: 'Cash reserves, structured payouts, and a running transaction ledger — the numbers a merchant actually checks every morning.',
    accent: 'amber',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Automated rider payouts',
    desc: 'Base fare, distance premiums, and tips calculated per delivery. Settlement logs come out ready for your books.',
    accent: 'teal',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Native rider app',
    desc: 'Works through dead zones. Background GPS keeps logging, cached routes flush once the signal returns, no lost trips.',
    accent: 'amber',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'SMS handoff alerts',
    desc: 'Customers get a local-language text the moment a rider starts transit and again on handoff — no app required on their end.',
    accent: 'teal',
  },
];

const faqs = [
  {
    q: 'How do riders connect to my merchant account?',
    a: 'Every approved merchant gets a unique Fleet Key on their dashboard. Riders enter it once in the Guzo Rider app during registration and they\u2019re mapped to your fleet automatically.',
  },
  {
    q: 'Does tracking still work when a rider loses signal?',
    a: 'Yes. The rider app buffers GPS points locally when the connection drops, then flushes the cached trail back to your dashboard the moment it reconnects.',
  },
  {
    q: 'How does cash-on-delivery settlement work?',
    a: 'Riders collect cash from customers and it\u2019s logged against their held balance. They upload a digital settlement proof, and you approve it to zero the balance back out.',
  },
  {
    q: 'Is there a limit on tracked riders or requests?',
    a: 'Our production setup handles 2,000+ requests per merchant every 15 minutes — enough for a fleet of several hundred concurrent riders with near-zero lag.',
  },
];

const waypoints = [
  { n: '01', title: 'Sign up & configure', desc: 'Create your company profile, set base delivery prices, and mark your service zones on the map.' },
  { n: '02', title: 'Onboard your riders', desc: 'Share your Fleet Key. Riders connect themselves through the Android app — no manual invites needed.' },
  { n: '03', title: 'Dispatch & reconcile', desc: 'Send live orders, watch the route in real time, and let payouts settle themselves at the end of the day.' },
];

/** A dashed route line with a moving waypoint dot — the page's one repeated
 *  visual signature, standing in for an actual GPS polyline. */
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
          <stop offset="0%" stopColor="#2DD6C4" stopOpacity="0" />
          <stop offset="15%" stopColor="#2DD6C4" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#E8A33D" stopOpacity="0.5" />
          <stop offset="85%" stopColor="#2DD6C4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2DD6C4" stopOpacity="0" />
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
          setActiveRiders((prev) => prev + 1);
        }, 1400);
      }, 1400);
    }
    return () => clearTimeout(timer);
  }, [dispatchStatus]);

  const runSimulation = () => {
    if (dispatchStatus === 'delivered') setActiveRiders(12);
    setDispatchStatus('assigned');
    setProgress(15);
  };

  const statusLabel: Record<typeof dispatchStatus, string> = {
    idle: 'Awaiting dispatch',
    assigned: 'Rider assigned',
    transit: 'In transit \u2014 2s updates',
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
      className="min-h-screen bg-[#06070a] text-[#EEF0F4] [font-family:var(--font-body)] overflow-x-hidden selection:bg-amber-500/25 selection:text-amber-200"
    >
      {/* ── Ambient background ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-220px] left-[15%] w-[560px] h-[560px] bg-[#E8A33D]/[0.06] rounded-full blur-[150px] motion-safe:animate-pulse [animation-duration:9s]" />
        <div className="absolute top-[-120px] right-[8%] w-[480px] h-[480px] bg-[#2DD6C4]/[0.05] rounded-full blur-[140px] motion-safe:animate-pulse [animation-duration:13s]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#06070a]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl shadow-black/60' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#E8A33D] to-[#f0bc6a] flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-[#06070a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="[font-family:var(--font-display)] font-semibold text-white text-lg tracking-tight">GUZO</span>
              <span className="text-sm text-[#8B93A7]" lang="am">\u1310\u12dd</span>
            </div>
          </a>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            <SignedOut>
              <Link to="/sign-in" className="text-sm font-medium text-[#8B93A7] hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/[0.04]">
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className="text-sm font-semibold bg-[#EEF0F4] text-[#06070a] px-5 py-2.5 rounded-lg transition-all hover:bg-white"
              >
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="text-sm font-semibold bg-[#E8A33D] hover:bg-[#f0bc6a] text-[#06070a] px-5 py-2.5 rounded-lg transition-all"
              >
                Go to dashboard
              </Link>
            </SignedIn>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 text-[#EEF0F4]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`sm:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-b border-white/[0.06] ${
            menuOpen ? 'max-h-56' : 'max-h-0'
          }`}
        >
          <div className="px-6 py-4 flex flex-col gap-2 bg-[#06070a]/95 backdrop-blur-xl">
            <SignedOut>
              <Link to="/sign-in" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-[#8B93A7] px-3 py-2.5 rounded-lg">
                Sign in
              </Link>
              <Link
                to="/sign-up"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold bg-[#E8A33D] text-[#06070a] px-3 py-2.5 rounded-lg text-center"
              >
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold bg-[#E8A33D] text-[#06070a] px-3 py-2.5 rounded-lg text-center"
              >
                Go to dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section id="top" className="relative pt-40 pb-12 px-6 text-center">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2DD6C4] bg-[#2DD6C4]/[0.06] border border-[#2DD6C4]/20 px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2DD6C4] motion-safe:animate-pulse" />
            Built for delivery fleets in Addis Ababa
          </div>

          <h1 className="[font-family:var(--font-display)] text-5xl md:text-7xl font-semibold tracking-tight leading-[1.06] text-white mb-7">
            Run your fleet like
            <br />
            you can see every mile
          </h1>

          <p className="text-lg text-[#8B93A7] max-w-xl mx-auto mb-10 leading-relaxed">
            Dispatch orders, watch riders move in real time, and settle cash payouts \u2014 all from one dashboard built for how delivery actually runs here.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignedOut>
              <Link
                to="/sign-up"
                className="group inline-flex items-center gap-2 bg-[#E8A33D] hover:bg-[#f0bc6a] text-[#06070a] font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/10 hover:-translate-y-0.5"
              >
                Set up your fleet
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-2 text-[#EEF0F4] border border-white/10 hover:border-white/20 hover:bg-white/[0.03] px-7 py-3.5 rounded-xl transition-all font-medium"
              >
                Administrator login
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 bg-[#EEF0F4] text-[#06070a] font-semibold px-7 py-3.5 rounded-xl transition-all hover:bg-white hover:-translate-y-0.5"
              >
                Open control console
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </SignedIn>
          </div>
        </div>

        {/* Signature route-line, threading out of the hero */}
        <div className="max-w-4xl mx-auto mt-16 relative z-10">
          <RouteLine />
        </div>

        <div className="max-w-4xl mx-auto -mt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#4A5266] font-semibold mb-6">Powering delivery crews across Ethiopia</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {partners.map((p) => (
              <span key={p.name} title={p.name} className="[font-family:var(--font-mono)] text-xs font-medium text-[#4A5266] tracking-wider hover:text-[#8B93A7] transition-colors">
                {p.mark}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive dispatch simulator ───────────────────────────── */}
      <section className="px-6 pt-16 pb-24 relative">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0c11]/90 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="flex items-center gap-2 [font-family:var(--font-mono)] text-xs text-[#4A5266]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2DD6C4] motion-safe:animate-pulse" />
                dispatch_preview \u2014 live demo
              </div>
              <div className="text-xs text-[#4A5266] [font-family:var(--font-mono)] hidden sm:block">merchant_console.b2b</div>
            </div>

            <div className="p-5 md:p-7 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 border border-white/[0.06] bg-white/[0.015] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="[font-family:var(--font-display)] text-sm font-semibold text-white mb-2">Try a dispatch</h3>
                  <p className="text-[#8B93A7] text-xs leading-relaxed mb-5">
                    Trigger a mock order and watch it move through assignment, transit, and handoff \u2014 the same states your dashboard tracks live.
                  </p>
                  <div className="border border-white/[0.06] bg-white/[0.015] rounded-lg p-3.5 mb-4">
                    <span className="text-[10px] font-semibold text-[#4A5266] uppercase tracking-widest block mb-1.5">Status</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#EEF0F4]">{statusLabel[dispatchStatus]}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                          dispatchStatus === 'idle'
                            ? 'bg-white/[0.04] text-[#4A5266]'
                            : dispatchStatus === 'assigned'
                              ? 'bg-[#2DD6C4]/10 text-[#2DD6C4] border border-[#2DD6C4]/20'
                              : dispatchStatus === 'transit'
                                ? 'bg-[#E8A33D]/10 text-[#E8A33D] border border-[#E8A33D]/20 motion-safe:animate-pulse'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {dispatchStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={runSimulation}
                  disabled={dispatchStatus === 'assigned' || dispatchStatus === 'transit'}
                  className="w-full py-3 rounded-lg bg-[#E8A33D] hover:bg-[#f0bc6a] font-semibold text-xs text-[#06070a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {dispatchStatus === 'idle' ? 'Dispatch mock order' : dispatchStatus === 'delivered' ? 'Reset simulation' : 'Processing\u2026'}
                </button>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-white/[0.015] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#4A5266] block mb-1">Active riders</span>
                  <h4 className="[font-family:var(--font-mono)] text-2xl font-medium text-white">{activeRiders}</h4>
                </div>
                <div className="bg-white/[0.015] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#4A5266] block mb-1">Telemetry uptime</span>
                  <h4 className="[font-family:var(--font-mono)] text-2xl font-medium text-[#E8A33D]">99.9%</h4>
                </div>

                <div className="col-span-2 bg-white/[0.015] border border-white/[0.06] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="text-xs font-medium text-[#8B93A7]">Transit to Bole, Addis Ababa</span>
                    <span className="[font-family:var(--font-mono)] text-xs text-[#4A5266]">OR-49520-ET</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#8B93A7]">Route progress</span>
                      <span className="[font-family:var(--font-mono)] text-[#2DD6C4]">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2DD6C4] to-[#E8A33D] rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Order created', active: progress >= 0 },
                      { label: 'Rider dispatched', active: progress >= 15 },
                      { label: 'Handed off', active: progress >= 100 },
                    ].map((step) => (
                      <div
                        key={step.label}
                        className={`p-2 rounded-lg border text-center text-[10px] font-medium transition-all duration-500 ${
                          step.active ? 'bg-[#2DD6C4]/[0.06] border-[#2DD6C4]/20 text-[#2DD6C4]' : 'bg-transparent border-white/[0.06] text-[#4A5266]'
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

      <div className="max-w-5xl mx-auto px-6">
        <RouteLine flip />
      </div>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="px-6 py-24 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-[#E8A33D] font-semibold mb-3">What you get</p>
            <h2 className="[font-family:var(--font-display)] text-3xl md:text-5xl font-semibold text-white tracking-tight leading-tight">
              Everything a dispatch desk needs, nothing it doesn\u2019t
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.14] rounded-xl p-6 transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-5 ${
                    f.accent === 'amber' ? 'text-[#E8A33D]' : 'text-[#2DD6C4]'
                  }`}
                >
                  {f.icon}
                </div>
                <h3 className="[font-family:var(--font-display)] font-semibold text-base text-white mb-2">{f.title}</h3>
                <p className="text-[#8B93A7] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works (a real sequence, so numbering earns its place) ── */}
      <section className="px-6 py-24 border-t border-white/[0.06] relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-[#2DD6C4] font-semibold mb-3">Getting started</p>
            <h2 className="[font-family:var(--font-display)] text-3xl md:text-4xl font-semibold text-white tracking-tight">Three stops to your first dispatch</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {waypoints.map((s) => (
              <div key={s.n} className="relative">
                <span className="[font-family:var(--font-mono)] text-xs text-[#E8A33D] font-medium block mb-4">{s.n}</span>
                <h3 className="[font-family:var(--font-display)] font-semibold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-[#8B93A7] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-[#E8A33D] font-semibold mb-3">Questions</p>
            <h2 className="[font-family:var(--font-display)] text-2xl md:text-3xl font-semibold text-white">Before you sign up</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q} className="border border-white/[0.07] bg-white/[0.015] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 p-4.5 text-left font-medium text-sm text-white hover:bg-white/[0.02] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-4 h-4 text-[#4A5266] shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="text-sm text-[#8B93A7] leading-relaxed px-4.5 pb-4.5">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-10 md:p-14 text-center">
            <div className="relative z-10 space-y-5">
              <h2 className="[font-family:var(--font-display)] text-3xl md:text-5xl font-semibold text-white tracking-tight leading-tight">
                Start running your fleet today
              </h2>
              <p className="text-[#8B93A7] text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                Connect your riders, automate cash settlements, and get delivery telemetry you can trust. No setup fee.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <SignedOut>
                  <Link
                    to="/sign-up"
                    className="inline-flex items-center justify-center gap-2 bg-[#E8A33D] hover:bg-[#f0bc6a] text-[#06070a] font-semibold px-7 py-3.5 rounded-xl transition-all"
                  >
                    Set up your fleet, free
                  </Link>
                  <a
                    href="mailto:support@guzologistics.com"
                    className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/[0.03] text-[#EEF0F4] font-medium px-7 py-3.5 rounded-xl transition-all"
                  >
                    Talk to us about enterprise
                  </a>
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 bg-[#E8A33D] hover:bg-[#f0bc6a] text-[#06070a] font-semibold px-7 py-3.5 rounded-xl transition-all"
                  >
                    Go to your dashboard
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-[#E8A33D] to-[#f0bc6a] flex items-center justify-center">
              <span className="[font-family:var(--font-display)] text-[11px] font-bold text-[#06070a]">G</span>
            </div>
            <div>
              <p className="[font-family:var(--font-display)] font-semibold text-white text-sm">Guzo Logistics</p>
              <p className="text-[11px] text-[#4A5266]">Built for scale in Addis Ababa</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#8B93A7]">
            <a href="mailto:support@guzologistics.com" className="hover:text-white transition-colors">
              support@guzologistics.com
            </a>
            <span className="[font-family:var(--font-mono)]">+251 900 11 22 33</span>
            <Link to="/sign-up" className="hover:text-white transition-colors">
              Register your fleet
            </Link>
          </div>

          <p className="text-[11px] text-[#4A5266]">\u00a9 2026 Guzo Logistics</p>
        </div>
      </footer>
    </div>
  );
}
