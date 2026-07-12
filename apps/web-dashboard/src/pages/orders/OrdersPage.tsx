/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Package,
  Search,
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
  Star,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useFetchOrders } from '@/hooks/useFetchOrders';
import { useSocket } from '@/hooks/useSocket';
import { getApiUrl } from '@/lib/utils';
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

type ConfirmDialog = {
  open: boolean;
  title: string;
  description: string;
  icon: 'delete' | 'snatch';
  confirmLabel: string;
  onConfirm: () => void;
};

const DIALOG_CLOSED: ConfirmDialog = {
  open: false,
  title: '',
  description: '',
  icon: 'delete',
  confirmLabel: 'Confirm',
  onConfirm: () => {},
};

export default function OrdersPage() {
  const { orders, setOrders, isLoading } = useFetchOrders();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(DIALOG_CLOSED);

  const API_URL = getApiUrl();

  const execSnatch = async (orderId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/orders/${orderId}/snatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev: any[]) =>
          prev.map((o) => (o._id === orderId ? { ...o, ...updatedOrder } : o))
        );
        toast.success('Order snatched — reverted to Pending pool.');
      } else toast.error('Failed to snatch order.');
    } catch {
      toast.error('Internal error trying to snatch order.');
    }
  };

  const execDelete = async (orderId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOrders((prev: any[]) => prev.filter((o) => o._id !== orderId));
        toast.success('Order permanently deleted.');
      } else toast.error('Failed to delete order.');
    } catch {
      toast.error('Internal error trying to delete order.');
    }
  };

  const handleSnatchOrder = (orderId: string) => {
    setConfirmDialog({
      open: true,
      icon: 'snatch',
      title: 'Reassign Order',
      description:
        'This will unassign the order from the rider and push it back to the Pending pool. The rider will receive an immediate cancellation notification.',
      confirmLabel: 'Yes, Reassign',
      onConfirm: () => {
        setConfirmDialog(DIALOG_CLOSED);
        execSnatch(orderId);
      },
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    setConfirmDialog({
      open: true,
      icon: 'delete',
      title: 'Delete Order Permanently',
      description:
        'This action is irreversible. The order record, all associated socket events, and any pending financials will be erased from the system.',
      confirmLabel: 'Delete Forever',
      onConfirm: () => {
        setConfirmDialog(DIALOG_CLOSED);
        execDelete(orderId);
      },
    });
  };

  // ── 🔌 REAL-TIME SYNC ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Listen for Status Transitions
    socket.on('order_status_changed', (payload: any) => {
      setOrders((prev: any[]) =>
        prev.map((o) =>
          o._id === payload.orderId ? { ...o, ...payload.order, status: payload.status } : o
        )
      );
      toast.info(`Order #${payload.orderId.slice(-6).toUpperCase()} updated to ${payload.status}`);
    });

    // Listen for Image Upload Completion (POD)
    socket.on('order_photo_ready', (payload: any) => {
      setOrders((prev: any[]) =>
        prev.map((o) =>
          o._id === payload.orderId ? { ...o, podImageUrl: payload.podImageUrl } : o
        )
      );
      toast.success(
        `Success! Proof of Delivery uploaded for #${payload.orderId.slice(-6).toUpperCase()}`
      );
    });

    // 🌟 Listen for customer ratings
    socket.on('order_rated', (payload: any) => {
      setOrders((prev: any[]) =>
        prev.map((o) => (o._id === payload.orderId ? { ...o, customerRating: payload.rating } : o))
      );
      toast.info(
        `⭐ Order #${payload.orderId.slice(-6).toUpperCase()} received a ${payload.rating}-star rating!`
      );
    });

    return () => {
      socket.off('order_status_changed');
      socket.off('order_photo_ready');
      socket.off('order_rated');
    };
  }, [socket, setOrders]);

  const filteredOrders = orders?.filter((order: any) => {
    const matchesSearch =
      order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.deliveryAddress?.addressText || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.recipientName || order.customerName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

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
      o.customerName || o.recipientName || 'N/A',
      o.customerPhone || o.recipientPhone || 'N/A',
      (o.deliveryAddress?.addressText || 'N/A').replace(/,/g, ' '),
      o.itemDetails?.name || 'N/A',
      o.priceInfo?.amount || 0,
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
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-500 dark:border-purple-500/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
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
                              className="md:opacity-0 md:group-hover:opacity-100 opacity-100 p-1 hover:bg-primary/10 rounded transition-all"
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
                            <p className="font-bold text-foreground">
                              {order.customerName || order.recipientName || 'Customer'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {order.deliveryAddress.addressText}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black">
                          <div className="flex flex-col">
                            <span className="text-primary">
                              ETB{' '}
                              {(
                                (order.priceInfo?.itemPrice || 0) + (order.priceInfo?.amount || 0)
                              ).toLocaleString()}
                            </span>
                            {order.priceInfo?.itemPrice > 0 && (
                              <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                                Incl. Item Fee
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity gap-1 text-muted-foreground font-bold hover:bg-muted"
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
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
                                      <p className="text-[10px] font-black uppercase text-primary dark:text-primary-foreground/80 mb-1 tracking-widest">
                                        POD Code
                                      </p>
                                      <p className="font-mono font-black text-lg text-primary dark:text-white tracking-widest">
                                        {order.verificationCode}
                                      </p>
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

                                  {order.rider && (
                                    <div className="p-4 rounded-2xl bg-indigo-50/20 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 space-y-2">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5" /> Assigned Patrol Pilot /
                                        Rider
                                      </h4>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-black text-slate-800 dark:text-slate-200">
                                            {order.rider.fullName || 'Active Rider'}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            Operating live transport dispatch
                                          </p>
                                        </div>
                                        {order.rider.phoneNumber && (
                                          <a
                                            href={`tel:${order.rider.phoneNumber}`}
                                            className="h-8 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-extrabold text-[10.5px] uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center gap-1.5"
                                          >
                                            <Phone className="w-3 h-3" /> {order.rider.phoneNumber}
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <Separator className="opacity-40" />

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Recipient Info
                                      </h4>
                                      <div>
                                        <p className="font-bold text-sm text-foreground">
                                          {order.customerName || order.recipientName || 'Customer'}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                          <Phone className="w-3 h-3" />{' '}
                                          {order.customerPhone || order.recipientPhone || 'N/A'}
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

                                  {order.podImageUrl && (
                                    <div className="space-y-4">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Proof
                                        of Delivery (POD)
                                      </h4>
                                      <div className="relative group/pod">
                                        <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-hover/pod:blur-2xl transition-all opacity-20" />
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/20 bg-muted">
                                          <img
                                            src={order.podImageUrl}
                                            alt="Proof of Delivery"
                                            className="w-full h-auto aspect-[4/3] object-cover hover:scale-105 transition-transform duration-500"
                                          />
                                          <div className="absolute top-2 right-2 flex gap-1">
                                            <Badge
                                              variant="secondary"
                                              className="bg-emerald-500 text-white border-none shadow-lg font-black tracking-tighter"
                                            >
                                              Verified POD
                                            </Badge>
                                            {order.updatedAt && (
                                              <Badge
                                                variant="outline"
                                                className="bg-white/10 backdrop-blur-md text-white border-white/20 text-[9px] font-black uppercase tracking-widest"
                                              >
                                                {new Date(order.updatedAt).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {order.status === 'DELIVERED' &&
                                    (() => {
                                      const deliveryFee = order.priceInfo?.amount || 0;
                                      const itemPrice = order.priceInfo?.itemPrice || 0;
                                      const riderShare = 0.8;
                                      const computedRiderEarning = Math.floor(
                                        deliveryFee * riderShare
                                      );
                                      const computedMerchantProfit =
                                        Math.ceil(deliveryFee * (1 - riderShare)) + itemPrice;

                                      const merchantProfit =
                                        order.financeSnapshot?.merchantProfit ??
                                        computedMerchantProfit;
                                      const riderEarning =
                                        order.financeSnapshot?.riderEarning ?? computedRiderEarning;
                                      const rawMethod =
                                        order.financeSnapshot?.settlementMethod ||
                                        (order.paymentMethod === 'DIGITAL'
                                          ? 'DIGITAL_PAYMENT_DIRECT'
                                          : 'PHYSICAL_CASH_DEBT');
                                      const settlementMethod = String(rawMethod || 'UNKNOWN');

                                      return (
                                        <div className="p-6 rounded-2xl bg-card border border-border shadow-md overflow-hidden relative group/finance">
                                          {/* Decorative Background Element */}
                                          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl transition-all duration-500 group-hover/finance:scale-150 group-hover/finance:bg-primary/20" />

                                          <div className="relative">
                                            <div className="flex items-center justify-between mb-6">
                                              <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                  Digital Clearing House
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                  Settlement Snapshot
                                                </p>
                                              </div>
                                              <div
                                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                  settlementMethod === 'AUTO_DIGITAL_REBALANCE'
                                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                                    : settlementMethod === 'DIGITAL_PAYMENT_DIRECT'
                                                      ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400'
                                                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                }`}
                                              >
                                                {settlementMethod.replace(/_/g, ' ')}
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                                                  Merchant Profit
                                                </p>
                                                <p className="text-lg font-black text-foreground">
                                                  ETB {merchantProfit.toLocaleString()}
                                                </p>
                                              </div>
                                              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                                                  Rider Share
                                                </p>
                                                <p className="text-lg font-black text-foreground">
                                                  ETB {riderEarning.toLocaleString()}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 p-2 px-3 rounded-lg bg-muted/40 border border-border">
                                              <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                              <p className="text-[9px] text-muted-foreground font-medium">
                                                Funds successfully distributed and ledger
                                                synchronized.
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                  {order.status === 'DELIVERED' && (
                                    <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 flex items-center justify-between">
                                      <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
                                          Customer Rating
                                        </p>
                                        {order.customerRating ? (
                                          <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-0.5">
                                              {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                  key={s}
                                                  className={`w-4 h-4 ${s <= order.customerRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                                              {order.customerRating}/5
                                            </span>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground font-medium">
                                            Not yet rated
                                          </p>
                                        )}
                                      </div>
                                      <Star className="w-6 h-6 text-amber-300 dark:text-amber-500/40" />
                                    </div>
                                  )}

                                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center shadow-inner">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2.5 rounded-xl bg-primary/10">
                                        <Truck className="w-5 h-5 text-primary" />
                                      </div>
                                      <div>
                                        <span className="font-bold text-sm block">
                                          Total Collection
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                          Item + Delivery ({order.paymentMethod})
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-2xl font-black text-primary block">
                                        ETB{' '}
                                        {(
                                          (order.priceInfo?.itemPrice || 0) +
                                          (order.priceInfo?.amount || 0)
                                        ).toLocaleString()}
                                      </span>
                                      {order.priceInfo?.itemPrice > 0 && (
                                        <span className="text-[9px] text-muted-foreground font-bold italic">
                                          Item: {order.priceInfo.itemPrice} | Fee:{' '}
                                          {order.priceInfo.amount}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-3 pt-4 border-t border-dashed border-border/80">
                                    {['ACCEPTED', 'PICKED_UP'].includes(order.status) && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
                                        onClick={() => handleSnatchOrder(order._id)}
                                      >
                                        <ShieldAlert className="w-4 h-4" />
                                        Reassign Order
                                      </Button>
                                    )}

                                    {order.status !== 'DELIVERED' && (
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        className="w-full h-11 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all duration-200"
                                        onClick={() => handleDeleteOrder(order._id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Order
                                      </Button>
                                    )}
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

      {/* ── Professional Confirmation Modal ─────────────────────── */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDialog(DIALOG_CLOSED)}
          />
          {/* Card */}
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header stripe */}
            <div
              className={`h-1.5 w-full ${confirmDialog.icon === 'delete' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
            />

            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setConfirmDialog(DIALOG_CLOSED)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon + Title */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    confirmDialog.icon === 'delete'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}
                >
                  {confirmDialog.icon === 'delete' ? (
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {confirmDialog.description}
                  </p>
                </div>
              </div>

              {/* Warning chip */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold mb-5 ${
                  confirmDialog.icon === 'delete'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {confirmDialog.icon === 'delete'
                  ? 'This action cannot be undone.'
                  : 'The rider will be notified immediately.'}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(DIALOG_CLOSED)}
                  className="flex-1 h-10 rounded-xl border border-border bg-muted/50 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold text-white transition-all duration-150 flex items-center justify-center gap-2 ${
                    confirmDialog.icon === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 hover:shadow-red-500/30'
                      : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30'
                  }`}
                >
                  {confirmDialog.icon === 'delete' ? (
                    <Trash2 className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  )}
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
