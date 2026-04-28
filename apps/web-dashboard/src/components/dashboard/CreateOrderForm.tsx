/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderFormSchema, type CreateOrderInput } from '@/lib/orderSchema';
import { useCreateOrder } from '@/hooks/useCreateOrder';
import MapPicker from './MapPicker';
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
} from 'lucide-react';

export default function CreateOrderForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const { createOrder, isLoading, error } = useCreateOrder();
  const [isSuccess, setIsSuccess] = useState(false);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderFormSchema) as any,
    defaultValues: {
      pickupAddress: { addressText: '', coordinates: [38.7525, 9.0192] },
      deliveryAddress: { addressText: '', coordinates: [38.7525, 9.0192] },
      itemDetails: { description: '', weightKg: 1, dimensions: '' },
      priceInfo: { amount: 0, currency: 'ETB' },
    },
  });

  const onSubmit = async (data: CreateOrderInput) => {
    try {
      const result = await createOrder(data);
      if (result.orderId) {
        setNewOrderId(result.orderId);
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Dispatch Error:', err);
    }
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
        <Button
          onClick={() => onSuccess(newOrderId!)}
          className="w-full h-12 gap-2 text-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
        >
          Track Live on Map <ArrowRight className="w-4 h-4" />
        </Button>
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
          onSelect={(type, coords) => {
            form.setValue(
              type === 'pickup' ? 'pickupAddress.coordinates' : 'deliveryAddress.coordinates',
              coords
            );
          }}
        />

        <div className="grid grid-cols-1 gap-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground ml-1">
              PICKUP ADDRESS
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              <Input
                {...form.register('pickupAddress.addressText')}
                placeholder="e.g. Bole Road, Sunshine Bldg"
                className="pl-9"
              />
            </div>
            {form.formState.errors.pickupAddress?.addressText && (
              <p className="text-[10px] text-destructive ml-1">
                {form.formState.errors.pickupAddress.addressText.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground ml-1">
              DELIVERY ADDRESS
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              <Input
                {...form.register('deliveryAddress.addressText')}
                placeholder="e.g. Kazanchis, Intercontinental Hotel"
                className="pl-9"
              />
            </div>
            {form.formState.errors.deliveryAddress?.addressText && (
              <p className="text-[10px] text-destructive ml-1">
                {form.formState.errors.deliveryAddress.addressText.message}
              </p>
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
