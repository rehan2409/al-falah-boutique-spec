import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const imageUrl = product.images[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0] || '/placeholder.svg',
    });
    toast.success("Added to cart!");
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
      <CardContent className="p-0">
        <div 
          className="aspect-[3/4] overflow-hidden bg-muted cursor-pointer"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
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
        <div className="w-full" onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
          <h3 className="font-serif text-lg font-semibold mb-1 line-clamp-2">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {product.description}
          </p>
          <p className="text-xl font-semibold text-primary">
            INR {product.price.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <Button 
            className="flex-1" 
            onClick={() => navigate(`/product/${product.id}`)}
            variant="outline"
          >
            View Details
          </Button>
          <Button 
            onClick={handleAddToCart}
            size="icon"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
