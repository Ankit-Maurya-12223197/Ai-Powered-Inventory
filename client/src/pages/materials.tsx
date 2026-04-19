import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMaterials, useCreateMaterial, useUpdateMaterial } from "@/hooks/use-inventory";
import { insertMaterialSchema, type Material } from "@shared/schema";
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
import { Plus, Search, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

// Coerce numbers for form handling
const materialFormSchema = insertMaterialSchema.extend({
  quantity: z.coerce.number().min(0),
  costPerUnit: z.coerce.number().min(0),
  minStockLevel: z.coerce.number().min(0),
});

const materialEditSchema = z.object({
  quantity: z.coerce.number().min(0, "Stock cannot be negative"),
  costPerUnit: z.coerce.number().min(0, "Cost cannot be negative"),
  minStockLevel: z.coerce.number().min(0, "Minimum stock cannot be negative"),
});

type MaterialFormValues = z.infer<typeof materialFormSchema>;
type MaterialEditValues = z.infer<typeof materialEditSchema>;

export default function Materials() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState("");
  const { data: materials, isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const { toast } = useToast();

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      unit: "pcs",
      quantity: 0,
      costPerUnit: 0,
      minStockLevel: 10,
    },
  });

  const editForm = useForm<MaterialEditValues>({
    resolver: zodResolver(materialEditSchema),
    defaultValues: {
      quantity: 0,
      costPerUnit: 0,
      minStockLevel: 0,
    },
  });

  const onSubmit = (data: MaterialFormValues) => {
    createMaterial.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
    });
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    editForm.reset({
      quantity: material.quantity,
      costPerUnit: material.costPerUnit,
      minStockLevel: material.minStockLevel ?? 0,
    });
  };

  const onEditSubmit = (data: MaterialEditValues) => {
    if (!editingMaterial) return;

    updateMaterial.mutate(
      {
        id: editingMaterial.id,
        quantity: data.quantity,
        costPerUnit: data.costPerUnit,
        minStockLevel: data.minStockLevel,
      },
      {
        onSuccess: () => {
          toast({
            title: "Material updated",
            description: `${editingMaterial.name} has been updated successfully.`,
          });
          setEditingMaterial(null);
          editForm.reset();
        },
        onError: () => {
          toast({
            title: "Update failed",
            description: "Could not update this material right now.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const filteredMaterials = materials?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Raw Materials</h2>
          <p className="text-muted-foreground mt-1">
            Track components used for manufacturing.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="shadow-sm border border-border">
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Raw Material</DialogTitle>
              <DialogDescription>
                Define a new material type for your inventory.
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
                        <FormLabel>Material Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Oak Wood" {...field} />
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
                        <FormLabel>SKU / ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. MAT-OAK-01" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="kg, pcs, m" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || 0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Per Unit (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMaterial.isPending}>
                    {createMaterial.isPending ? "Adding..." : "Add Material"}
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
              placeholder="Search materials..."
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
                <TableHead>Material Name</TableHead>
                <TableHead>Cost / Unit</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading materials...
                  </TableCell>
                </TableRow>
              ) : filteredMaterials?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No materials found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials?.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="font-mono font-medium text-xs text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      {item.name}
                    </TableCell>
                    <TableCell className="font-mono">
                      ₹{item.costPerUnit.toLocaleString('en-IN')} / {item.unit}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-sm">
                        {item.quantity} <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                      </div>
                      {item.quantity <= (item.minStockLevel || 0) && (
                        <div className="text-[10px] text-red-500 font-semibold mt-1">Low Stock (Min: {item.minStockLevel})</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      ₹{(item.quantity * item.costPerUnit).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditDialog(item)}
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
        open={!!editingMaterial}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMaterial(null);
            editForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update stock, minimum stock, and cost for {editingMaterial?.name ?? "this material"}.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
              <FormField
                control={editForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="costPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per Unit (Rs.)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingMaterial(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMaterial.isPending}>
                  {updateMaterial.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
