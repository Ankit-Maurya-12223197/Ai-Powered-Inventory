import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProducts, useCreateProduct, useForecast, useReorderProduct, useUpdateProduct } from "@/hooks/use-inventory";
import { insertProductSchema, type Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Search, AlertCircle, ShoppingCart, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Create form schema based on the shared schema, coercing number fields
const productFormSchema = insertProductSchema.extend({
  quantity: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});

const productEditSchema = z.object({
  quantity: z.coerce.number().min(0, "Stock level cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;
type ProductEditValues = z.infer<typeof productEditSchema>;

export default function Products() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useProducts();
  const { data: forecasts } = useForecast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const reorderProduct = useReorderProduct();
  const { toast } = useToast();

  const getForecastForProduct = (productId: number) => {
    return forecasts?.find(f => f.product_id === productId);
  };

  const handleReorder = (productId: number, productName: string) => {
    reorderProduct.mutate({ id: productId, quantity: 50 }, {
      onSuccess: () => {
        toast({
          title: "Reorder Placed",
          description: `Successfully ordered 50 units of ${productName}`,
        });
      },
      onError: () => {
        toast({
          title: "Reorder Failed",
          description: "Could not place the reorder.",
          variant: "destructive"
        });
      }
    });
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      quantity: 0,
      price: 0,
    },
  });

  const editForm = useForm<ProductEditValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      quantity: 0,
      price: 0,
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    createProduct.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    editForm.reset({
      quantity: product.quantity,
      price: product.price,
    });
  };

  const onEditSubmit = (data: ProductEditValues) => {
    if (!editingProduct) return;

    updateProduct.mutate(
      {
        id: editingProduct.id,
        quantity: data.quantity,
        price: data.price,
      },
      {
        onSuccess: () => {
          toast({
            title: "Product updated",
            description: `${editingProduct.name} now has ${data.quantity} units at Rs. ${data.price.toLocaleString("en-IN")}.`,
          });
          setEditingProduct(null);
          editForm.reset();
        },
        onError: () => {
          toast({
            title: "Update failed",
            description: "Could not update this product right now.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products Inventory</h2>
          <p className="text-muted-foreground mt-1">
            Manage your finished goods and handmade items.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Enter the details of the new item to track in inventory.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Wooden Chair" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. CHR-001" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional details..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? "Creating..." : "Create Product"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex gap-4 bg-muted/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Prediction</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No products found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts?.map((product) => (
                  <TableRow key={product.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono font-medium text-xs text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                      {product.description && (
                        <div className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                          {product.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      ₹{product.price.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const forecast = getForecastForProduct(product.id);
                        const needsReorder = forecast?.needs_reorder || (forecast?.total_predicted_demand && forecast.total_predicted_demand > product.quantity);
                        return (
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                              needsReorder
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900" 
                                : product.quantity < 10 
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900"
                            )}>
                              {product.quantity} units
                            </span>
                            {needsReorder && (
                              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const forecast = getForecastForProduct(product.id);
                        if (!forecast) {
                          return <span className="text-xs text-muted-foreground italic">Loading...</span>;
                        }
                        const needsReorder = forecast.needs_reorder || forecast.total_predicted_demand > product.quantity;
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <TrendingDown className={cn("w-3 h-3", needsReorder ? "text-red-500" : "text-muted-foreground")} />
                              <span className={needsReorder ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                                7d demand: {forecast.total_predicted_demand}
                              </span>
                            </div>
                            {needsReorder && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 text-xs"
                                onClick={() => handleReorder(product.id, product.name)}
                                disabled={reorderProduct.isPending}
                                data-testid={`button-reorder-${product.id}`}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Reorder
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditDialog(product)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={!!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
            editForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the stock level and unit price for {editingProduct?.name ?? "this product"}.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField
                control={editForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Level</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (Rs.)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProduct.isPending}>
                  {updateProduct.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
