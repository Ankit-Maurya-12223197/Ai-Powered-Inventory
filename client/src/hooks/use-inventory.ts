import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertMaterial, type InsertProduct, type InsertSale } from "@shared/schema";

// ==========================================
// MATERIALS
// ==========================================

export function useMaterials() {
  return useQuery({
    queryKey: [api.materials.list.path],
    queryFn: async () => {
      const res = await fetch(api.materials.list.path);
      if (!res.ok) throw new Error("Failed to fetch materials");
      return api.materials.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMaterial) => {
      const res = await fetch(api.materials.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create material");
      return api.materials.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.materials.list.path] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertMaterial>) => {
      const url = buildUrl(api.materials.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update material");
      return api.materials.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.materials.list.path] });
    },
  });
}

// ==========================================
// PRODUCTS
// ==========================================

export function useProducts() {
  return useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path);
      if (!res.ok) throw new Error("Failed to fetch products");
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertProduct) => {
      const res = await fetch(api.products.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create product");
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertProduct>) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

// ==========================================
// SALES
// ==========================================

export function useSales() {
  return useQuery({
    queryKey: [api.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.sales.list.path);
      if (!res.ok) throw new Error("Failed to fetch sales");
      return api.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSale) => {
      const res = await fetch(api.sales.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to record sale");
      return api.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] }); // Quantity changes
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] }); // Logs added
    },
  });
}

// ==========================================
// LOGS
// ==========================================

export function useInventoryLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
  });
}

// ==========================================
// VISION ENGINE / SCANNING
// ==========================================

export function useLatestScan() {
  return useQuery({
    queryKey: ["latest-scan"],
    queryFn: async () => {
      const res = await fetch(api.products.list.path);
      if (!res.ok) throw new Error("Failed to fetch scan data");
      const products = api.products.list.responses[200].parse(await res.json());
      
      const scannedProducts = products.filter(p => p.lastScannedAt);
      if (scannedProducts.length === 0) return null;
      
      return scannedProducts.sort((a, b) => {
        return new Date(b.lastScannedAt!).getTime() - new Date(a.lastScannedAt!).getTime();
      })[0];
    },
    refetchInterval: 2000,
  });
}

// ==========================================
// FORECASTING / AI ANALYTICS
// ==========================================

export interface ForecastPrediction {
  day: number;
  date: string;
  predicted_demand: number;
  predicted_stock: number;
}

export interface ProductForecast {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  predictions: ForecastPrediction[];
  total_predicted_demand: number;
  needs_reorder: boolean;
}

export function useForecast() {
  return useQuery({
    queryKey: ["/api/analytics/forecast"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/forecast");
      if (!res.ok) throw new Error("Failed to fetch forecast");
      const data = await res.json();
      return data.data as ProductForecast[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// ==========================================
// VISION STATUS LOGS
// ==========================================

export interface VisionStatusLog {
  id: number;
  timestamp: string;
  productId: number;
  sku: string;
  status: string;
  confidenceScore: number | null;
  detectedClass: string | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  notes: string | null;
}

export function useVisionLogs() {
  return useQuery({
    queryKey: ["/api/vision/status-logs"],
    queryFn: async () => {
      const res = await fetch("/api/vision/status-logs");
      if (!res.ok) throw new Error("Failed to fetch vision logs");
      const data = await res.json();
      return data.data as VisionStatusLog[];
    },
    refetchInterval: 5000,
  });
}

export function useVisionAnomalies() {
  return useQuery({
    queryKey: ["/api/vision/anomalies"],
    queryFn: async () => {
      const res = await fetch("/api/vision/anomalies");
      if (!res.ok) throw new Error("Failed to fetch anomalies");
      const data = await res.json();
      return data.data as VisionStatusLog[];
    },
    refetchInterval: 10000,
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vision/scan", { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision/status-logs"] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useReorderProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity?: number }) => {
      const res = await fetch(`/api/products/${id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: quantity || 50 })
      });
      if (!res.ok) throw new Error("Reorder failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/forecast"] });
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
    },
  });
}
