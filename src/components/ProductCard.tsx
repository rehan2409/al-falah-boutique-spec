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
    <Card className="group overflow-hidden hover-lift border-2 hover:border-primary transition-all duration-300 h-full">
      <CardContent className="p-0">
        <div 
          className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-muted to-muted/50 cursor-pointer relative"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 p-5 bg-card">
        <div className="w-full" onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
          <h3 className="font-serif text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
          <p className="text-2xl font-bold text-primary">
            INR {product.price.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <Button 
            className="flex-1 font-semibold" 
            onClick={() => navigate(`/product/${product.id}`)}
            variant="outline"
            size="lg"
          >
            View Details
          </Button>
          <Button 
            onClick={handleAddToCart}
            size="lg"
            className="px-6"
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
