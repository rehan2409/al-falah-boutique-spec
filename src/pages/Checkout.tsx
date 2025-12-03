import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Check, Upload, LogIn, Image as ImageIcon } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "@/hooks/useAuth";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [paymentQRUrl, setPaymentQRUrl] = useState("");
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  useEffect(() => {
    loadPaymentQR();
  }, []);

  // Pre-fill email from authenticated user
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const loadPaymentQR = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_qr_url')
      .maybeSingle();
    
    if (data) setPaymentQRUrl(data.value);
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    const total = getTotalPrice();
    if (appliedCoupon.discount_type === 'percentage') {
      return (total * appliedCoupon.discount_value) / 100;
    } else {
      return appliedCoupon.discount_value;
    }
  };

  const getFinalTotal = () => {
    return getTotalPrice() - calculateDiscount();
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Invalid coupon code");
        return;
      }

      const coupon = data as Coupon;

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error("This coupon has expired");
        return;
      }

      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error("This coupon has reached its maximum usage limit");
        return;
      }

      if (getTotalPrice() < coupon.min_purchase) {
        toast.error(`Minimum purchase of ₹${coupon.min_purchase} required`);
        return;
      }

      setAppliedCoupon(coupon);
      toast.success("Coupon applied successfully!");
    } catch (error: any) {
      toast.error("Failed to apply coupon");
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    setUploadingScreenshot(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      setPaymentScreenshot(file);
      setPaymentScreenshotUrl(publicUrl);
      toast.success("Payment screenshot uploaded successfully!");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Failed to upload screenshot. Please try again.");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const generateInvoicePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // Header Background - Elegant green gradient effect
    doc.setFillColor(76, 132, 84); // Soft green
    doc.rect(0, 0, pageWidth, 55, 'F');
    
    // Gold accent line
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 55, pageWidth, 3, 'F');
    
    // Shop Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text("Al Falah Boutique", pageWidth / 2, 25, { align: "center" });
    
    // Tagline
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text("Elegance in Every Thread", pageWidth / 2, 35, { align: "center" });
    
    // Invoice Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("TAX INVOICE", pageWidth / 2, 48, { align: "center" });
    
    // Invoice details box
    doc.setTextColor(60, 60, 60);
    doc.setFillColor(248, 250, 248);
    doc.roundedRect(margin, 65, pageWidth - (margin * 2), 45, 3, 3, 'F');
    
    // Left column - Customer Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(76, 132, 84);
    doc.text("BILL TO:", margin + 5, 75);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(name, margin + 5, 83);
    doc.text(phone, margin + 5, 90);
    doc.text(email, margin + 5, 97);
    
    // Address with word wrap
    const addressLines = doc.splitTextToSize(address, 80);
    let addressY = 104;
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, margin + 5, addressY);
      addressY += 6;
    });
    
    // Right column - Invoice details
    const rightCol = pageWidth - margin - 60;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(76, 132, 84);
    doc.text("INVOICE DETAILS:", rightCol, 75);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(`Invoice No: INV-${Date.now().toString().slice(-8)}`, rightCol, 83);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })}`, rightCol, 90);
    doc.text(`Time: ${new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`, rightCol, 97);
    
    // Table Header
    const tableTop = 118;
    doc.setFillColor(76, 132, 84);
    doc.roundedRect(margin, tableTop, pageWidth - (margin * 2), 12, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("S.No", margin + 5, tableTop + 8);
    doc.text("Item Description", margin + 20, tableTop + 8);
    doc.text("Qty", 120, tableTop + 8);
    doc.text("Rate (Rs.)", 138, tableTop + 8);
    doc.text("Amount (Rs.)", 167, tableTop + 8);
    
    // Table rows
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    let yPos = tableTop + 22;
    
    items.forEach((item, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 248);
        doc.rect(margin, yPos - 6, pageWidth - (margin * 2), 12, 'F');
      }
      
      doc.setFontSize(9);
      doc.text((index + 1).toString(), margin + 5, yPos);
      
      const itemTitle = item.title.length > 35 ? item.title.substring(0, 32) + '...' : item.title;
      doc.text(itemTitle, margin + 20, yPos);
      doc.text(item.quantity.toString(), 122, yPos);
      doc.text(item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 140, yPos);
      doc.text((item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 170, yPos);
      yPos += 12;
    });
    
    // Table bottom border
    doc.setDrawColor(76, 132, 84);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    // Summary section
    yPos += 12;
    const summaryX = 125;
    
    // Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Subtotal:", summaryX, yPos);
    doc.text(`Rs. ${getTotalPrice().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 167, yPos);
    
    // Discount if applied
    if (appliedCoupon) {
      yPos += 8;
      doc.setTextColor(34, 139, 34);
      doc.text(`Discount (${appliedCoupon.code}):`, summaryX, yPos);
      doc.text(`-Rs. ${calculateDiscount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 167, yPos);
      doc.setTextColor(40, 40, 40);
    }
    
    // Grand Total Box
    yPos += 12;
    doc.setFillColor(76, 132, 84);
    doc.roundedRect(summaryX - 5, yPos - 6, pageWidth - summaryX - margin + 5, 14, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("GRAND TOTAL:", summaryX, yPos + 3);
    doc.text(`Rs. ${getFinalTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 167, yPos + 3);
    
    // Payment Status
    yPos += 22;
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("✓ PAYMENT RECEIVED", pageWidth / 2, yPos, { align: "center" });
    
    // Footer section
    const footerY = pageHeight - 45;
    
    // Decorative line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    // Thank you message
    doc.setTextColor(76, 132, 84);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Thank You for Shopping with Us!", pageWidth / 2, footerY + 12, { align: "center" });
    
    // Contact info
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("Al Falah Boutique | Premium Fashion & Accessories", pageWidth / 2, footerY + 22, { align: "center" });
    doc.text("For queries, please contact us at our store", pageWidth / 2, footerY + 29, { align: "center" });
    
    // Terms note
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("* This is a computer-generated invoice and does not require a signature.", pageWidth / 2, footerY + 38, { align: "center" });
    
    doc.save(`AlFalahBoutique-Invoice-${Date.now()}.pdf`);
  };

  const handleCompleteOrder = async () => {
    if (!name || !phone || !address || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!paymentScreenshotUrl) {
      toast.error("Please upload your payment screenshot before completing the order");
      return;
    }

    console.log('Starting order submission...');
    
    try {
      const orderData = {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_address: address,
        items: items as any,
        subtotal: getTotalPrice(),
        discount: calculateDiscount(),
        total: getFinalTotal(),
        coupon_code: appliedCoupon?.code || null,
        status: 'pending',
        payment_screenshot: paymentScreenshotUrl
      };

      console.log('Order data:', orderData);

      const { error: orderError, data: orderResult } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (orderError) {
        console.error('Order insert error:', orderError);
        throw orderError;
      }

      console.log('Order created:', orderResult);

      if (appliedCoupon) {
        console.log('Updating coupon usage...');
        const { error: couponError } = await supabase
          .from('coupons')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id);
        
        if (couponError) {
          console.error('Coupon update error:', couponError);
        }
      }

      setOrderCompleted(true);
      toast.success("Order placed successfully! Download your invoice below.");
      console.log('Order completed successfully');
    } catch (error: any) {
      console.error('Order error:', error);
      toast.error(error.message || "Failed to complete order. Please try again.");
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto">
            <LogIn className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-3xl font-serif font-bold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-8">
              Please sign in or create an account to complete your purchase. This helps us keep track of your orders and provide better service.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate("/auth")} size="lg" className="w-full">
                Sign In / Sign Up
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-serif font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Add some products to your cart to checkout</p>
          <Button onClick={() => navigate("/")}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-serif font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={orderCompleted}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={orderCompleted}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                    disabled={orderCompleted}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your complete delivery address"
                    rows={3}
                    required
                    disabled={orderCompleted}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions for your order"
                    rows={2}
                    disabled={orderCompleted}
                  />
                </div>
              </CardContent>
            </Card>

            {!orderCompleted && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <span className="text-3xl">💳</span>
                    Payment Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentQRUrl ? (
                    <>
                      <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-lg border-2 border-primary/30">
                        <img 
                          src={paymentQRUrl} 
                          alt="Payment QR Code" 
                          className="w-72 h-72 object-contain"
                        />
                        <div className="text-center space-y-2">
                          <p className="font-semibold text-lg text-primary">
                            Scan to Pay ₹{getFinalTotal().toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Scan this QR code using any UPI app to complete your payment
                          </p>
                        </div>
                      </div>
                      <div className="bg-boutique-cream/30 p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">📱 Payment Steps:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                          <li>Scan the QR code above</li>
                          <li>Verify the amount: ₹{getFinalTotal().toFixed(2)}</li>
                          <li>Complete the payment</li>
                          <li className="font-medium text-primary">Upload payment screenshot below</li>
                        </ol>
                      </div>
                      
                      {/* Payment Screenshot Upload */}
                      <div className="border-2 border-dashed border-primary/40 rounded-lg p-6 bg-white">
                        <div className="text-center">
                          <p className="font-semibold text-base mb-2 text-primary">
                            📸 Upload Payment Screenshot *
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            After completing payment, upload a screenshot as proof
                          </p>
                          
                          {paymentScreenshotUrl ? (
                            <div className="space-y-3">
                              <div className="relative inline-block">
                                <img 
                                  src={paymentScreenshotUrl} 
                                  alt="Payment Screenshot" 
                                  className="max-w-xs max-h-48 object-contain rounded-lg border border-green-300"
                                />
                                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
                                <Check className="h-4 w-4" />
                                Payment screenshot uploaded
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPaymentScreenshot(null);
                                  setPaymentScreenshotUrl("");
                                }}
                              >
                                Upload Different Screenshot
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleScreenshotUpload}
                                className="hidden"
                                id="screenshot-upload"
                                disabled={uploadingScreenshot}
                              />
                              <label htmlFor="screenshot-upload">
                                <Button
                                  variant="outline"
                                  className="cursor-pointer border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                  disabled={uploadingScreenshot}
                                  asChild
                                >
                                  <span>
                                    {uploadingScreenshot ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Choose Screenshot
                                      </>
                                    )}
                                  </span>
                                </Button>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 font-medium mb-2">⚠️ Payment QR Not Available</p>
                      <p className="text-sm text-yellow-700">
                        Please complete your order and we'll contact you with payment details
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 pb-4 border-b border-border">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                        <p className="text-sm font-medium">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {!orderCompleted && (
                    <div className="space-y-2">
                      <Label htmlFor="coupon">Have a coupon?</Label>
                      <div className="flex gap-2">
                        <Input
                          id="coupon"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code"
                          disabled={!!appliedCoupon}
                        />
                        <Button 
                          onClick={handleApplyCoupon}
                          disabled={!!appliedCoupon}
                          variant="outline"
                        >
                          Apply
                        </Button>
                      </div>
                      {appliedCoupon && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          Coupon applied: {appliedCoupon.code}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-base">
                      <span>Subtotal:</span>
                      <span>₹{getTotalPrice().toFixed(2)}</span>
                    </div>
                    
                    {appliedCoupon && (
                      <div className="flex justify-between text-base text-green-600">
                        <span>Discount:</span>
                        <span>-₹{calculateDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>₹{getFinalTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!orderCompleted ? (
              <div className="space-y-3">
                {!paymentScreenshotUrl && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-amber-800">
                      <ImageIcon className="h-4 w-4 inline mr-1" />
                      Please upload payment screenshot to complete your order
                    </p>
                  </div>
                )}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCompleteOrder}
                  disabled={!paymentScreenshotUrl}
                >
                  {paymentScreenshotUrl ? "Complete Order" : "Upload Payment Screenshot First"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <Check className="h-5 w-5" />
                      <p className="font-semibold">Order Placed Successfully!</p>
                    </div>
                    <p className="text-sm text-green-600">
                      We will verify your payment and contact you soon for delivery confirmation.
                    </p>
                  </CardContent>
                </Card>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    generateInvoicePDF();
                    clearCart();
                    setTimeout(() => navigate("/"), 1000);
                  }}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Invoice & Continue
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
