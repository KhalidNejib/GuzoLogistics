import { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, CreditCard, Trash2, Camera, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
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
} from '@/components/ui';
import { toast } from 'sonner';
import { useMerchantProfile } from '@/hooks/useMerchantProfile';

export default function SettingsPage() {
  const { profile, isLoading, isUpdating, updateProfile } = useMerchantProfile();

  const [formData, setFormData] = useState({
    businessName: '',
    supportEmail: '',
    businessAddress: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.businessName || '',
        supportEmail: profile.supportEmail || '',
        businessAddress: profile.businessAddress || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      toast.success('Settings saved successfully', {
        description: 'Your merchant profile has been updated in our database.',
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
          <Skeleton className="h-40 w-full" />
          <div className="md:col-span-3">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Settings
        </h2>
        <p className="text-muted-foreground text-sm">
          Manage your merchant profile and application preferences.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        {/* Sidebar Nav */}
        <nav className="space-y-1">
          {[
            { name: 'Profile', icon: User, active: true },
            { name: 'Notifications', icon: Bell, active: false },
            { name: 'Security', icon: Shield, active: false },
            { name: 'Billing', icon: CreditCard, active: false },
          ].map((item) => (
            <Button
              key={item.name}
              variant={item.active ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 h-11 px-4 transition-all ${
                item.active ? 'font-bold bg-primary/5 text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-4 w-4 ${item.active ? 'text-primary' : ''}`} />
              {item.name}
            </Button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50">
              <CardTitle className="text-lg font-bold">Merchant Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Profile Header */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-1 ring-border">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">
                      {formData.businessName?.substring(0, 2).toUpperCase() || 'EE'}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-xl text-foreground">
                    {formData.businessName || 'Merchant Profile'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Merchant ID: {profile?._id.toUpperCase() || 'Loading...'}
                  </p>
                </div>
              </div>

              <Separator className="opacity-40" />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="business-name"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Business Name
                  </Label>
                  <Input
                    id="business-name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Enter business name"
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Support Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    placeholder="support@business.com"
                    className="h-11 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="address"
                  className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Headquarters Address
                </Label>
                <Input
                  id="address"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  placeholder="Addis Ababa, Ethiopia"
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="font-bold h-11 px-8 shadow-lg shadow-primary/20 min-w-[140px]"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20 shadow-sm overflow-hidden bg-destructive/[0.02]">
            <CardHeader className="border-b border-destructive/10 bg-destructive/[0.03]">
              <CardTitle className="text-lg font-bold text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">Delete Merchant Account</h4>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Permanently delete your merchant account and all associated delivery data. This
                    action is **not reversible**.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="font-bold h-11 px-6 shadow-lg shadow-destructive/20 shrink-0"
                >
                  Delete My Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
