import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  
  const { node } = product;
  const imageUrl = node.images.edges[0]?.node.url;
  const price = node.priceRange.minVariantPrice;
  const defaultVariant = node.variants.edges[0]?.node;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!defaultVariant) {
      toast.error('Product variant not available');
      return;
    }

    const cartItem = {
      product,
      variantId: defaultVariant.id,
      variantTitle: defaultVariant.title,
      price: defaultVariant.price,
      quantity: 1,
      selectedOptions: defaultVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success('Added to cart', {
      description: `${node.title} has been added to your cart.`,
      position: 'top-center',
    });
  };

  return (
    <Link to={`/product/${node.handle}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
        <CardContent className="p-0">
          <div className="aspect-[3/4] overflow-hidden bg-muted">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={node.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 p-4">
          <div className="w-full">
            <h3 className="font-serif text-lg font-semibold mb-1 line-clamp-2">
              {node.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {node.description}
            </p>
            <p className="text-xl font-semibold text-primary">
              {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
            </p>
          </div>
          <Button 
            onClick={handleAddToCart}
            className="w-full"
            variant="default"
          >
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};
