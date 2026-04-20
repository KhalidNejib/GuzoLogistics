import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Package, Clock, ShieldCheck } from 'lucide-react';

function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, Khalid</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your deliveries today.
          </p>
        </div>
        <Button className="font-semibold shadow-lg shadow-primary/20">
          <Package className="mr-2 h-4 w-4" /> Dispatch New Order
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Orders', value: '1,284', icon: Package, trend: '+12.5%' },
          { title: 'Active Deliveries', value: '24', icon: Clock, trend: 'In Progress' },
          { title: 'Completed Today', value: '48', icon: ShieldCheck, trend: '+5.2%' },
          { title: 'Revenue', value: '$12,450', icon: TrendingUp, trend: '+18.4%' },
        ].map((stat) => (
          <Card
            key={stat.title}
            className="border-border/40 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">{stat.trend}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border/40 rounded-lg text-muted-foreground">
            Live Tracking Map Placeholder (Coming Day 10)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  return (
    <AdminLayout>
      <Dashboard />
    </AdminLayout>
  );
}

export default App;
