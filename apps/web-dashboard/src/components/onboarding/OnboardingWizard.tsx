/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Building2,
  MapPin,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Truck,
  Star,
  Zap,
  Package,
} from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

const API_URL = getApiUrl();

const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Dire Dawa',
  'Mekelle',
  'Gondar',
  'Hawassa',
  'Bahir Dar',
  'Adama',
  'Jimma',
  'Jijiga',
  'Shashamane',
  'Bishoftu',
  'Arba Minch',
  'Hosaena',
  'Wolaita Sodo',
  'Dilla',
];

const STEPS = [
  {
    id: 1,
    label: 'Identity',
    icon: Building2,
    title: 'Your Business Identity',
    sub: 'How customers and riders will know you',
  },
  {
    id: 2,
    label: 'Location',
    icon: MapPin,
    title: 'Service Territory',
    sub: 'Where your fleet will operate',
  },
  {
    id: 3,
    label: 'Pricing',
    icon: DollarSign,
    title: 'Delivery Pricing',
    sub: 'Set your base fare and per-km rate',
  },
  {
    id: 4,
    label: 'Launch',
    icon: CheckCircle2,
    title: 'Ready for Takeoff',
    sub: 'Review and activate your account',
  },
];

interface WizardData {
  businessName: string;
  supportEmail: string;
  businessAddress: string;
  phoneNumber: string;
  serviceCity: string;
  baseFare: number;
  perKmRate: number;
}

interface Props {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<WizardData>({
    businessName: '',
    supportEmail: '',
    businessAddress: '',
    phoneNumber: '',
    serviceCity: '',
    baseFare: 50,
    perKmRate: 10,
  });

  const update = (field: keyof WizardData, value: any) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 1) return data.businessName.trim().length >= 2;
    if (step === 2) return data.serviceCity.trim().length > 0;
    if (step === 3) return data.baseFare > 0 && data.perKmRate > 0;
    return true;
  };

  const handleFinish = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessName: data.businessName,
          supportEmail: data.supportEmail,
          businessAddress: data.businessAddress,
          phoneNumber: data.phoneNumber,
          serviceCity: data.serviceCity,
          deliveryPricing: { baseFare: data.baseFare, perKmRate: data.perKmRate },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [data, getToken, onComplete]);

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234f46e5' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-2xl shadow-blue-500/30 mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome to Guzo</h1>
          <p className="text-blue-300 mt-2 font-medium">
            Set up your merchant account in 3 quick steps
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${
                    step > s.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : step === s.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20'
                        : 'bg-white/10 text-white/40'
                  }`}
                >
                  {step > s.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <s.icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${step === s.id ? 'text-blue-300' : 'text-white/30'}`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-3 mt-[-16px] rounded-full overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: step > s.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div
            className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
            style={{ width: `${progress + 25}%`, transition: 'width 0.4s ease' }}
          />

          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <currentStep.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{currentStep.title}</h2>
                  <p className="text-xs text-slate-500 font-medium">{currentStep.sub}</p>
                </div>
              </div>
            </div>

            {/* Step 1 — Identity */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                    Business Name *
                  </label>
                  <input
                    autoFocus
                    value={data.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    placeholder="e.g. Habesha Express Delivery"
                    className="w-full h-12 px-4 rounded-xl border bg-transparent dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={data.supportEmail}
                      onChange={(e) => update('supportEmail', e.target.value)}
                      placeholder="support@business.com"
                      className="w-full h-12 px-4 rounded-xl border bg-transparent dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={data.phoneNumber}
                      onChange={(e) => update('phoneNumber', e.target.value)}
                      placeholder="+251 9XX XXX XXX"
                      className="w-full h-12 px-4 rounded-xl border bg-transparent dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                    Business Address
                  </label>
                  <input
                    value={data.businessAddress}
                    onChange={(e) => update('businessAddress', e.target.value)}
                    placeholder="e.g. Bole Rd, Addis Ababa"
                    className="w-full h-12 px-4 rounded-xl border bg-transparent dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 2 — Location */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-3">
                    Select Your Service City *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ETHIOPIAN_CITIES.map((city) => (
                      <button
                        key={city}
                        onClick={() => update('serviceCity', city)}
                        className={`p-3 rounded-xl border-2 text-sm font-bold text-left transition-all ${
                          data.serviceCity === city
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <MapPin
                          className={`w-3.5 h-3.5 mb-1 ${data.serviceCity === city ? 'text-blue-500' : 'text-slate-400'}`}
                        />
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
                {data.serviceCity && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
                    <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-blue-700">
                      Your riders in <span className="underline">{data.serviceCity}</span> will
                      automatically receive orders from your dispatch.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Pricing */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Base Fare (ETB) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                        ETB
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={data.baseFare}
                        onChange={(e) => update('baseFare', Number(e.target.value))}
                        className="w-full h-12 pl-14 pr-4 rounded-xl border bg-transparent dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-sm font-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                      Flat fee charged per order
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Per KM Rate (ETB) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                        ETB
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={data.perKmRate}
                        onChange={(e) => update('perKmRate', Number(e.target.value))}
                        className="w-full h-12 pl-14 pr-4 rounded-xl border bg-transparent dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-sm font-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                      Added per kilometer of distance
                    </p>
                  </div>
                </div>

                {/* Live pricing preview */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                    Live Pricing Preview
                  </p>
                  {[
                    { label: 'Short Delivery (2 km)', km: 2 },
                    { label: 'Medium Delivery (7 km)', km: 7 },
                    { label: 'Long Delivery (15 km)', km: 15 },
                  ].map((ex) => (
                    <div
                      key={ex.km}
                      className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-bold">{ex.label}</p>
                        <p className="text-[10px] text-slate-400">
                          Base + ({ex.km} km × ETB {data.perKmRate})
                        </p>
                      </div>
                      <p className="text-lg font-black text-emerald-400">
                        ETB {(data.baseFare + ex.km * data.perKmRate).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 — Review */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  {[
                    { icon: Building2, label: 'Business', value: data.businessName },
                    { icon: MapPin, label: 'Service City', value: data.serviceCity || '—' },
                    {
                      icon: DollarSign,
                      label: 'Pricing',
                      value: `ETB ${data.baseFare} base + ETB ${data.perKmRate}/km`,
                    },
                    ...(data.supportEmail
                      ? [{ icon: Star, label: 'Support Email', value: data.supportEmail }]
                      : []),
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {item.label}
                        </p>
                        <p className="font-bold text-slate-900 text-sm">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-emerald-800 text-sm">Everything looks good!</p>
                    <p className="text-emerald-700 text-xs font-medium mt-1">
                      Click <strong>Launch My Business</strong> to activate your merchant account.
                      You can change all these settings anytime from the Settings page.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl p-4">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="px-8 pb-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-full transition-all duration-300 ${step === s.id ? 'w-6 h-2 bg-blue-600' : 'w-2 h-2 bg-slate-200'}`}
                />
              ))}
            </div>

            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-60 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Launching...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" /> Launch My Business
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
