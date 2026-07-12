import { format } from 'date-fns';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  CheckCircle2, 
  Clock, 
  XCircle,
  CreditCard,
  Banknote,
  Download
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui';

interface HistoryItem {
  _id: string;
  type?: 'REVENUE' | 'PAYOUT' | 'COMMISSION' | 'CASH_COLLECTED' | 'SETTLEMENT';
  amount: number;
  status: string;
  createdAt: string;
  description?: string;
  method?: string;
  paymentMethod?: string;
  referenceId?: string;
}

export default function FinanceHistoryTable({ transactions, payouts }: { transactions: any[], payouts: any[] }) {
  // Combine and sort by date
  const allItems = [
    ...transactions.map(t => ({ ...t, category: 'transaction' })),
    ...payouts.map(p => ({ ...p, category: 'payout', type: 'PAYOUT' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'PAID':
      case 'SUCCESS':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </div>
        );
      case 'PROCESSING':
      case 'PENDING':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black border border-amber-100">
            <Clock className="w-3 h-3 animate-pulse" /> PENDING
          </div>
        );
      case 'FAILED':
      case 'REJECTED':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-black border border-red-100">
            <XCircle className="w-3 h-3" /> FAILED
          </div>
        );
      default:
        return status;
    }
  };

  const getIcon = (item: any) => {
    if (item.category === 'payout') return <ArrowDownLeft className="w-4 h-4 text-red-500" />;
    if (item.type === 'REVENUE') return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
    if (item.type === 'SETTLEMENT') return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    if (item.type === 'CASH_COLLECTED') return <Banknote className="w-4 h-4 text-amber-500" />;
    return <History className="w-4 h-4 text-slate-400" />;
  };

  const getTypeLabel = (item: any) => {
    if (item.category === 'payout') return 'Withdrawal';
    if (item.type === 'CASH_COLLECTED') return 'Cash Collection';
    if (item.type === 'SETTLEMENT') return 'Repayment';
    if (item.type === 'REVENUE') return 'Revenue Earned';
    return item.type || 'Transaction';
  };

  const handleExportAuditLog = () => {
    // Build CSV headers
    const headers = ['Date', 'Time', 'Type', 'Description', 'Amount (ETB)', 'Direction', 'Method', 'Status', 'Reference ID'];
    
    const rows = allItems.map((item) => [
      format(new Date(item.createdAt), 'MMM dd, yyyy'),
      format(new Date(item.createdAt), 'hh:mm a'),
      getTypeLabel(item),
      item.description || (item.category === 'payout' ? `Bank Transfer to ${item.bankDetails?.bankName || 'Bank'}` : 'Order Settlement'),
      item.amount.toFixed(2),
      item.category === 'payout' ? 'DEBIT' : 'CREDIT',
      item.paymentMethod || item.method || 'Online',
      item.status || 'N/A',
      item.referenceId || `ID-${item._id.slice(-6)}`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ethio-logistics-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <History className="w-4 h-4" /> Settlement History
        </h3>
        <button 
          onClick={handleExportAuditLog}
          disabled={allItems.length === 0}
          className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-all hover:bg-blue-50"
        >
          <Download className="w-3 h-3" />
          Export Audit Log
        </button>
      </div>

      <div className="border border-border/40 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/50">
            <TableRow className="border-border/40">
              <TableHead className="text-[10px] font-black uppercase tracking-tighter">Event</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-tighter text-right">Amount</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-tighter">Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-tighter">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-tighter">Ref ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs font-bold uppercase italic">
                  No financial movements recorded yet
                </TableCell>
              </TableRow>
            ) : (
              allItems.map((item) => (
                <TableRow key={item._id} className="border-border/20 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800">
                        {getIcon(item)}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase leading-none">
                          {getTypeLabel(item)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 truncate max-w-[140px]">
                          {item.description || (item.category === 'payout' ? `Bank Transfer to ${item.bankDetails?.bankName}` : 'Order Settlement')}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className={`text-[11px] font-black ${item.category === 'payout' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {item.category === 'payout' ? '-' : '+'} ETB {item.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                       {item.paymentMethod === 'CASH' ? <Banknote className="w-2.5 h-2.5 text-amber-500" /> : <CreditCard className="w-2.5 h-2.5 text-blue-500" />}
                       <span className="text-[8px] font-bold text-slate-400 uppercase">{item.paymentMethod || item.method || 'Online'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {format(new Date(item.createdAt), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400">
                      {format(new Date(item.createdAt), 'hh:mm a')}
                    </p>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                   <TableCell>
                    <p className="text-[9px] font-mono text-slate-400 uppercase">
                       {item.referenceId || `ID-${item._id.slice(-6)}`}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
