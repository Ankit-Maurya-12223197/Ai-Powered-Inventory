import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "./db";
import { conversations, messages, visionStatusLogs, products, sales, materials, inventoryLogs, type Product, type Material, type Sale } from "@shared/schema-sqlite";
import { eq, desc, sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const chatModel =
  process.env.AI_INTEGRATIONS_CHAT_MODEL || "gpt-4o-mini";
const visionModel =
  process.env.AI_INTEGRATIONS_VISION_MODEL || chatModel;

type VisionScanResult = {
  detected: boolean;
  object_name: string;
  catalog_match: boolean;
  sku: string | null;
  confidence: number;
  status: string;
  bounding_box: { x_pct: number; y_pct: number; w_pct: number; h_pct: number };
  color: string;
  texture: string;
  brand: string | null;
  dimensions_estimate: string;
  category: string;
  notes: string | null;
};

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function parseVisionScanResult(content: unknown): VisionScanResult | null {
  const rawText = extractMessageText(content).trim();
  if (!rawText) return null;

  const normalized = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const candidates = [normalized];
  const jsonMatch = normalized.match(/\{[\s\S]*\}/);
  if (jsonMatch) candidates.push(jsonMatch[0]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as VisionScanResult;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Root endpoint
  app.get('/api/status', (req, res) => {
    res.json({ 
      message: 'Asset Verifier System API is running',
      version: '1.0.0',
      status: 'healthy'
    });
  });

  // Materials
  app.get(api.materials.list.path, async (req, res) => {
    const materials = await storage.getMaterials();
    res.json(materials);
  });

  app.get(api.materials.get.path, async (req, res) => {
    const material = await storage.getMaterial(Number(req.params.id));
    if (!material) return res.status(404).json({ message: "Material not found" });
    res.json(material);
  });

  app.post(api.materials.create.path, async (req, res) => {
    try {
      const input = api.materials.create.input.parse(req.body);
      const material = await storage.createMaterial(input);
      res.status(201).json(material);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.materials.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getMaterial(id);
    if (!existing) return res.status(404).json({ message: "Material not found" });
    
    const input = api.materials.update.input.parse(req.body);
    const updated = await storage.updateMaterial(id, input);
    res.json(updated);
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getProduct(id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const input = api.products.update.input.parse(req.body);
    const updated = await storage.updateProduct(id, input);
    res.json(updated);
  });

  // Vision Engine Scan Endpoint
  app.post(api.scan.process.path, async (req, res) => {
    try {
      const input = api.scan.process.input.parse(req.body);
      
      const product = await storage.getProductBySku(input.sku);
      if (!product) {
        return res.status(404).json({ message: `Product with SKU ${input.sku} not found` });
      }

      // Update product with scanned details
      const updated = await storage.updateProduct(product.id, {
        detectedColor: input.detectedColor,
        detectedTexture: input.detectedTexture,
        detectedDimensions: input.detectedDimensions,
      });
      
      // Log the scan
      await storage.logAction("SCAN", "PRODUCT", product.id, 0, "Vision Engine Scan");

      res.json({ message: "Scan processed successfully", product: updated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Sales
  app.get(api.sales.list.path, async (req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.post(api.sales.create.path, async (req, res) => {
    try {
      const input = api.sales.create.input.parse(req.body);
      const sale = await storage.createSale(input);
      res.status(201).json(sale);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Logs
  app.get(api.logs.list.path, async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  // AI Chatbot - Natural Language to SQL
  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get schema context
      const productsList = await db.select().from(products);
      const materialsList = await db.select().from(materials);
      const salesList = await db.select().from(sales).orderBy(desc(sales.timestamp)).limit(50);
      
      const schemaContext = `
        Database Schema:
        - products: id, name, sku, description, quantity (current stock), price, predicted_stock, predicted_demand
        - materials: id, name, sku, quantity, unit, cost_per_unit, min_stock_level
        - sales: id, product_id, quantity, total_price, timestamp
        - inventory_logs: id, timestamp, action, entity_type, entity_id, change_amount, description
        
        Current Data Summary:
        - Total Products: ${productsList.length}
        - Products: ${productsList.map((p: Product) => `${p.name} (SKU: ${p.sku}, Stock: ${p.quantity}, Price: ₹${p.price})`).join(', ')}
        - Total Materials: ${materialsList.length}
        - Materials: ${materialsList.map((m: Material) => `${m.name} (Stock: ${m.quantity} ${m.unit})`).join(', ')}
        - Recent Sales: ${salesList.length} records
      `;

      const systemPrompt = `You are an AI assistant for an Inventory Management System. You help users query inventory data using natural language.
      
${schemaContext}

When asked about:
- "Which raw materials should I buy today" - Check materials with low stock (below min_stock_level) and products with high predicted_demand
- "Low stock items" - List products/materials with quantity below thresholds
- "Sales analysis" - Analyze recent sales data
- "Predictions" - Use predicted_stock and predicted_demand fields
- "Reorder suggestions" - Products where predicted_demand > current quantity

Provide clear, concise answers with specific numbers and recommendations. Format currency in ₹ (Indian Rupees).`;

      const response = await openai.chat.completions.create({
        model: chatModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1024,
      });

      const aiResponse = response.choices[0]?.message?.content || "I couldn't process your request.";
      
      res.json({ 
        success: true, 
        response: aiResponse,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI Chat error:', error);
      res.status(500).json({ error: 'Failed to process AI request' });
    }
  });

  // Forecast API (proxies to Python service or handles inline)
  app.get('/api/analytics/forecast', async (req, res) => {
    try {
      const productsList = await db.select().from(products);
      const salesData = await db.select().from(sales).orderBy(desc(sales.timestamp));
      
      const forecasts = productsList.map((product: Product) => {
        // Simple forecasting based on recent sales
        const productSales = salesData.filter((s: Sale) => s.productId === product.id);
        const totalSold = productSales.reduce((sum: number, s: Sale) => sum + s.quantity, 0);
        const avgDailySales = productSales.length > 0 ? totalSold / Math.max(7, productSales.length) : 1;
        
        const predictions = [];
        let stock = product.quantity;
        
        for (let day = 1; day <= 7; day++) {
          const predictedDemand = Math.ceil(avgDailySales);
          stock = Math.max(0, stock - predictedDemand);
          predictions.push({
            day,
            date: new Date(Date.now() + day * 86400000).toISOString().split('T')[0],
            predicted_demand: predictedDemand,
            predicted_stock: stock
          });
        }

        const totalDemand = predictions.reduce((sum, p) => sum + p.predicted_demand, 0);
        const needsReorder = predictions[6].predicted_stock < 5;

        return {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          current_stock: product.quantity,
          predictions,
          total_predicted_demand: totalDemand,
          needs_reorder: needsReorder
        };
      });

      res.json({ success: true, data: forecasts, generated_at: new Date().toISOString() });
    } catch (error) {
      console.error('Forecast error:', error);
      res.status(500).json({ error: 'Failed to generate forecast' });
    }
  });

  // Vision Status Logs
  app.get('/api/vision/status-logs', async (req, res) => {
    try {
      const logs = await db.select().from(visionStatusLogs).orderBy(desc(visionStatusLogs.timestamp)).limit(50);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vision logs' });
    }
  });

  // Vision Anomalies
  app.get('/api/vision/anomalies', async (req, res) => {
    try {
      const anomalies = await db.select().from(visionStatusLogs)
        .where(sql`${visionStatusLogs.status} IN ('DAMAGED', 'NON_STANDARD', 'UNKNOWN')`)
        .orderBy(desc(visionStatusLogs.timestamp))
        .limit(50);
      res.json({ success: true, data: anomalies });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch anomalies' });
    }
  });

  // Enhanced Vision Scan Endpoint with AI Image Analysis
  app.post('/api/vision/scan', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided. Please capture an image first.' });
      }

      const productsList = await db.select().from(products);
      if (productsList.length === 0) {
        return res.status(404).json({ error: 'No products found in inventory' });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

      const productCatalog = productsList.map((p: Product) =>
        `SKU: ${p.sku} | Name: ${p.name} | Description: ${p.description || 'N/A'}`
      ).join('\n');

      const systemPrompt = `You are an advanced AI vision system that can identify ANY real-world object in an image.
Your job is to:
1. Identify the PRIMARY object visible in the image (can be ANYTHING — laptop, phone, umbrella, pen, cup, chair, carpet, lamp, etc.)
2. Check if it matches anything in the inventory catalog below
3. Return detailed object information

Inventory Catalog (for matching):
${productCatalog}

Respond ONLY with a valid JSON object in this EXACT format (no extra text):
{
  "detected": true,
  "object_name": "what the object actually is (e.g. Laptop, Red Umbrella, Smartphone, Wooden Chair)",
  "catalog_match": true or false,
  "sku": "matching SKU from catalog if it matches, otherwise null",
  "confidence": 0.0 to 1.0,
  "status": "OK" or "DAMAGED" or "NON_STANDARD",
  "bounding_box": {
    "x_pct": percentage from left (0-80),
    "y_pct": percentage from top (0-80),
    "w_pct": width percentage (10-80),
    "h_pct": height percentage (10-80)
  },
  "color": "primary color(s) of the object",
  "texture": "surface material/texture (e.g. metal, plastic, fabric, wood, glass)",
  "brand": "brand name if visible, otherwise null",
  "dimensions_estimate": "rough estimate like 35x25x2 cm",
  "category": "category like Electronics, Furniture, Clothing, Stationery, Artisan Craft, etc.",
  "notes": "condition notes and any visible damage or notable features"
}

IMPORTANT: Always detect something if any object is visible. Be specific and accurate. Never return detected:false unless the image is completely blank or unidentifiable.`;

      const aiResponse = await openai.chat.completions.create({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ],
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      const aiResult = parseVisionScanResult(aiResponse.choices[0]?.message?.content);

      if (!aiResult) {
        console.error('Vision scan returned unparseable AI content:', aiResponse.choices[0]?.message?.content);
        return res.status(500).json({ error: 'AI returned invalid response. Please try again.' });
      }

      if (!aiResult.detected) {
        return res.json({
          success: false,
          detected: false,
          message: 'Could not identify any object in the image. Try better lighting or hold the item closer.',
          timestamp: new Date().toISOString()
        });
      }

      // Try to find a matching product from catalog
      let matchedProduct = productsList.find((p: Product) => p.sku === aiResult.sku);
      if (!matchedProduct && aiResult.catalog_match && aiResult.object_name) {
        matchedProduct = productsList.find((p: Product) =>
          p.name.toLowerCase().split(' ').some((word: string) =>
            aiResult.object_name.toLowerCase().includes(word) && word.length > 3
          )
        );
      }

      // Safe bounding box
      const bb = aiResult.bounding_box || { x_pct: 15, y_pct: 15, w_pct: 70, h_pct: 70 };
      const boundingBox = {
        x_pct: Math.max(0, Math.min(80, Number(bb.x_pct) || 15)),
        y_pct: Math.max(0, Math.min(80, Number(bb.y_pct) || 15)),
        w_pct: Math.max(10, Math.min(85, Number(bb.w_pct) || 70)),
        h_pct: Math.max(10, Math.min(85, Number(bb.h_pct) || 70)),
      };

      // Use matched product SKU/id or generate a placeholder for unknown items
      const displaySku = matchedProduct?.sku || `SCAN-${aiResult.category?.replace(/\s+/g, '-').toUpperCase().slice(0,8) || 'ITEM'}`;
      const displayName = matchedProduct?.name || aiResult.object_name;

      // Log to vision status table (use first product as placeholder if no match)
      const logProductId = matchedProduct?.id || productsList[0]?.id;
      if (logProductId) {
        const visionLogData = {
          productId: logProductId,
          sku: displaySku,
          status: aiResult.status || 'OK',
          confidenceScore: aiResult.confidence,
          detectedClass: aiResult.object_name,
          boundingBox: JSON.stringify(boundingBox),
          imageData: null,
          notes: aiResult.notes || null
        };
        await db.insert(visionStatusLogs).values(visionLogData);

        if (matchedProduct) {
          await db.update(products)
            .set({
              detectedColor: aiResult.color || null,
              detectedTexture: aiResult.texture || null,
              detectedDimensions: aiResult.dimensions_estimate || null,
              lastScannedAt: new Date().toISOString(),
            })
            .where(eq(products.id, matchedProduct.id));
          await storage.logAction("SCAN", "PRODUCT", matchedProduct.id, 0, `AI Vision: ${aiResult.object_name}`);
        }
      }

      res.json({
        success: true,
        detected: true,
        catalog_match: !!matchedProduct,
        data: {
          product_id: matchedProduct?.id || null,
          product_name: displayName,
          sku: displaySku,
          object_name: aiResult.object_name,
          confidence: aiResult.confidence,
          status: aiResult.status || 'OK',
          bounding_box: boundingBox,
          color: aiResult.color,
          texture: aiResult.texture,
          brand: aiResult.brand || null,
          dimensions_estimate: aiResult.dimensions_estimate,
          category: aiResult.category,
          notes: aiResult.notes,
          in_inventory: !!matchedProduct,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Vision scan error:', error);
      res.status(500).json({ error: 'Vision scan failed. Please try again.' });
    }
  });

  // Reorder product (mock endpoint)
  app.post('/api/products/:id/reorder', async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const { quantity } = req.body;
      
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const newQuantity = product.quantity + (quantity || 50);
      const updated = await storage.updateProduct(productId, { quantity: newQuantity });
      await storage.logAction("RESTOCK", "PRODUCT", productId, quantity || 50, `One-click reorder of ${quantity || 50} units`);

      res.json({ success: true, product: updated, message: `Reordered ${quantity || 50} units` });
    } catch (error) {
      res.status(500).json({ error: 'Reorder failed' });
    }
  });

  // Seed Data — Indian artisan inventory
  const existingProducts = await storage.getProducts();
  const needsReseed = existingProducts.length === 0 || 
    (existingProducts.length > 0 && existingProducts[0].name === "Modern Oak Chair");

  if (needsReseed) {
    console.log("Seeding database with Indian artisan data...");

    // Clear existing data if re-seeding
    if (existingProducts.length > 0) {
      await db.delete(inventoryLogs);
      await db.delete(sales);
      await db.delete(products);
      await db.delete(materials);
    }

    // --- Raw Materials ---
    const teak   = await storage.createMaterial({ name: "Teak Wood (Sagwan)", sku: "MAT-TEAK", quantity: 80, unit: "planks", costPerUnit: 1200, minStockLevel: 15 });
    const bamboo = await storage.createMaterial({ name: "Bamboo Poles", sku: "MAT-BAMB", quantity: 150, unit: "poles", costPerUnit: 80, minStockLevel: 30 });
    const jute   = await storage.createMaterial({ name: "Jute Fiber", sku: "MAT-JUTE", quantity: 60, unit: "kg", costPerUnit: 45, minStockLevel: 10 });
    const brass  = await storage.createMaterial({ name: "Brass Hardware", sku: "MAT-BRASS", quantity: 200, unit: "pcs", costPerUnit: 35, minStockLevel: 50 });
    const cotton = await storage.createMaterial({ name: "Handloom Cotton", sku: "MAT-COTTN", quantity: 40, unit: "meters", costPerUnit: 120, minStockLevel: 8 });
    const marble = await storage.createMaterial({ name: "Rajasthan Marble", sku: "MAT-MARBR", quantity: 25, unit: "sqft", costPerUnit: 650, minStockLevel: 5 });
    const varnish = await storage.createMaterial({ name: "Sheesham Wood Varnish", sku: "MAT-VARN", quantity: 30, unit: "liters", costPerUnit: 280, minStockLevel: 6 });
    const cane   = await storage.createMaterial({ name: "Rattan Cane", sku: "MAT-CANE", quantity: 90, unit: "rolls", costPerUnit: 175, minStockLevel: 20 });

    // --- Finished Products ---
    const chair1 = await storage.createProduct({ name: "Sheesham Wood Dining Chair", sku: "PROD-001", description: "Hand-carved Jodhpur dining chair with brass accents", quantity: 18, price: 4500 });
    const table1 = await storage.createProduct({ name: "Rajasthani Teak Dining Table", sku: "PROD-002", description: "6-seater solid teak table, Jaipur craft", quantity: 6, price: 28000 });
    const lamp1  = await storage.createProduct({ name: "Jaipur Brass Floor Lamp", sku: "PROD-003", description: "Handcrafted brass lamp with filigree work", quantity: 22, price: 3200 });
    const shelf1 = await storage.createProduct({ name: "Bamboo Wall Shelf Unit", sku: "PROD-004", description: "Eco-friendly bamboo floating shelf, 3 tier", quantity: 35, price: 1800 });
    const rug1   = await storage.createProduct({ name: "Kashmiri Handwoven Carpet", sku: "PROD-005", description: "Pure wool 6x4 ft carpet, traditional motifs", quantity: 9, price: 15000 });
    const box1   = await storage.createProduct({ name: "Sandalwood Jewellery Box", sku: "PROD-006", description: "Mysore sandalwood inlay work, 12 compartments", quantity: 30, price: 2200 });
    const stool1 = await storage.createProduct({ name: "Cane & Rattan Stool", sku: "PROD-007", description: "Handwoven rattan stool, Kerala style", quantity: 14, price: 1200 });
    const screen1 = await storage.createProduct({ name: "Marble Inlay Decorative Plate", sku: "PROD-008", description: "Agra marble pietra dura 12-inch plate", quantity: 40, price: 950 });

    // --- Sales Records (last 14 days) ---
    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

    const salesData = [
      { productId: chair1.id, quantity: 3, totalPrice: 13500 },
      { productId: lamp1.id,  quantity: 5, totalPrice: 16000 },
      { productId: shelf1.id, quantity: 8, totalPrice: 14400 },
      { productId: box1.id,   quantity: 10, totalPrice: 22000 },
      { productId: rug1.id,   quantity: 2, totalPrice: 30000 },
      { productId: table1.id, quantity: 1, totalPrice: 28000 },
      { productId: stool1.id, quantity: 6, totalPrice: 7200 },
      { productId: screen1.id, quantity: 12, totalPrice: 11400 },
      { productId: chair1.id, quantity: 2, totalPrice: 9000 },
      { productId: lamp1.id,  quantity: 4, totalPrice: 12800 },
      { productId: box1.id,   quantity: 7, totalPrice: 15400 },
      { productId: shelf1.id, quantity: 5, totalPrice: 9000 },
    ];

    for (const s of salesData) {
      await storage.createSale(s);
    }

    console.log("Indian artisan database seeded successfully!");
  }

  return httpServer;
}
