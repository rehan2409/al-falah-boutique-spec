import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Trash2, Edit2, Lock, QrCode, Ticket, ShoppingBag, TrendingUp, Package, Check, X } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  items: any;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  status: string;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--boutique-gold))', 'hsl(var(--secondary))'];

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
      await Promise.all([loadProducts(), loadCoupons(), loadOrders(), loadPaymentQR()]);
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

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setOrders(data || []);
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

      console.log('Creating/updating coupon:', couponData);

      if (editingCouponId) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCouponId);
        
        if (error) {
          console.error('Error updating coupon:', error);
          throw error;
        }
        toast.success("Coupon updated successfully!");
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);
        
        if (error) {
          console.error('Error creating coupon:', error);
          throw error;
        }
        toast.success("Coupon created successfully!");
      }

      resetCouponForm();
      loadCoupons();
    } catch (error: any) {
      console.error('Coupon submit error:', error);
      toast.error(error.message || "Failed to save coupon");
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

  const handleOrderStatus = async (orderId: string, status: string) => {
    try {
      // Find the order to get customer details
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast.error("Order not found");
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) throw error;

      // Send email notification
      if (status === 'accepted' || status === 'rejected') {
        try {
          const items = Array.isArray(order.items) 
            ? order.items.map((item: any) => ({
                title: item.title || item.name || 'Product',
                quantity: item.quantity || 1,
                price: item.price || 0
              }))
            : [];

          const { error: emailError } = await supabase.functions.invoke('send-order-email', {
            body: {
              customerName: order.customer_name,
              customerEmail: order.customer_email,
              orderId: order.id,
              status: status as 'accepted' | 'rejected',
              items,
              total: order.total
            }
          });

          if (emailError) {
            console.error('Email error:', emailError);
            toast.warning(`Order ${status}, but email notification failed`);
          } else {
            toast.success(`Order ${status} and customer notified via email`);
          }
        } catch (emailErr) {
          console.error('Email sending error:', emailErr);
          toast.warning(`Order ${status}, but email notification failed`);
        }
      } else {
        toast.success(`Order ${status}`);
      }

      loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Starting QR upload:', file.name, file.type, file.size);
    setUploadingQR(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-qr.${fileExt}`;

      console.log('Uploading to storage bucket:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('payment-qr')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully, getting public URL');

      const { data } = supabase.storage
        .from('payment-qr')
        .getPublicUrl(fileName);

      const qrUrl = data.publicUrl;
      console.log('Public URL:', qrUrl);

      console.log('Saving URL to settings table');
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({ key: 'payment_qr_url', value: qrUrl });

      if (settingsError) {
        console.error('Settings save error:', settingsError);
        throw settingsError;
      }

      setPaymentQRUrl(qrUrl);
      toast.success("Payment QR code uploaded successfully!");
      console.log('QR upload complete');
    } catch (error: any) {
      console.error('QR upload failed:', error);
      toast.error(error.message || "Failed to upload QR code");
    } finally {
      setUploadingQR(false);
    }
  };

  // Analytics calculations
  const totalRevenue = orders.filter(o => o.status === 'accepted').reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const acceptedOrders = orders.filter(o => o.status === 'accepted').length;
  
  const categoryData = products.reduce((acc, p) => {
    const cat = p.category.replace('_', ' ');
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const dailyRevenue = orders
    .filter(o => o.status === 'accepted')
    .reduce((acc, order) => {
      const date = new Date(order.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + order.total;
      return acc;
    }, {} as Record<string, number>);

  const revenueChartData = Object.entries(dailyRevenue)
    .map(([date, revenue]) => ({ date, revenue }))
    .slice(-7);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-boutique-gradient-start to-boutique-gradient-end">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Lock className="h-6 w-6 text-primary" />
                Admin Access
              </CardTitle>
              <CardDescription>Enter the admin password to continue</CardDescription>
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
                    className="text-lg py-6"
                  />
                </div>
                <Button type="submit" className="w-full text-lg py-6">
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
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-boutique-cream/10 to-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-5xl font-serif font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">Manage your boutique with ease</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From {acceptedOrders} completed orders</p>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                  <ShoppingBag className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground mt-1">{pendingOrders} pending approval</p>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
                  <Package className="h-5 w-5 text-boutique-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-boutique-gold">{products.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active listings</p>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Coupons</CardTitle>
                  <Ticket className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{coupons.filter(c => c.active).length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Out of {coupons.length} total</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Products by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Orders Management</CardTitle>
                <CardDescription>Review and manage customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No orders yet</p>
                  ) : (
                    orders.map((order) => (
                      <Card key={order.id} className={`border-2 ${order.status === 'accepted' ? 'border-green-200 bg-green-50/50' : order.status === 'rejected' ? 'border-red-200 bg-red-50/50' : 'border-primary/20'}`}>
                        <CardContent className="pt-6">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-semibold text-lg mb-2">{order.customer_name}</h3>
                              <p className="text-sm text-muted-foreground">📞 {order.customer_phone}</p>
                              <p className="text-sm text-muted-foreground">📍 {order.customer_address}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <div className="space-y-1 mb-3">
                                <p className="text-sm"><span className="font-medium">Subtotal:</span> ₹{order.subtotal.toFixed(2)}</p>
                                {order.discount > 0 && (
                                  <p className="text-sm text-green-600">
                                    <span className="font-medium">Discount:</span> -₹{order.discount.toFixed(2)}
                                    {order.coupon_code && ` (${order.coupon_code})`}
                                  </p>
                                )}
                                <p className="text-lg font-bold text-primary">Total: ₹{order.total.toFixed(2)}</p>
                              </div>
                              <div className="flex gap-2">
                                {order.status === 'pending' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleOrderStatus(order.id, 'accepted')}
                                      className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="mr-1 h-4 w-4" /> Accept
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive" 
                                      onClick={() => handleOrderStatus(order.id, 'rejected')}
                                      className="flex-1"
                                    >
                                      <X className="mr-1 h-4 w-4" /> Reject
                                    </Button>
                                  </>
                                )}
                                {order.status === 'accepted' && (
                                  <div className="text-green-600 font-semibold flex items-center gap-1">
                                    <Check className="h-5 w-5" /> Accepted
                                  </div>
                                )}
                                {order.status === 'rejected' && (
                                  <div className="text-red-600 font-semibold flex items-center gap-1">
                                    <X className="h-5 w-5" /> Rejected
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                              View Items
                            </summary>
                            <div className="mt-3 space-y-2">
                              {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm border-t pt-2">
                                  <span>{item.title} x{item.quantity}</span>
                                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>{editingId ? "Edit Product" : "Add New Product"}</CardTitle>
                  <CardDescription>Create or update product listings</CardDescription>
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
                        className="text-base"
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
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg mt-2 border-2 border-primary/20" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving || uploadingImage} className="flex-1 text-base py-6">
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

              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Products ({products.length})</CardTitle>
                  <CardDescription>Manage your product catalog</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[700px] overflow-y-auto">
                    {products.map((product) => (
                      <Card
                        key={product.id}
                        className="border-2 hover:border-primary transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            {product.images[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate text-lg">{product.title}</h3>
                              <p className="text-base text-primary font-bold">
                                ₹{product.price.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground capitalize">
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="hover-lift">
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

              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle>Coupons ({coupons.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[700px] overflow-y-auto">
                    {coupons.map((coupon) => (
                      <Card
                        key={coupon.id}
                        className="border-2"
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{coupon.code}</h3>
                                <span className={`text-xs px-2 py-1 rounded ${coupon.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {coupon.active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {coupon.discount_type === 'percentage' 
                                  ? `${coupon.discount_value}% off`
                                  : `₹${coupon.discount_value} off`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Min: ₹{coupon.min_purchase} | Used: {coupon.used_count}
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="animate-fade-in">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Payment QR Code
                </CardTitle>
                <CardDescription>Upload a QR code for customer payments</CardDescription>
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
                    <div className="border-2 border-primary/20 rounded-lg p-4 inline-block">
                      <img 
                        src={paymentQRUrl} 
                        alt="Payment QR Code" 
                        className="w-64 h-64 object-contain"
                      />
                    </div>
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
