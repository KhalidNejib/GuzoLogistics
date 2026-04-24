/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderFormSchema, type CreateOrderInput } from '@/lib/orderSchema';
import { useCreateOrder } from '@/hooks/useCreateOrder';
import MapPicker from './MapPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, MapPin, Navigation, DollarSign, Loader2 } from 'lucide-react';

export default function CreateOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const { createOrder, isLoading, error } = useCreateOrder();

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderFormSchema) as any,
    defaultValues: {
      pickupAddress: {
        addressText: '',
        coordinates: [38.7525, 9.0192],
      },
      deliveryAddress: {
        addressText: '',
        coordinates: [38.7525, 9.0192],
      },
      itemDetails: {
        description: '',
        weightKg: 1,
        dimensions: '',
      },
      priceInfo: {
        amount: 0,
        currency: 'ETB',
      },
    },
  });

  const onSubmit = async (data: CreateOrderInput) => {
    try {
      await createOrder(data);
      form.reset();
      onSuccess();
      alert('Order Created Successfully!');
    } catch (err) {
      console.error('Dispatch Error:', err);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 pb-10">
      {/* 1. Map Section */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Navigation className="w-3 h-3" /> Route Selection
        </Label>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Addresses */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" /> Pickup Address
            </Label>
            <Input
              {...form.register('pickupAddress.addressText')}
              placeholder="e.g. Bole Road, Sunshine Bldg"
            />
            {form.formState.errors.pickupAddress?.addressText && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.pickupAddress.addressText.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Delivery Address
            </Label>
            <Input
              {...form.register('deliveryAddress.addressText')}
              placeholder="e.g. Kazanchis, Intercontinental Hotel"
            />
            {form.formState.errors.deliveryAddress?.addressText && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.deliveryAddress.addressText.message}
              </p>
            )}
          </div>
        </div>

        {/* 3. Item Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" /> Item Description
            </Label>
            <Textarea
              {...form.register('itemDetails.description')}
              placeholder="Describe the items..."
              className="h-20"
            />
            {form.formState.errors.itemDetails?.description && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.itemDetails.description.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                {...form.register('itemDetails.weightKg', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dimensions</Label>
              <Input {...form.register('itemDetails.dimensions')} placeholder="e.g. 30x20x15" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Pricing */}
      <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Delivery Fee
          </Label>
          <div className="relative">
            <Input
              type="number"
              {...form.register('priceInfo.amount', { valueAsNumber: true })}
              className="pl-8"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              ETB
            </span>
          </div>
        </div>
        <div className="w-[100px] space-y-2">
          <Label>Currency</Label>
          <Select onValueChange={(v) => form.setValue('priceInfo.currency', v)} defaultValue="ETB">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ETB">ETB</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 text-md font-bold shadow-xl shadow-primary/20"
      >
        {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Dispatch Order Now'}
      </Button>
    </form>
  );
}
