import * as React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Live GPS Tracking',
    desc: 'Real-time rider location on an interactive map. Share a public tracking link with customers so they never wonder where their delivery is.',
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: 'Fleet Management',
    desc: 'Manage your entire delivery fleet from one dashboard. Approve riders, monitor performance, and handle incidents in real time.',
    color: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Business Analytics',
    desc: 'Revenue trends, delivery success rates, and rider performance leaderboards — all the data you need to scale your operations confidently.',
    color: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Automated Payouts',
    desc: 'Rider earnings calculated automatically per delivery. Settlement reports, payout history, and finance dashboards built in.',
    color: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Mobile Rider App',
    desc: 'Native Android app for your delivery team. Offline-capable, GPS-powered, with SOS alerts and proof-of-delivery photo capture.',
    color: 'from-rose-500/20 to-rose-600/5',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'SMS Notifications',
    desc: 'Customers get live SMS alerts at every stage — order accepted, in transit, delivered. Powered by AfroMessage for Ethiopian numbers.',
    color: 'from-cyan-500/20 to-cyan-600/5',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
  },
];

const steps = [
  { n: '01', title: 'Sign Up & Onboard', desc: 'Register your business in minutes. Fill in your company details, delivery pricing, and service area.' },
  { n: '02', title: 'Add Your Fleet', desc: 'Share your fleet code with your riders. They download the mobile app and join your fleet instantly.' },
  { n: '03', title: 'Start Delivering', desc: 'Create orders, assign riders, and watch live tracking in real time. Get paid, scale up.' },
];

const stats = [
  { value: '< 2s', label: 'GPS update interval' },
  { value: '99.9%', label: 'API uptime SLA' },
  { value: '2000+', label: 'Requests/15 min per user' },
  { value: 'End-to-end', label: 'Encrypted & verified' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#050810]/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">Guzo</span>
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Logistics</span>
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link to="/sign-in" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                Sign In
              </Link>
              <Link to="/sign-up" className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                Get Started →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors">
                Go to Dashboard →
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-32 left-1/4 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-[80px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFkMjkzYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built for Ethiopian B2B Logistics
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Deliver Smarter.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              Scale Faster.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Guzo is the end-to-end logistics operating system for modern Ethiopian businesses — live tracking, fleet management, automated payouts, and real-time analytics in one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <SignedOut>
              <Link
                to="/sign-up"
                className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                Start Your Free Account
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link to="/sign-in" className="inline-flex items-center gap-2 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 px-8 py-4 rounded-xl transition-all duration-200 hover:bg-white/5 font-semibold">
                Sign In to Dashboard
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-blue-500/25"
              >
                Open Dashboard
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </SignedIn>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/8 bg-gradient-to-b from-slate-900/80 to-slate-950/80 shadow-2xl shadow-black/50">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-black/20">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-xs text-slate-500 font-mono">
                app.guzologistics.com/dashboard
              </div>
            </div>
            {/* Fake dashboard preview */}
            <div className="p-6 grid grid-cols-4 gap-4 min-h-[320px]">
              <div className="col-span-4 md:col-span-1 space-y-2">
                {['Dashboard','Orders','Live Tracking','Fleet','Settings'].map((item, i) => (
                  <div key={item} className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${i === 0 ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : 'bg-slate-600'}`} />
                    {item}
                  </div>
                ))}
              </div>
              <div className="col-span-4 md:col-span-3 grid grid-cols-3 gap-3">
                {[
                  { label: 'Active Orders', value: '24', color: 'text-blue-400' },
                  { label: 'Delivered Today', value: '138', color: 'text-emerald-400' },
                  { label: 'Revenue (ETB)', value: '48,200', color: 'text-amber-400' },
                ].map(card => (
                  <div key={card.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                  </div>
                ))}
                <div className="col-span-3 bg-white/3 border border-white/8 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-slate-300 font-medium">12 riders active · 3 in transit · Last update 1.8s ago</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">LIVE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-3">Platform Features</p>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Everything your logistics<br />operation needs
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`bg-gradient-to-br ${f.color} border ${f.border} rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200`}>
                <div className={`w-12 h-12 rounded-xl bg-black/30 border ${f.border} flex items-center justify-center ${f.text} mb-4`}>
                  {f.icon}
                </div>
                <h3 className={`font-bold text-lg mb-2 ${f.text}`}>{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-bold uppercase tracking-wider mb-3">Getting Started</p>
            <h2 className="text-4xl md:text-5xl font-black">Live in three steps</h2>
          </div>
          <div className="space-y-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex gap-6 items-start group">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-lg group-hover:border-blue-400/40 transition-colors">
                  {s.n}
                </div>
                <div className="flex-1 pt-1.5">
                  <h3 className="font-bold text-lg text-white mb-1">{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute left-7 mt-16 w-0.5 h-6 bg-blue-500/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gradient-to-br from-blue-600/20 via-violet-600/10 to-blue-600/5 border border-blue-500/20 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent_70%)]" />
            <div className="relative">
              <p className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-4">Ready to scale?</p>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Start managing your fleet today
              </h2>
              <p className="text-slate-400 mb-8 text-lg max-w-xl mx-auto">
                Join businesses across Ethiopia using Guzo to power their delivery operations. Setup takes under 10 minutes.
              </p>
              <SignedOut>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/sign-up"
                    className="group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:-translate-y-0.5"
                  >
                    Create Free Account
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <a
                    href="mailto:support@guzologistics.com"
                    className="inline-flex items-center justify-center gap-2 text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/5 px-8 py-4 rounded-xl transition-all font-semibold"
                  >
                    Contact Sales
                  </a>
                </div>
              </SignedOut>
              <SignedIn>
                <Link to="/dashboard" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/25">
                  Open Dashboard →
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white">Guzo Logistics</p>
              <p className="text-xs text-slate-500">Built for Ethiopian business</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="mailto:support@guzologistics.com" className="hover:text-slate-300 transition-colors">support@guzologistics.com</a>
            <span>+251 900 11 22 33</span>
            <Link to="/sign-up" className="hover:text-slate-300 transition-colors">Get Started</Link>
          </div>
          <p className="text-xs text-slate-600">© 2025 Guzo Logistics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
