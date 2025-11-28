import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts(50);
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-boutique-cream to-accent/20" />
          <div className="relative z-10 text-center px-4 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-4 text-foreground">
              Al Falah Boutique
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Elegant Modest Fashion for the Modern Woman
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our collection of readymade garments, abayas, dress materials, and handbags
            </p>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Readymade', 'Abayas', 'Dress Materials', 'Handbags'].map((category) => (
                <div
                  key={category}
                  className="aspect-square rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer group"
                >
                  <h3 className="text-lg font-serif font-semibold group-hover:text-primary transition-colors">
                    {category}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-12">
              Our Collection
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground mb-4">
                  No products found
                </p>
                <p className="text-muted-foreground">
                  Our collection is coming soon. Please check back later!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.node.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-serif font-semibold mb-4">
            Al Falah Boutique
          </h3>
          <p className="text-primary-foreground/80 mb-4">
            Premium modest fashion for the modern woman
          </p>
          <p className="text-sm text-primary-foreground/60">
            © 2025 Al Falah Boutique. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
