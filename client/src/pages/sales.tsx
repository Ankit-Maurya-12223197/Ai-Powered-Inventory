import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSales, useCreateSale, useProducts } from "@/hooks/use-inventory";
import { insertSaleSchema } from "@shared/schema";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { IndianRupee, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";

const saleFormSchema = insertSaleSchema.extend({
  productId: z.coerce.number(),
  quantity: z.coerce.number().min(1),
  totalPrice: z.coerce.number().min(0),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function Sales() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: sales, isLoading } = useSales();
  const { data: products } = useProducts();
  const createSale = useCreateSale();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      quantity: 1,
      totalPrice: 0,
    },
  });

  // Auto-calculate price when product or quantity changes
  const updatePrice = (productId: number, quantity: number) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      form.setValue('totalPrice', Number((product.price * quantity).toFixed(2)));
    }
  };

  const onSubmit = (data: SaleFormValues) => {
    createSale.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Records</h2>
          <p className="text-muted-foreground mt-1">
            Track revenue and product outflow.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20">
              <IndianRupee className="w-4 h-4 mr-2" />
              Record New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>
                Log a new sale. Inventory will be automatically deducted.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          updatePrice(Number(val), form.getValues('quantity'));
                        }} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} (Stock: {p.quantity}) - ₹{p.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            updatePrice(form.getValues('productId'), Number(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Sale Value (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} readOnly className="bg-muted font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createSale.isPending}>
                    {createSale.isPending ? "Processing..." : "Complete Sale"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity Sold</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Loading sales...</TableCell>
              </TableRow>
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No sales recorded.</TableCell>
              </TableRow>
            ) : (
              sales?.map((sale) => {
                const product = products?.find(p => p.id === sale.productId);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{sale.id.toString().padStart(6, '0')}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {sale.timestamp && format(new Date(sale.timestamp), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product?.name || `Product #${sale.productId}`}
                    </TableCell>
                    <TableCell>
                      {sale.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">
                      +₹{sale.totalPrice.toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
