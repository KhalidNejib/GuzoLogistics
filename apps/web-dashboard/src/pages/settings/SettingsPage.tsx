/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Camera,
  Loader2,
  Mail,
  Smartphone,
  Globe,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Separator,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Skeleton,
  Switch,
} from '@/components/ui';
import { toast } from 'sonner';
import { useMerchantProfile } from '@/hooks/useMerchantProfile';
import { useUser, useAuth } from '@clerk/clerk-react';
import { getApiUrl } from '@/lib/utils';

export default function SettingsPage() {
  const { profile, isLoading, isUpdating, updateProfile } = useMerchantProfile();
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'fleet' | 'notifications' | 'security'>(
    'profile'
  );

  const [formData, setFormData] = useState({
    businessName: '',
    supportEmail: '',
    businessAddress: '',
    deliveryPricing: {
      baseFare: 50,
      perKmRate: 10,
    },
    notificationSettings: {
      emailAlerts: true,
      pushAlerts: true,
      orderUpdates: true,
      financeAlerts: true,
    },
    preferences: {
      darkMode: false,
      language: 'EN',
    },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.businessName || '',
        supportEmail: profile.supportEmail || '',
        businessAddress: profile.businessAddress || '',
        deliveryPricing: profile.deliveryPricing || {
          baseFare: 50,
          perKmRate: 10,
        },
        notificationSettings: profile.notificationSettings || {
          emailAlerts: true,
          pushAlerts: true,
          orderUpdates: true,
          financeAlerts: true,
        },
        preferences: profile.preferences || {
          darkMode: false,
          language: 'EN',
        },
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      toast.success('Settings saved successfully', {
        description: 'Your merchant profile and operational preferences have been updated.',
      });
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Card className="border-border/40 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
            <CardHeader className="border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50">
              <CardTitle className="text-lg font-bold">Merchant Profile</CardTitle>
              <CardDescription>
                Update your public business information used across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-1 ring-border">
                    <AvatarImage src={profile?.logoUrl || ''} />
                    <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">
                      {formData.businessName?.substring(0, 2).toUpperCase() || 'ME'}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {isUpdating ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUpdating}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64String = (reader.result as string).split(',')[1];
                          if (!base64String) return toast.error('Failed to process image');

                          try {
                            const params = {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${await getToken()}`,
                              },
                              body: JSON.stringify({ imageBase64: base64String }),
                            };

                            const res = await fetch(
                              `${getApiUrl()}/api/v1/merchant/finance/upload-proof`,
                              params
                            );
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json();

                            await updateProfile({ logoUrl: data.url });
                            toast.success('Logo updated successfully');
                          } catch (err) {
                            toast.error('Failed to upload logo');
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-xl text-foreground">
                    {formData.businessName || 'Business Name'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-400">
                      Operational Key:
                    </span>
                    <code className="bg-slate-100 px-2 py-0.5 rounded font-bold text-xs text-slate-700 font-mono tracking-tighter">
                      {profile?.fleetKey || 'Generating...'}
                    </code>
                  </div>
                </div>
              </div>

              <Separator className="opacity-40" />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Business Name
                  </Label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Support Email
                  </Label>
                  <Input
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Headquarters Address
                </Label>
                <Input
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="font-bold h-11 px-8 shadow-lg shadow-primary/20"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Profile Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'fleet':
        return (
          <Card className="border-border/40 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
            <CardHeader className="border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50">
              <CardTitle className="text-lg font-bold">Fleet Pricing Model</CardTitle>
              <CardDescription>
                Determine how delivery costs are calculated for your customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Base Pickup Fare
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-xs font-black text-slate-400">
                      ETB
                    </span>
                    <Input
                      type="number"
                      value={formData.deliveryPricing.baseFare}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryPricing: {
                            ...formData.deliveryPricing,
                            baseFare: Number(e.target.value),
                          },
                        })
                      }
                      className="h-12 pl-12 rounded-xl text-lg font-black"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    The minimum starting price for any delivery mission.
                  </p>
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Per Kilometer Rate
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-xs font-black text-slate-400">
                      ETB
                    </span>
                    <Input
                      type="number"
                      value={formData.deliveryPricing.perKmRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryPricing: {
                            ...formData.deliveryPricing,
                            perKmRate: Number(e.target.value),
                          },
                        })
                      }
                      className="h-12 pl-12 rounded-xl text-lg font-black"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Variable distance charge added to the base fare.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm text-blue-900">Dynamic Pricing Preview</h4>
                    <p className="text-xs text-blue-700/60 font-medium">
                      Estimated cost for a typical 10KM cross-city mission.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-4 px-6 bg-white rounded-xl border border-blue-200/50 shadow-sm ring-1 ring-blue-500/5">
                  <span className="text-sm font-bold text-slate-600">Sample 10KM Mission:</span>
                  <span className="text-2xl font-black text-blue-600 italic">
                    ETB{' '}
                    {formData.deliveryPricing.baseFare + formData.deliveryPricing.perKmRate * 10}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="font-bold h-11 px-8 shadow-lg shadow-primary/20"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Update Operational Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'notifications':
        return (
          <Card className="border-border/40 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
            <CardHeader className="border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50">
              <CardTitle className="text-lg font-bold">Alert Configuration</CardTitle>
              <CardDescription>
                Manage how the system communicates tactical updates to your team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {[
                {
                  id: 'emailAlerts',
                  title: 'Email Intelligence',
                  desc: 'Receive daily performance summaries and auditing logs.',
                  icon: Mail,
                },
                {
                  id: 'pushAlerts',
                  title: 'Real-time Browser Pings',
                  desc: 'Critical alerts for system downtime or high-risk incidents.',
                  icon: Globe,
                },
                {
                  id: 'orderUpdates',
                  title: 'Mission Milestones',
                  desc: 'Notifications when missions are dispatched, claimed, or finalized.',
                  icon: Smartphone,
                },
                {
                  id: 'financeAlerts',
                  title: 'Financial Heartbeat',
                  desc: 'Instant alerts on settlement requests and revenue thresholds.',
                  icon: CreditCard,
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <item.icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="font-black text-sm text-slate-800 tracking-tight">
                        {item.title}
                      </Label>
                      <p className="text-xs text-muted-foreground font-medium max-w-[400px] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={(formData.notificationSettings as any)[item.id]}
                    onCheckedChange={(val) =>
                      setFormData({
                        ...formData,
                        notificationSettings: { ...formData.notificationSettings, [item.id]: val },
                      })
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end pt-8">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="font-bold h-11 px-8 shadow-lg shadow-primary/20"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'security':
        return (
          <Card className="border-border/40 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
            <CardHeader className="border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" /> Administrative Security
              </CardTitle>
              <CardDescription>
                Manage terminal authentication and device authorizations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between p-6 rounded-2xl border border-indigo-100 bg-indigo-50/20 ring-1 ring-indigo-500/5">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 tracking-tight text-sm">
                    Federated Identity Management
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm font-medium leading-relaxed">
                    Authentication is strictly guarded by{' '}
                    <span className="font-bold">Ethio Logistics Cloud Auth</span>. Credentials
                    reside in your global SSO vault.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="font-bold text-xs h-9 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 shadow-sm"
                >
                  Change Password
                </Button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-3">
                  <Label className="text-[9px] font-black uppercase tracking-[2px] text-slate-400">
                    Primary Recovery Phone
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-md">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="font-bold text-sm tabular-nums text-slate-800">
                      {clerkUser?.primaryPhoneNumber?.phoneNumber || 'Unlinked'}
                    </span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-3">
                  <Label className="text-[9px] font-black uppercase tracking-[2px] text-slate-400">
                    Fleet Status
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">
                      Verified Operating License
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-slate-100 space-y-6">
                <div className="space-y-2">
                  <h4 className="font-black text-[10px] uppercase tracking-[3px] text-destructive/70">
                    Danger Zone
                  </h4>
                  <Card className="border-destructive/20 shadow-none bg-destructive/[0.02] overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-900">
                            Terminate Merchant Account
                          </h4>
                          <p className="text-xs text-muted-foreground font-medium max-w-md">
                            Permanently liquidate your operating fleet. History is preserved for
                            auditing but access is revoked.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="font-black text-[10px] uppercase tracking-widest h-10 px-8 shadow-lg shadow-destructive/10"
                          onClick={() =>
                            toast.error('Self-liquidation disabled. Contact Head Office.')
                          }
                        >
                          Request Liquidation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 pt-4">
      <div className="animate-in fade-in slide-in-from-top-4 duration-600">
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 text-shadow-sm">
          Terminal Settings
        </h2>
        <p className="text-slate-500 font-medium text-lg mt-1 tracking-tight">
          Operating parameters for{' '}
          <span className="text-primary font-black uppercase text-xs tracking-widest bg-primary/5 px-2 py-0.5 rounded">
            {formData.businessName || 'Your Fleet'}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:gap-10 lg:grid-cols-4">
        {/* Navigation Rail */}
        <aside className="flex flex-row overflow-x-auto lg:flex-col gap-2 pb-4 lg:pb-0 scrollbar-none select-none sm:justify-start">
          {[
            { id: 'profile', name: 'Identity', icon: User, desc: 'Public presence' },
            { id: 'fleet', name: 'Operational', icon: Settings, desc: 'Pricing & logic' },
            { id: 'notifications', name: 'Intelligence', icon: Bell, desc: 'Alert channels' },
            { id: 'security', name: 'Account Auth', icon: Shield, desc: 'Credentials' },
            { id: 'billing', name: 'Revenue', icon: CreditCard, desc: 'Payouts & history' },
          ].map((item) => (
            <button
              key={item.id}
              disabled={item.id === 'billing'}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-none lg:w-full group text-left px-4 py-3 rounded-2xl transition-all border-2 flex items-center gap-3 shrink-0 ${
                activeTab === item.id
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200'
                  : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-100'
              } ${item.id === 'billing' ? 'opacity-40 cursor-not-allowed border-dashed border-slate-200' : ''}`}
            >
              <item.icon
                className={`w-5 h-5 ${activeTab === item.id ? 'text-primary' : 'text-slate-400 group-hover:text-slate-900 transition-colors'}`}
              />
              <div className="flex flex-col">
                <span
                  className={`text-[13px] md:text-sm font-black tracking-tight ${activeTab === item.id ? 'text-white' : 'text-slate-900'}`}
                >
                  {item.name}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${activeTab === item.id ? 'text-slate-400' : 'text-slate-400'}`}
                >
                  {item.id === 'billing' ? 'Pending' : item.desc}
                </span>
              </div>
            </button>
          ))}
        </aside>

        {/* Content Engine */}
        <main className="lg:col-span-3 space-y-8">{renderTabContent()}</main>
      </div>
    </div>
  );
}
