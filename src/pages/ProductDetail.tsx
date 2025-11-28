import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ProductDetail = () => {
  const { handle } = useParams();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState(0);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await fetchProducts(100);
        const foundProduct = products.find(p => p.node.handle === handle);
        
        if (foundProduct) {
          setProduct(foundProduct);
          if (foundProduct.node.variants.edges.length > 0) {
            setSelectedVariantId(foundProduct.node.variants.edges[0].node.id);
          }
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [handle]);

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

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-serif font-semibold mb-4">Product not found</h1>
          <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { node } = product;
  const selectedVariant = node.variants.edges.find(v => v.node.id === selectedVariantId)?.node || node.variants.edges[0]?.node;

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    const cartItem = {
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success('Added to cart', {
      description: `${node.title} has been added to your cart.`,
      position: 'top-center',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
              {node.images.edges[selectedImage]?.node.url ? (
                <img
                  src={node.images.edges[selectedImage].node.url}
                  alt={node.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </div>
            
            {node.images.edges.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {node.images.edges.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                      selectedImage === index ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img
                      src={image.node.url}
                      alt={`${node.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-serif font-bold mb-4">{node.title}</h1>
              <p className="text-3xl font-semibold text-primary">
                {selectedVariant?.price.currencyCode} {parseFloat(selectedVariant?.price.amount || '0').toFixed(2)}
              </p>
            </div>

            {node.description && (
              <div>
                <h2 className="text-xl font-serif font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground">{node.description}</p>
              </div>
            )}

            {node.variants.edges.length > 1 && (
              <div>
                <h2 className="text-xl font-serif font-semibold mb-3">Select Variant</h2>
                <div className="space-y-2">
                  {node.variants.edges.map((variant) => (
                    <button
                      key={variant.node.id}
                      onClick={() => setSelectedVariantId(variant.node.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedVariantId === variant.node.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{variant.node.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {variant.node.price.currencyCode} {parseFloat(variant.node.price.amount).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleAddToCart}
              size="lg"
              className="w-full"
              disabled={!selectedVariant?.availableForSale}
            >
              {selectedVariant?.availableForSale ? 'Add to Cart' : 'Out of Stock'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
