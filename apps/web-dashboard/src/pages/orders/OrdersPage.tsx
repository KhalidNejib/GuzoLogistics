/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Copy,
  Eye,
  MapPin,
  Phone,
  Tag,
  Info,
  User,
  Truck,
  Download,
} from 'lucide-react';
import { useFetchOrders } from '@/hooks/useFetchOrders';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Separator,
  Badge,
} from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function OrdersPage() {
  const { orders, isLoading } = useFetchOrders();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredOrders = orders?.filter((order: any) => {
    const matchesSearch =
      order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deliveryAddress.addressText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.recipientName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    if (!orders || orders.length === 0) return;

    const headers = [
      'Order ID',
      'Status',
      'Recipient',
      'Phone',
      'Address',
      'Item',
      'Price',
      'Date',
    ];
    const rows = filteredOrders.map((o: any) => [
      o._id,
      o.status,
      o.recipientName,
      o.recipientPhone,
      o.deliveryAddress.addressText.replace(/,/g, ' '),
      o.itemDetails.name,
      o.priceInfo.amount,
      new Date(o.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ethio_logistics_orders_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report Downloaded', {
      description: 'Your order history has been exported to CSV.',
    });
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Order ID copied', {
      description: `ID: #${id.slice(-8).toUpperCase()}`,
      duration: 2000,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Order History
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage and review all your delivery requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="h-9 px-4 font-bold gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Badge variant="outline" className="px-3 py-1 font-bold">
            {orders?.length || 0} Total Orders
          </Badge>
        </div>
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, Name or Address..."
                className="pl-9 bg-background h-11 rounded-xl shadow-inner border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              {['ALL', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={`h-9 px-4 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all ${
                    statusFilter === status ? 'shadow-md shadow-primary/20' : ''
                  }`}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-muted/30 text-muted-foreground font-black tracking-widest border-b border-border/40">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading
                  ? [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Skeleton className="h-8 w-24 ml-auto" />
                        </td>
                      </tr>
                    ))
                  : filteredOrders?.map((order: any) => (
                      <tr key={order._id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                              #{order._id.slice(-8).toUpperCase()}
                            </span>
                            <button
                              onClick={() => copyToClipboard(order._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded transition-all"
                            >
                              <Copy className="h-3 w-3 text-primary" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}
                          >
                            {order.status === 'DELIVERED' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-foreground">{order.recipientName}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {order.deliveryAddress.addressText}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-primary">
                          ETB {order.priceInfo.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity gap-1 text-muted-foreground font-bold hover:bg-muted"
                                >
                                  <Eye className="h-3 w-3" /> Details
                                </Button>
                              </SheetTrigger>
                              <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                                <SheetHeader className="pb-6">
                                  <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                                    Order Details
                                    <span className="text-xs font-mono font-normal text-muted-foreground ml-2">
                                      #{order._id.toUpperCase()}
                                    </span>
                                  </SheetTitle>
                                  <SheetDescription>
                                    Detailed view of delivery request dispatched on{' '}
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </SheetDescription>
                                </SheetHeader>

                                <div className="space-y-8 pt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
                                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">
                                        Status
                                      </p>
                                      <Badge
                                        className={`${getStatusColor(order.status)} border-none shadow-none`}
                                      >
                                        {order.status}
                                      </Badge>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
                                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">
                                        Service Level
                                      </p>
                                      <p className="font-bold text-sm">Standard Delivery</p>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                      <MapPin className="w-3 h-3 text-primary" /> Delivery Routing
                                    </h4>
                                    <div className="relative pl-6 space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border before:dashed">
                                      <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 border-2 border-background" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Pickup Point
                                        </p>
                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                          {order.pickupAddress.addressText}
                                        </p>
                                      </div>
                                      <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-red-500 ring-4 ring-red-500/10 border-2 border-background" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Drop-off Destination
                                        </p>
                                        <p className="text-sm font-bold text-foreground mt-0.5">
                                          {order.deliveryAddress.addressText}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <Separator className="opacity-40" />

                                  <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Recipient Info
                                      </h4>
                                      <div>
                                        <p className="font-bold text-sm text-foreground">
                                          {order.recipientName}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                          <Phone className="w-3 h-3" /> {order.recipientPhone}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" /> Item Specs
                                      </h4>
                                      <div>
                                        <p className="font-bold text-sm text-foreground">
                                          {order.itemDetails.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {order.itemDetails.quantity} unit •{' '}
                                          {order.itemDetails.weight}kg
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center shadow-inner">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2.5 rounded-xl bg-primary/10">
                                        <Truck className="w-5 h-5 text-primary" />
                                      </div>
                                      <div>
                                        <span className="font-bold text-sm block">
                                          Delivery Fee
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                          Paid by Sender
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-2xl font-black text-primary">
                                      ETB {order.priceInfo.amount.toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="flex flex-col gap-3 pt-4">
                                    <div className="flex gap-3">
                                      <Button
                                        className="flex-1 font-bold h-12 shadow-xl shadow-primary/20 rounded-xl"
                                        onClick={() => navigate(`/tracking?orderId=${order._id}`)}
                                      >
                                        Track Live Delivery
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="h-12 w-12 rounded-xl p-0 hover:bg-primary/5 hover:text-primary transition-colors"
                                        onClick={() => {
                                          const url = `${window.location.origin}/track/${order.trackingUrlToken}`;
                                          navigator.clipboard.writeText(url);
                                          toast.success('Public Tracking Link Copied', {
                                            description:
                                              'You can now send this link to your customer.',
                                          });
                                        }}
                                      >
                                        <Copy className="w-5 h-5" />
                                      </Button>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="h-10 text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:bg-muted rounded-xl"
                                    >
                                      <Info className="w-3 h-3 mr-2" /> Need help with this order?
                                    </Button>
                                  </div>
                                </div>
                              </SheetContent>
                            </Sheet>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/tracking?orderId=${order._id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity gap-1 text-primary font-bold hover:bg-primary/5"
                            >
                              Track <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                {!isLoading && filteredOrders?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p className="text-lg font-bold">No orders found</p>
                      <p className="text-sm">Try adjusting your search terms or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
