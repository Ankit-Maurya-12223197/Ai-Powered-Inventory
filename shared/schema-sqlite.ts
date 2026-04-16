import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Raw Materials
export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(), // e.g., "kg", "meters", "pcs"
  costPerUnit: real("cost_per_unit").notNull(),
  minStockLevel: integer("min_stock_level").default(10),
});

// Products (Handmade items)
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(), // The code the vision engine might scan
  description: text("description"),
  quantity: integer("quantity").notNull().default(0),
  price: real("price").notNull(),
  // Vision Engine specific fields
  detectedColor: text("detected_color"),
  detectedTexture: text("detected_texture"),
  detectedDimensions: text("detected_dimensions"), // e.g. "10x20x5"
  lastScannedAt: text("last_scanned_at"), // ISO string
  // AI Prediction fields
  predictedStock: integer("predicted_stock"),
  predictedDemand: integer("predicted_demand"),
});

// Linking Products to Materials (Recipe)
export const productRecipes = sqliteTable("product_recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  materialId: integer("material_id").notNull(),
  quantityRequired: real("quantity_required").notNull(),
});

// Sales
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  totalPrice: real("total_price").notNull(),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
});

// Inventory Logs (Tracking all movements)
export const inventoryLogs = sqliteTable("inventory_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
  action: text("action").notNull(), // "SALE", "RESTOCK", "ADJUSTMENT", "PRODUCTION"
  entityType: text("entity_type").notNull(), // "PRODUCT" or "MATERIAL"
  entityId: integer("entity_id").notNull(),
  changeAmount: real("change_amount").notNull(), // Positive or negative
  description: text("description"),
});

// Vision Status Logs (AI-detected anomalies)
export const visionStatusLogs = sqliteTable("vision_status_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
  productId: integer("product_id").notNull(),
  sku: text("sku").notNull(),
  status: text("status").notNull(), // "OK", "DAMAGED", "NON_STANDARD", "UNKNOWN"
  confidenceScore: real("confidence_score"),
  detectedClass: text("detected_class"),
  boundingBox: text("bounding_box"), // JSON string { x, y, width, height }
  imageData: text("image_data"), // Base64 encoded
  notes: text("notes"),
});

// Conversations for AI Chatbot
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// Messages for AI Chatbot
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// === RELATIONS ===

export const productRecipesRelations = relations(productRecipes, ({ one }) => ({
  product: one(products, {
    fields: [productRecipes.productId],
    references: [products.id],
  }),
  material: one(materials, {
    fields: [productRecipes.materialId],
    references: [materials.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  product: one(products, {
    fields: [sales.productId],
    references: [products.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, lastScannedAt: true, predictedStock: true, predictedDemand: true });
export const insertRecipeSchema = createInsertSchema(productRecipes).omit({ id: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, timestamp: true });
export const insertLogSchema = createInsertSchema(inventoryLogs).omit({ id: true, timestamp: true });
export const insertVisionStatusLogSchema = createInsertSchema(visionStatusLogs).omit({ id: true, timestamp: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Recipe = typeof productRecipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type InventoryLog = typeof inventoryLogs.$inferSelect;

export type VisionStatusLog = typeof visionStatusLogs.$inferSelect;
export type InsertVisionStatusLog = z.infer<typeof insertVisionStatusLogSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Request types
export type CreateMaterialRequest = InsertMaterial;
export type UpdateMaterialRequest = Partial<InsertMaterial>;

export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;

// For the Vision Engine
export type ScanResultRequest = {
  sku: string;
  detectedColor?: string;
  detectedTexture?: string;
  detectedDimensions?: string;
};

// Response types
export type ProductWithDetails = Product & { materials?: (Recipe & { material: Material })[] };