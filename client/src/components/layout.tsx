import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Container, 
  ScanLine, 
  IndianRupee, 
  Menu,
  Hexagon,
  TrendingUp,
  X,
  Activity,
  Cpu,
  Database,
  Globe,
  ShieldCheck,
  Info
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AiChatbot } from "@/components/ai-chatbot";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/materials", label: "Materials", icon: Container },
  { href: "/scan", label: "Smart Scan", icon: ScanLine },
  { href: "/sales", label: "Sales", icon: IndianRupee },
  { href: "/analytics", label: "AI Analytics", icon: TrendingUp },
];

const pageLabels: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products Inventory",
  "/materials": "Raw Materials",
  "/scan": "Smart Scan",
  "/sales": "Sales Records",
  "/analytics": "Predictive Analytics",
};

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const currentPage = pageLabels[location] || "AssetFlow";

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Hexagon className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">AssetFlow</h1>
            <span className="text-xs text-muted-foreground font-mono">v2.4.0-IND</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground mb-4 px-2 uppercase tracking-wider">
          System Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-sidebar-foreground">System Online</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Vision Engine: Connected<br/>
            DB Latency: 24ms
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed h-full z-30">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* AssetFlow Info Drawer */}
      <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Hexagon className="w-5 h-5 text-primary" />
              </div>
              AssetFlow IND
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Version Info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version</p>
              <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-sm font-mono">v2.4.0-IND</span>
                <Badge variant="secondary" className="text-[10px]">Stable</Badge>
              </div>
            </div>

            {/* System Status */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Status</p>
              <div className="space-y-2">
                {[
                  { icon: Cpu, label: "AI Engine", status: "Online", color: "bg-green-500" },
                  { icon: Database, label: "PostgreSQL DB", status: "Connected", color: "bg-green-500" },
                  { icon: Activity, label: "Vision Engine", status: "Active", color: "bg-green-500" },
                  { icon: Globe, label: "Forecast API", status: "Running", color: "bg-green-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", item.color)} />
                      <span className="text-xs text-muted-foreground">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Region */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region & Currency</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Region</p>
                  <p className="text-sm font-medium">India 🇮🇳</p>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Currency</p>
                  <p className="text-sm font-medium">₹ INR</p>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">GST</p>
                  <p className="text-sm font-medium">Enabled</p>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">Locale</p>
                  <p className="text-sm font-medium">en-IN</p>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About</p>
              <div className="bg-muted/30 rounded-lg px-3 py-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AssetFlow is an AI-powered inventory and asset management system built for Indian artisan businesses. It uses computer vision, ML forecasting, and natural language querying.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 ease-in-out">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="ml-3 font-semibold">AssetFlow</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto"
            onClick={() => setIsInfoOpen(true)}
          >
            <Info className="w-5 h-5" />
          </Button>
        </header>

        {/* Desktop Top Header */}
        <header className="hidden md:flex h-14 border-b border-border/60 bg-card/60 backdrop-blur-sm items-center px-8 sticky top-0 z-20">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{currentPage}</p>
          </div>
          <button
            onClick={() => setIsInfoOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
            data-testid="button-assetflow-info"
          >
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
              <Hexagon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">AssetFlow</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">IND</span>
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>

      {/* Floating AI Chatbot */}
      <AiChatbot />
    </div>
  );
}
