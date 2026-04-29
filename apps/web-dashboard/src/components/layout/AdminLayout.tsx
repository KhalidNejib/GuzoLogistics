/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  Settings,
  Map,
  LogOut,
  ChevronRight,
  User,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { UserButton, useUser, useClerk } from '@clerk/clerk-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button, Badge, Separator } from '@/components/ui';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Orders', icon: Package, path: '/orders' },
  { name: 'Live Tracking', icon: Map, path: '/tracking' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { socket } = useSocket();
  const [isDark, setIsDark] = React.useState(() => localStorage.getItem('theme') === 'dark');
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);

  // Theme Logic
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Real-time Notifications Logic
  React.useEffect(() => {
    if (!socket) return;

    const handleStatusChange = (data: { orderId: string; status: string }) => {
      const newNotif = {
        id: Date.now(),
        title: `Order Status: ${data.status}`,
        description: `Order #${data.orderId.slice(-6).toUpperCase()} has been ${data.status.toLowerCase()}.`,
        time: 'Just now',
        type: data.status === 'DELIVERED' ? 'success' : 'info',
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 5));
      toast.info(newNotif.title, { description: newNotif.description });
    };

    socket.on('order_status_changed', handleStatusChange);
    return () => {
      socket.off('order_status_changed', handleStatusChange);
    };
  }, [socket]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950/50 overflow-hidden text-foreground transition-colors duration-300">
        <Sidebar collapsible="icon" className="border-r border-border/10">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/40">
            <div className="flex items-center gap-3 font-bold text-xl text-primary">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                <Truck size={20} />
              </div>
              <span className="truncate group-data-[state=collapsed]:hidden font-bold">
                Ethio Logistics
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="py-4 px-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.name} className="px-1">
                  <NavLink to={item.path} className="block w-full">
                    {({ isActive }) => (
                      <SidebarMenuButton
                        tooltip={item.name}
                        isActive={isActive}
                        className={`h-11 transition-all duration-200 rounded-lg ${
                          isActive
                            ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary rounded-l-none'
                            : 'hover:bg-primary/5 text-muted-foreground'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 min-w-[20px] ${isActive ? 'text-primary' : ''}`}
                        />
                        <span className="ml-1 group-data-[state=collapsed]:hidden">
                          {item.name}
                        </span>
                        <ChevronRight
                          className={`ml-auto h-4 w-4 transition-all group-data-[state=collapsed]:hidden ${isActive ? 'opacity-100 rotate-90' : 'opacity-0'}`}
                        />
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-border/40 p-3">
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive hover:bg-destructive/5 group-data-[state=collapsed]:justify-center transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="group-data-[state=collapsed]:hidden font-medium">Logout</span>
            </Button>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-20 shadow-sm/5">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 hover:bg-primary/10 text-primary transition-colors" />
              <div className="h-6 w-px bg-border/50" />
              <h1 className="text-sm font-bold text-foreground">Merchant Hub</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDark(!isDark)}
                className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-80 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border/40 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                      <h4 className="font-bold text-sm">Notifications</h4>
                      <Badge variant="outline" className="text-[10px] font-black">
                        {notifications.length}
                      </Badge>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                          <p className="text-xs text-muted-foreground font-medium">
                            No new notifications
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-4 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0 flex gap-3"
                          >
                            <div
                              className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                n.type === 'success'
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              {n.type === 'success' ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <Clock size={16} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{n.title}</p>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                                {n.description}
                              </p>
                              <p className="text-[9px] font-black text-primary/60 uppercase mt-1.5">
                                {n.time}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        className="w-full p-3 text-[10px] font-black uppercase text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-t border-border/40"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="h-8 w-px bg-border/50" />

              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-foreground leading-none">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-[11px] text-primary font-bold mt-1 uppercase tracking-tight">
                    Verified Merchant
                  </p>
                </div>
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-zinc-950/40 p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
