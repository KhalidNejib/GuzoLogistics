/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  Settings,
  Map,
  LogOut,
  ChevronRight,
  User,
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
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Orders', icon: Package, path: '/orders' },
  { name: 'Riders', icon: Truck, path: '/riders' },
  { name: 'Live Tracking', icon: Map, path: '/tracking' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '??';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950/50 overflow-hidden">
        <Sidebar collapsible="icon" className="border-r border-border/10">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/40">
            <div className="flex items-center gap-3 font-bold text-xl text-primary">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                <Truck size={20} />
              </div>
              <span className="truncate transition-all duration-300 group-data-[state=collapsed]:hidden animate-in fade-in slide-in-from-left-4">
                Ethio Logistics
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="py-2 px-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.name} className="px-1">
                  <SidebarMenuButton
                    tooltip={item.name}
                    className="h-11 hover:bg-primary/5 active:bg-primary/10 transition-all duration-200 rounded-lg group-data-[state=collapsed]:justify-center"
                  >
                    <item.icon className="h-5 w-5 min-w-[20px] text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm text-foreground/80 group-hover:text-foreground group-data-[state=collapsed]:hidden ml-1">
                      {item.name}
                    </span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-data-[state=collapsed]:hidden" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-border/40 p-3">
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0"
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
              <div className="p-1 rounded-md bg-muted/50 border border-border/20 shadow-inner">
                <SidebarTrigger className="h-8 w-8 hover:bg-primary/10 text-primary transition-colors" />
              </div>
              <div className="h-6 w-px bg-border/50" />
              <div className="flex flex-col justify-center">
                <h1 className="text-sm font-bold text-foreground leading-tight">Merchant Hub</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right mr-1 hidden md:block">
                <p className="text-sm font-bold text-foreground leading-none">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-[11px] text-primary/80 font-bold mt-1 uppercase tracking-tighter">
                  Status: Verified
                </p>
              </div>
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      'h-10 w-10 border-2 border-white shadow-sm ring-1 ring-border/40',
                  },
                }}
              />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/40 dark:bg-zinc-950/40">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
