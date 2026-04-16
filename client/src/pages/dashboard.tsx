import { useInventoryLogs, useProducts, useSales } from "@/hooks/use-inventory";
import { StatsCard } from "@/components/stats-card";
import { Package, AlertTriangle, IndianRupee, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: products } = useProducts();
  const { data: sales } = useSales();
  const { data: logs } = useInventoryLogs();

  // Metrics Calculation
  const totalProducts = products?.reduce((acc, p) => acc + p.quantity, 0) || 0;
  const lowStockCount = products?.filter(p => p.quantity < 10).length || 0;
  const totalRevenue = sales?.reduce((acc, s) => acc + s.totalPrice, 0) || 0;
  
  // Recent activity (logs)
  const recentLogs = logs?.slice(0, 5) || [];

  // Chart Data Preparation (Last 7 days sales)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySales = sales?.filter(s => s.timestamp && s.timestamp.toString().startsWith(dateStr));
    const total = daySales?.reduce((acc, s) => acc + s.totalPrice, 0) || 0;
    
    return {
      name: format(date, 'MMM dd'),
      total: total,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Real-time overview of your inventory system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Inventory" 
          value={totalProducts} 
          icon={Package}
          description="Items across all categories"
        />
        <StatsCard 
          title="Low Stock Alerts" 
          value={lowStockCount} 
          icon={AlertTriangle}
          description="Items requiring restock"
          className={lowStockCount > 0 ? "border-accent/50 bg-accent/5" : ""}
        />
        <StatsCard 
          title="Total Revenue" 
          value={`₹${totalRevenue.toLocaleString('en-IN')}`} 
          icon={IndianRupee}
          description="All time sales volume"
        />
        <StatsCard 
          title="System Activity" 
          value={logs?.length || 0} 
          icon={Activity}
          description="Total logged actions"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart Section */}
        <Card className="col-span-4 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs Section */}
        <Card className="col-span-3 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <div className={cn(
                    "w-2 h-2 mt-2 rounded-full",
                    log.action === "SALE" ? "bg-green-500" :
                    log.action === "RESTOCK" ? "bg-blue-500" :
                    "bg-amber-500"
                  )} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {log.action} - {log.entityType} #{log.entityId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {log.timestamp && format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <div className="ml-auto font-mono text-xs font-bold">
                    {log.changeAmount > 0 ? "+" : ""}{log.changeAmount}
                  </div>
                </div>
              ))}
              {recentLogs.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No activity recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
