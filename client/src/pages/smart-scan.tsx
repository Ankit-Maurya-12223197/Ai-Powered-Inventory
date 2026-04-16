import { useState, useEffect, useRef } from "react";
import { useVisionLogs, useVisionAnomalies } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScanLine, Box, Ruler, Palette, Activity, Camera, AlertTriangle,
  RefreshCcw, CameraOff, Loader2, CheckCircle2, XCircle, Sparkles,
  Tag, PackageCheck, PackageX, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BoundingBox {
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
}

interface ScanResult {
  product_id: number | null;
  product_name: string;
  sku: string;
  object_name: string;
  confidence: number;
  status: string;
  bounding_box: BoundingBox;
  color?: string;
  texture?: string;
  brand?: string | null;
  dimensions_estimate?: string;
  category?: string;
  notes?: string | null;
  in_inventory: boolean;
  timestamp: string;
}

export default function SmartScan() {
  const { data: visionLogs, refetch: refetchLogs } = useVisionLogs();
  const { data: anomalies } = useVisionAnomalies();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [notDetected, setNotDetected] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanResult(null);
      setNotDetected(false);
      setScanError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch {
      setCameraError("Camera access denied or not available on this device.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setScanResult(null);
    setNotDetected(false);
    setScanError(null);
  };

  const triggerScan = async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;

    setScanning(true);
    setScanResult(null);
    setNotDetected(false);
    setScanError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setScanning(false); return; }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) { setScanning(false); return; }
      try {
        const formData = new FormData();
        formData.append("image", blob, "scan.jpg");

        const res = await fetch("/api/vision/scan", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setScanError(data.error || "Scan failed. Please try again.");
        } else if (!data.detected) {
          setNotDetected(true);
        } else {
          setScanResult(data.data);
          refetchLogs();
        }
      } catch {
        setScanError("Network error. Please check your connection and try again.");
      } finally {
        setScanning(false);
      }
    }, "image/jpeg", 0.85);
  };

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const statusColor = (s: string) =>
    s === "OK" ? "bg-green-500" : s === "DAMAGED" ? "bg-red-500" : "bg-amber-500";

  const statusBadge = (s: string) => {
    if (s === "OK") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">OK</Badge>;
    if (s === "DAMAGED") return <Badge variant="destructive">Damaged</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Non-Standard</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Vision Scan</h2>
          <p className="text-muted-foreground mt-1">
            Point your camera at any inventory item and click Scan to identify it with AI.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isCameraActive ? (
            <Button onClick={startCamera} data-testid="button-start-camera">
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                onClick={triggerScan}
                disabled={scanning}
                data-testid="button-trigger-scan"
              >
                {scanning ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing…</>
                ) : (
                  <><ScanLine className="w-4 h-4 mr-2" />Scan Now</>
                )}
              </Button>
              <Button onClick={stopCamera} variant="outline" data-testid="button-stop-camera">
                <CameraOff className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border">
            <div className={cn("w-2 h-2 rounded-full", isCameraActive ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse")} />
            <span className="text-sm font-medium">{isCameraActive ? "Live" : "Ready"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera / Vision Feed */}
        <Card className="lg:col-span-2 border-border shadow-lg relative overflow-hidden bg-zinc-950 dark:bg-black text-white"
          style={{ height: "420px" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />

          {/* Live video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300",
              isCameraActive ? "opacity-100" : "opacity-0"
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay layer */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Scan line animation */}
            {isCameraActive && !scanning && (
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-green-500/60 shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Scanning shimmer */}
            {scanning && (
              <motion.div
                className="absolute inset-0 bg-green-500/10"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}

            {/* Status chip */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
              <div className={cn("w-2 h-2 rounded-full", isCameraActive ? "bg-red-500 animate-pulse" : "bg-gray-500")} />
              <span className="text-xs font-mono">{scanning ? "ANALYSING" : isCameraActive ? "LIVE" : "OFFLINE"}</span>
            </div>

            {/* Corner guides */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 border border-white/10">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500/60" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500/60" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500/60" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500/60" />
            </div>

            {/* AI bounding box overlay (percentage-based) */}
            <AnimatePresence>
              {scanResult?.bounding_box && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute border-2 border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]"
                  style={{
                    left: `${scanResult.bounding_box.x_pct}%`,
                    top: `${scanResult.bounding_box.y_pct}%`,
                    width: `${scanResult.bounding_box.w_pct}%`,
                    height: `${scanResult.bounding_box.h_pct}%`,
                  }}
                >
                  <div className={cn(
                    "absolute -top-6 left-0 text-[10px] px-2 py-0.5 rounded font-mono whitespace-nowrap",
                    scanResult.status === "OK" ? "bg-green-500 text-white" :
                    scanResult.status === "DAMAGED" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {scanResult.sku} · {(scanResult.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-300" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-300" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-300" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* No camera state */}
          {!isCameraActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center gap-3">
              {cameraError ? (
                <>
                  <CameraOff className="w-14 h-14 text-red-400 opacity-80" />
                  <p className="text-red-400 font-mono text-sm">Camera Access Failed</p>
                  <p className="text-zinc-500 text-xs max-w-[220px]">{cameraError}</p>
                  <Button onClick={startCamera} variant="outline" className="mt-2 border-zinc-600 text-zinc-300" data-testid="button-retry-camera">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </>
              ) : (
                <>
                  <Sparkles className="w-14 h-14 text-green-500 opacity-70" />
                  <p className="text-zinc-300 font-mono text-sm">AI Vision Engine Ready</p>
                  <p className="text-zinc-500 text-xs">Click "Start Camera" to begin scanning</p>
                </>
              )}
            </div>
          )}

          {/* Camera active, no scan yet */}
          {isCameraActive && !scanResult && !scanning && !notDetected && !scanError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-2 text-xs text-zinc-300 font-mono text-center">
                Point at an item → Click "Scan Now"
              </div>
            </div>
          )}

          {/* Scanning overlay */}
          {scanning && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm border border-green-500/40 rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                <span className="text-xs text-green-300 font-mono">AI analysing image…</span>
              </div>
            </div>
          )}

          {/* Not detected */}
          {notDetected && (
            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm border border-amber-500/40 rounded-lg px-4 py-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-amber-300 font-mono font-semibold">No item recognised</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Try holding the item closer in better light</p>
                </div>
              </div>
            </div>
          )}

          {/* Scan error */}
          {scanError && (
            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm border border-red-500/40 rounded-lg px-4 py-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-xs text-red-300 font-mono">{scanError}</p>
              </div>
            </div>
          )}

          {/* Scan success badge */}
          {scanResult && (
            <div className="absolute bottom-4 left-4 z-20 bg-black/85 backdrop-blur-sm border border-green-500/40 rounded-lg p-3 max-w-[280px]">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] text-green-400 font-mono font-semibold">DETECTED</span>
                {scanResult.in_inventory ? (
                  <span className="text-[10px] text-blue-400 font-mono ml-auto">IN INVENTORY</span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-mono ml-auto">NOT IN CATALOG</span>
                )}
              </div>
              <div className="text-base font-bold text-white leading-tight">{scanResult.object_name}</div>
              {scanResult.brand && (
                <div className="text-[11px] text-zinc-300 mt-0.5">Brand: {scanResult.brand}</div>
              )}
              <div className="text-[11px] text-zinc-400 font-mono">{scanResult.sku}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {statusBadge(scanResult.status)}
                {scanResult.category && (
                  <Badge variant="outline" className="text-[10px] text-zinc-300 border-zinc-600">{scanResult.category}</Badge>
                )}
                <span className="text-xs text-zinc-400 font-mono">
                  {(scanResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Last scan details */}
          {scanResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Scan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Inventory status */}
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/30">
                  {scanResult.in_inventory ? (
                    <><PackageCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Found in your inventory</span></>
                  ) : (
                    <><PackageX className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Not in catalog — new item</span></>
                  )}
                </div>

                {scanResult.category && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-xs">Category</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{scanResult.category}</Badge>
                  </div>
                )}
                {scanResult.brand && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="w-3.5 h-3.5" />
                      <span className="text-xs">Brand</span>
                    </div>
                    <span className="text-xs font-medium">{scanResult.brand}</span>
                  </div>
                )}
                {scanResult.color && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Palette className="w-3.5 h-3.5" />
                      <span className="text-xs">Color</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium capitalize">{scanResult.color}</span>
                    </div>
                  </div>
                )}
                {scanResult.texture && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Box className="w-3.5 h-3.5" />
                      <span className="text-xs">Material</span>
                    </div>
                    <span className="text-xs font-medium capitalize">{scanResult.texture}</span>
                  </div>
                )}
                {scanResult.dimensions_estimate && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Ruler className="w-3.5 h-3.5" />
                      <span className="text-xs">Dimensions</span>
                    </div>
                    <span className="text-xs font-mono font-medium">{scanResult.dimensions_estimate}</span>
                  </div>
                )}
                {scanResult.notes && (
                  <div className="pt-1 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed">{scanResult.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Anomalies */}
          {anomalies && anomalies.length > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  Anomalies Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {anomalies.slice(0, 3).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{log.sku}</span>
                      <Badge variant="destructive" className="text-xs">{log.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Scan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px]">
                <div className="space-y-1.5">
                  {visionLogs && visionLogs.length > 0 ? (
                    visionLogs.slice(0, 15).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0"
                        data-testid={`scan-log-${log.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", statusColor(log.status))} />
                          <span className="font-mono text-xs truncate">{log.sku}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {log.confidenceScore != null && (
                            <span className="text-[10px] text-muted-foreground">
                              {(log.confidenceScore * 100).toFixed(0)}%
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(log.timestamp), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-6">
                      No scan history yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
