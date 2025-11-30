import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Trash2, Edit2, Lock, QrCode, Ticket } from "lucide-react";

const ADMIN_PASSWORD = "alfalah2025";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  available: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [paymentQRUrl, setPaymentQRUrl] = useState("");
  
  // Product form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("readymade");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Coupon form state
  const [couponCode, setCouponCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      loadData();
      toast.success("Access granted!");
    } else {
      toast.error("Incorrect password");
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([loadProducts(), loadCoupons(), loadPaymentQR()]);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setProducts(data || []);
  };

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setCoupons(data || []);
  };

  const loadPaymentQR = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_qr_url')
      .maybeSingle();
    
    if (data) setPaymentQRUrl(data.value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = imagePreview;
      
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile);
        setUploadingImage(false);
      }

      const productData = {
        title,
        description,
        price: parseFloat(price),
        category,
        images: imageUrl ? [imageUrl] : [],
        available: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        
        if (error) throw error;
        toast.success("Product added successfully");
      }

      resetProductForm();
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product.id);
    setTitle(product.title);
    setDescription(product.description);
    setPrice(product.price.toString());
    setCategory(product.category);
    setImagePreview(product.images[0] || "");
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Product deleted successfully");
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetProductForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("readymade");
    setImageFile(null);
    setImagePreview("");
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const couponData = {
        code: couponCode.toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_purchase: minPurchase ? parseFloat(minPurchase) : 0,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        active: true,
      };

      if (editingCouponId) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCouponId);
        
        if (error) throw error;
        toast.success("Coupon updated successfully");
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);
        
        if (error) throw error;
        toast.success("Coupon created successfully");
      }

      resetCouponForm();
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCouponCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setMinPurchase(coupon.min_purchase.toString());
    setMaxUses(coupon.max_uses?.toString() || "");
    setExpiresAt(coupon.expires_at?.split('T')[0] || "");
  };

  const handleToggleCoupon = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !active })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(active ? "Coupon deactivated" : "Coupon activated");
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success("Coupon deleted successfully");
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetCouponForm = () => {
    setEditingCouponId(null);
    setCouponCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinPurchase("");
    setMaxUses("");
    setExpiresAt("");
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQR(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-qr.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-qr')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('payment-qr')
        .getPublicUrl(fileName);

      const qrUrl = data.publicUrl;

      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({ key: 'payment_qr_url', value: qrUrl });

      if (settingsError) throw settingsError;

      setPaymentQRUrl(qrUrl);
      toast.success("Payment QR code uploaded successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingQR(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Admin Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Access Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-serif font-bold mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>{editingId ? "Edit Product" : "Add New Product"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Product Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Price (INR)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="readymade">Readymade</SelectItem>
                          <SelectItem value="abayas">Abayas</SelectItem>
                          <SelectItem value="dress_materials">Dress Materials</SelectItem>
                          <SelectItem value="handbags">Handbags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image">Product Image</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {imagePreview && (
                        <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded mt-2" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving || uploadingImage} className="flex-1">
                        {saving || uploadingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {uploadingImage ? "Uploading..." : "Saving..."}
                          </>
                        ) : (
                          <>{editingId ? "Update Product" : "Add Product"}</>
                        )}
                      </Button>
                      {editingId && (
                        <Button type="button" variant="outline" onClick={resetProductForm}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Products ({products.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex gap-3 p-3 border border-border rounded-lg"
                      >
                        {product.images[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{product.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            INR {product.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {product.category.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    {editingCouponId ? "Edit Coupon" : "Create New Coupon"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCouponSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="couponCode">Coupon Code</Label>
                      <Input
                        id="couponCode"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g., SAVE20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        Discount Value {discountType === "percentage" ? "(%)" : "(INR)"}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minPurchase">Minimum Purchase (INR)</Label>
                      <Input
                        id="minPurchase"
                        type="number"
                        step="0.01"
                        value={minPurchase}
                        onChange={(e) => setMinPurchase(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        placeholder="Unlimited"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving} className="flex-1">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>{editingCouponId ? "Update Coupon" : "Create Coupon"}</>
                        )}
                      </Button>
                      {editingCouponId && (
                        <Button type="button" variant="outline" onClick={resetCouponForm}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coupons ({coupons.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {coupons.map((coupon) => (
                      <div
                        key={coupon.id}
                        className="flex gap-3 p-3 border border-border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{coupon.code}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${coupon.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {coupon.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {coupon.discount_type === 'percentage' 
                              ? `${coupon.discount_value}% off`
                              : `INR ${coupon.discount_value} off`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Min: INR {coupon.min_purchase} | Used: {coupon.used_count}
                            {coupon.max_uses && ` / ${coupon.max_uses}`}
                          </p>
                          {coupon.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleCoupon(coupon.id, coupon.active)}
                          >
                            {coupon.active ? '❌' : '✅'}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditCoupon(coupon)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Payment QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qrUpload">Upload Payment QR Code</Label>
                  <Input
                    id="qrUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    disabled={uploadingQR}
                  />
                  <p className="text-sm text-muted-foreground">
                    This QR code will be displayed on the checkout page for customers to make payments.
                  </p>
                </div>

                {uploadingQR && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}

                {paymentQRUrl && (
                  <div className="space-y-2">
                    <Label>Current Payment QR Code</Label>
                    <img 
                      src={paymentQRUrl} 
                      alt="Payment QR Code" 
                      className="w-64 h-64 object-contain border border-border rounded p-4"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
