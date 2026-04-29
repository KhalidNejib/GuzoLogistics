/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderFormSchema, type CreateOrderInput } from '@/lib/orderSchema';
import { useCreateOrder } from '@/hooks/useCreateOrder';
import MapPicker from './MapPicker';
import { reverseGeocode, searchAddress, type GeocodeResult } from '@/lib/geocoding';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  Package,
  MapPin,
  Navigation,
  DollarSign,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Search,
  LocateFixed,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

const MERCHANT_HUB_COORDS: [number, number] = [38.7525, 9.0192];
const MERCHANT_HUB_ADDRESS = 'Ethio Logistics Hub, Sunshine Building, Addis Ababa';

export default function CreateOrderForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const { createOrder, isLoading, error } = useCreateOrder();
  const [isSuccess, setIsSuccess] = useState(false);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  // Geocoding States
  const [isGeocoding, setIsGeocoding] = useState<Record<string, boolean>>({
    pickup: false,
    delivery: false,
  });
  const [suggestions, setSuggestions] = useState<Record<string, GeocodeResult[]>>({
    pickup: [],
    delivery: [],
  });
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({
    pickup: false,
    delivery: false,
  });
  const searchTimeout = useRef<any>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderFormSchema) as any,
    defaultValues: {
      pickupAddress: {
        addressText: MERCHANT_HUB_ADDRESS,
        coordinates: MERCHANT_HUB_COORDS,
      },
      deliveryAddress: { addressText: '', coordinates: MERCHANT_HUB_COORDS },
      itemDetails: { description: '', weightKg: 1, dimensions: '' },
      priceInfo: { amount: 0, currency: 'ETB' },
    },
  });

  const onSubmit = async (data: CreateOrderInput) => {
    try {
      const result = await createOrder(data);
      if (result.orderId) {
        setNewOrderId(result.orderId);
        setTrackingToken(result.trackingToken);
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Dispatch Error:', err);
    }
  };

  // Handle Map Selection (Reverse Geocode)
  const handleMapSelect = async (type: 'pickup' | 'delivery', coords: [number, number]) => {
    form.setValue(
      type === 'pickup' ? 'pickupAddress.coordinates' : 'deliveryAddress.coordinates',
      coords
    );

    setIsGeocoding((prev) => ({ ...prev, [type]: true }));
    const address = await reverseGeocode(coords[0], coords[1]);
    form.setValue(
      type === 'pickup' ? 'pickupAddress.addressText' : 'deliveryAddress.addressText',
      address
    );
    setIsGeocoding((prev) => ({ ...prev, [type]: false }));
  };

  // Handle Address Input (Forward Geocode / Search)
  const handleAddressInput = (type: 'pickup' | 'delivery', value: string) => {
    form.setValue(
      type === 'pickup' ? 'pickupAddress.addressText' : 'deliveryAddress.addressText',
      value
    );

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length < 3) {
      setSuggestions((prev) => ({ ...prev, [type]: [] }));
      setShowSuggestions((prev) => ({ ...prev, [type]: false }));
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSuggestions((prev) => ({ ...prev, [type]: results }));
      setShowSuggestions((prev) => ({ ...prev, [type]: true }));
    }, 500);
  };

  const selectSuggestion = (type: 'pickup' | 'delivery', suggestion: GeocodeResult) => {
    form.setValue(
      type === 'pickup' ? 'pickupAddress.addressText' : 'deliveryAddress.addressText',
      suggestion.display_name
    );
    form.setValue(type === 'pickup' ? 'pickupAddress.coordinates' : 'deliveryAddress.coordinates', [
      parseFloat(suggestion.lon),
      parseFloat(suggestion.lat),
    ]);
    setShowSuggestions((prev) => ({ ...prev, [type]: false }));
  };

  // Browser Geolocation
  const useCurrentLocation = (type: 'pickup' | 'delivery') => {
    if (!navigator.geolocation) return;

    setIsGeocoding((prev) => ({ ...prev, [type]: true }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        handleMapSelect(type, coords);
      },
      () => {
        setIsGeocoding((prev) => ({ ...prev, [type]: false }));
      }
    );
  };

  // SUCCESS STATE UI
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-foreground">Order Dispatched!</h3>
        <p className="text-muted-foreground mb-8 max-w-xs text-sm">
          Order{' '}
          <span className="font-mono font-bold text-foreground">
            #{newOrderId?.slice(-6).toUpperCase()}
          </span>{' '}
          is now live. We are looking for a nearby rider.
        </p>
        <div className="flex gap-3 w-full">
          <Button
            onClick={() => onSuccess(newOrderId!)}
            className="flex-1 h-12 gap-2 text-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            Track on Map <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const url = `${window.location.origin}/track/${trackingToken}`;
              navigator.clipboard.writeText(url);
              toast.success('Public Link Copied!', {
                description: 'Send this to your customer.',
              });
            }}
            className="h-12 w-12 rounded-xl p-0 hover:bg-primary/5 hover:text-primary transition-all"
          >
            <Copy className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8 pb-10">
      {/* 1. ROUTE SECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Navigation className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm uppercase tracking-tight">Route & Locations</h4>
        </div>

        <MapPicker
          pickup={form.watch('pickupAddress.coordinates')}
          delivery={form.watch('deliveryAddress.coordinates')}
          onSelect={handleMapSelect}
        />

        <div className="grid grid-cols-1 gap-3 pt-2">
          {/* PICKUP ADDRESS */}
          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center px-1">
              <Label className="text-[11px] font-bold text-muted-foreground">PICKUP ADDRESS</Label>
              <button
                type="button"
                onClick={() => useCurrentLocation('pickup')}
                className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <LocateFixed className="w-3 h-3" /> Use My Location
              </button>
            </div>
            <div className="relative">
              <MapPin
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isGeocoding.pickup ? 'text-primary animate-pulse' : 'text-green-500'}`}
              />
              <Input
                value={form.watch('pickupAddress.addressText')}
                onChange={(e) => handleAddressInput('pickup', e.target.value)}
                onFocus={() =>
                  suggestions.pickup.length > 0 &&
                  setShowSuggestions((p) => ({ ...p, pickup: true }))
                }
                placeholder="Search or click map..."
                className="pl-9 pr-10"
              />
              {isGeocoding.pickup && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {showSuggestions.pickup && (
              <div className="absolute z-[1001] w-full mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                {suggestions.pickup.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSuggestion('pickup', s)}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors border-b border-border/40 last:border-0 flex items-start gap-2"
                  >
                    <Search className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DELIVERY ADDRESS */}
          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center px-1">
              <Label className="text-[11px] font-bold text-muted-foreground">
                DELIVERY ADDRESS
              </Label>
              <button
                type="button"
                onClick={() => useCurrentLocation('delivery')}
                className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <LocateFixed className="w-3 h-3" /> Use My Location
              </button>
            </div>
            <div className="relative">
              <MapPin
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isGeocoding.delivery ? 'text-primary animate-pulse' : 'text-red-500'}`}
              />
              <Input
                value={form.watch('deliveryAddress.addressText')}
                onChange={(e) => handleAddressInput('delivery', e.target.value)}
                onFocus={() =>
                  suggestions.delivery.length > 0 &&
                  setShowSuggestions((p) => ({ ...p, delivery: true }))
                }
                placeholder="Search or click map..."
                className="pl-9 pr-10"
              />
              {isGeocoding.delivery && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {showSuggestions.delivery && (
              <div className="absolute z-[1001] w-full mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                {suggestions.delivery.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSuggestion('delivery', s)}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors border-b border-border/40 last:border-0 flex items-start gap-2"
                  >
                    <Search className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. ITEM DETAILS */}
      <section className="space-y-4 bg-slate-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-border/40">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <div className="p-1.5 bg-slate-200 dark:bg-zinc-800 rounded-md">
            <Package className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm uppercase tracking-tight">Parcel Information</h4>
        </div>

        <Textarea
          {...form.register('itemDetails.description')}
          placeholder="What are you sending? (e.g. Electronics, Documents...)"
          className="h-24 bg-background resize-none focus:ring-1"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground ml-1">WEIGHT (KG)</Label>
            <Input
              type="number"
              {...form.register('itemDetails.weightKg', { valueAsNumber: true })}
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground ml-1">DIMENSIONS</Label>
            <Input
              {...form.register('itemDetails.dimensions')}
              placeholder="30x20x15 cm"
              className="bg-background"
            />
          </div>
        </div>
      </section>

      {/* 3. PRICING SECTION */}
      <section className="flex items-end gap-4 p-5 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[11px] font-bold text-primary ml-1">DELIVERY FEE (ETB)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
            <Input
              type="number"
              {...form.register('priceInfo.amount', { valueAsNumber: true })}
              className="pl-9 bg-background border-primary/20 focus:ring-primary font-bold text-lg"
            />
          </div>
        </div>
        <div className="w-[110px]">
          <Select onValueChange={(v) => form.setValue('priceInfo.currency', v)} defaultValue="ETB">
            <SelectTrigger className="bg-background border-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ETB">ETB</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <Button
        disabled={isLoading}
        className="w-full h-14 text-lg font-black shadow-xl shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
      >
        {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'DISPATCH DELIVERY'}
      </Button>
    </form>
  );
}
