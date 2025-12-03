import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  customerName: string;
  customerEmail: string;
  orderId: string;
  status: "accepted" | "rejected";
  items: Array<{ title: string; quantity: number; price: number }>;
  total: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, orderId, status, items, total }: OrderEmailRequest = await req.json();

    console.log(`Sending ${status} email to ${customerEmail} for order ${orderId}`);

    const isAccepted = status === "accepted";
    const subject = isAccepted 
      ? "🎉 Your Al Falah Boutique Order is Confirmed!" 
      : "Order Update from Al Falah Boutique";

    const itemsList = items.map(item => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.title}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>`
    ).join("");

    const acceptedContent = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f5f7f0 0%, #faf9f6 100%); padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4a5d3a; font-size: 28px; margin: 0;">Al Falah Boutique</h1>
          <p style="color: #8b7355; font-size: 14px; margin: 5px 0;">Elegant Fashion for Every Occasion</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #4a5d3a; margin-top: 0;">Order Confirmed! ✨</h2>
          <p style="color: #555;">Dear ${customerName},</p>
          <p style="color: #555;">Great news! Your order has been <strong style="color: #4a5d3a;">accepted</strong> and is being prepared with care.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #666;"><strong>Order ID:</strong> ${orderId.slice(0, 8).toUpperCase()}</p>
          </div>
          
          <h3 style="color: #4a5d3a; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f7f0;">
                <th style="padding: 10px; text-align: left; color: #4a5d3a;">Item</th>
                <th style="padding: 10px; text-align: center; color: #4a5d3a;">Qty</th>
                <th style="padding: 10px; text-align: right; color: #4a5d3a;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 8px; text-align: right; font-weight: bold; color: #4a5d3a;">Total:</td>
                <td style="padding: 15px 8px; text-align: right; font-weight: bold; color: #d4af37; font-size: 18px;">₹${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="color: #555; margin-top: 25px;">We will notify you once your order is shipped. Thank you for shopping with us!</p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #8b7355; font-size: 12px; margin: 5px 0;">With love from Al Falah Boutique 💚</p>
          <p style="color: #999; font-size: 11px;">If you have any questions, please reply to this email.</p>
        </div>
      </div>
    `;

    const rejectedContent = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #faf5f5 0%, #faf9f6 100%); padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4a5d3a; font-size: 28px; margin: 0;">Al Falah Boutique</h1>
          <p style="color: #8b7355; font-size: 14px; margin: 5px 0;">Elegant Fashion for Every Occasion</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #8b4513; margin-top: 0;">Order Update</h2>
          <p style="color: #555;">Dear ${customerName},</p>
          <p style="color: #555;">We regret to inform you that your order could not be processed at this time.</p>
          
          <div style="background: #fff5f5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #d9534f;">
            <p style="margin: 0; color: #666;"><strong>Order ID:</strong> ${orderId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 10px 0 0; color: #8b4513;">Status: <strong>Not Approved</strong></p>
          </div>
          
          <p style="color: #555;">This could be due to payment verification issues or stock availability. If you believe this is an error, please contact us and we'll be happy to assist you.</p>
          
          <p style="color: #555; margin-top: 20px;">We apologize for any inconvenience and hope to serve you again soon.</p>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #8b7355; font-size: 12px; margin: 5px 0;">Al Falah Boutique Team</p>
          <p style="color: #999; font-size: 11px;">If you have any questions, please reply to this email.</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Al Falah Boutique <onboarding@resend.dev>",
      to: [customerEmail],
      subject: subject,
      html: isAccepted ? acceptedContent : rejectedContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
