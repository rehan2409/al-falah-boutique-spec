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
import { Download, Check } from "lucide-react";
import jsPDF from "jspdf";

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
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [paymentQRUrl, setPaymentQRUrl] = useState("");
  const [orderCompleted, setOrderCompleted] = useState(false);

  useEffect(() => {
    loadPaymentQR();
  }, []);

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
        toast.error(`Minimum purchase of INR ${coupon.min_purchase} required`);
        return;
      }

      setAppliedCoupon(coupon);
      toast.success("Coupon applied successfully!");
    } catch (error: any) {
      toast.error("Failed to apply coupon");
    }
  };

  const generateInvoicePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header with gradient effect
    doc.setFillColor(128, 90, 213);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text("Al Falah Boutique", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("INVOICE / RECEIPT", pageWidth / 2, 32, { align: "center" });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Customer details section
    doc.setFillColor(245, 245, 250);
    doc.rect(15, 55, pageWidth - 30, 40, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Customer Information", 20, 64);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${name}`, 20, 72);
    doc.text(`Phone: ${phone}`, 20, 79);
    doc.text(`Address: ${address}`, 20, 86);
    
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 20, 72, { align: "right" });
    doc.text(`Invoice #: ${Date.now().toString().slice(-8)}`, pageWidth - 20, 79, { align: "right" });
    
    // Table header
    const tableTop = 105;
    doc.setFillColor(128, 90, 213);
    doc.rect(15, tableTop, pageWidth - 30, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("ITEM", 20, tableTop + 7);
    doc.text("QTY", 115, tableTop + 7);
    doc.text("PRICE", 140, tableTop + 7);
    doc.text("TOTAL", 170, tableTop + 7);
    
    // Table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    let yPos = tableTop + 17;
    
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(15, yPos - 5, pageWidth - 30, 9, 'F');
      }
      
      const itemTitle = item.title.length > 40 ? item.title.substring(0, 37) + '...' : item.title;
      doc.text(itemTitle, 20, yPos);
      doc.text(item.quantity.toString(), 115, yPos);
      doc.text(`₹${item.price.toFixed(2)}`, 140, yPos);
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 170, yPos);
      yPos += 9;
    });
    
    // Summary section
    yPos += 10;
    doc.setDrawColor(128, 90, 213);
    doc.setLineWidth(0.5);
    doc.line(120, yPos, pageWidth - 15, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.text("Subtotal:", 120, yPos);
    doc.text(`₹${getTotalPrice().toFixed(2)}`, 170, yPos);
    
    if (appliedCoupon) {
      yPos += 7;
      doc.setTextColor(34, 197, 94);
      doc.text(`Discount (${appliedCoupon.code}):`, 120, yPos);
      doc.text(`-₹${calculateDiscount().toFixed(2)}`, 170, yPos);
      doc.setTextColor(0, 0, 0);
    }
    
    yPos += 10;
    doc.setFillColor(128, 90, 213);
    doc.rect(115, yPos - 5, pageWidth - 130, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("GRAND TOTAL:", 120, yPos + 3);
    doc.text(`₹${getFinalTotal().toFixed(2)}`, 170, yPos + 3);
    
    // Footer
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text("Thank you for shopping with Al Falah Boutique!", pageWidth / 2, pageHeight - 20, { align: "center" });
    doc.text("For any queries, please contact us", pageWidth / 2, pageHeight - 13, { align: "center" });
    
    doc.save(`AlFalahBoutique-Invoice-${Date.now()}.pdf`);
  };

  const handleCompleteOrder = async () => {
    if (!name || !phone || !address) {
      toast.error("Please fill in all required fields");
      return;
    }

    console.log('Starting order submission...');
    
    try {
      // Save order to database
      const orderData = {
        customer_name: name,
        customer_email: phone + "@order.com",
        customer_phone: phone,
        customer_address: address,
        items: items as any,
        subtotal: getTotalPrice(),
        discount: calculateDiscount(),
        total: getFinalTotal(),
        coupon_code: appliedCoupon?.code || null,
        status: 'pending'
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

      // Update coupon usage
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
                          <li>Click "Complete Order" below after payment</li>
                        </ol>
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
                          INR {(item.price * item.quantity).toFixed(2)}
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
                      <span>INR {getTotalPrice().toFixed(2)}</span>
                    </div>
                    
                    {appliedCoupon && (
                      <div className="flex justify-between text-base text-green-600">
                        <span>Discount:</span>
                        <span>-INR {calculateDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>INR {getFinalTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!orderCompleted ? (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCompleteOrder}
              >
                Complete Order
              </Button>
            ) : (
              <div className="space-y-3">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <Check className="h-5 w-5" />
                      <p className="font-semibold">Order Placed Successfully!</p>
                    </div>
                    <p className="text-sm text-green-600">
                      We will contact you soon for delivery confirmation.
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
