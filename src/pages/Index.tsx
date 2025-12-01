import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  available: boolean;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (category?: string) => {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('available', true);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    setLoading(true);
    setSelectedCategory(category);
    loadProducts(category);
  };

  const handleShowAll = () => {
    setLoading(true);
    setSelectedCategory(null);
    loadProducts();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-boutique-gradient-start via-boutique-hero to-boutique-gradient-end">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-boutique-gold rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          </div>
          <div className="relative z-10 text-center px-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 text-white animate-fade-in drop-shadow-lg">
              Al Falah Boutique
            </h1>
            <p className="text-xl md:text-3xl text-white/90 mb-8 animate-slide-up font-light" style={{ animationDelay: '0.2s' }}>
              Elegant Modest Fashion for the Modern Woman
            </p>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto animate-scale-in" style={{ animationDelay: '0.4s' }}>
              Discover our collection of readymade garments, abayas, dress materials, and handbags
            </p>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-boutique-cream/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-8 animate-fade-in">
              Shop by Category
            </h2>
            <div className="flex justify-center mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={handleShowAll}
                className="mr-2 px-8 py-6 text-base font-semibold"
                size="lg"
              >
                All Products
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Readymade', value: 'readymade' },
                { label: 'Abayas', value: 'abayas' },
                { label: 'Dress Materials', value: 'dress_materials' },
                { label: 'Handbags', value: 'handbags' }
              ].map((category, idx) => (
                <div
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className={`aspect-square rounded-2xl bg-card border-2 hover-lift ${
                    selectedCategory === category.value 
                      ? 'border-primary shadow-lg ring-4 ring-primary/20' 
                      : 'border-border hover:border-primary'
                  } flex items-center justify-center cursor-pointer group animate-scale-in`}
                  style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                >
                  <h3 className={`text-xl md:text-2xl font-serif font-bold group-hover:text-primary transition-all duration-300 ${
                    selectedCategory === category.value ? 'text-primary scale-110' : ''
                  }`}>
                    {category.label}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-center mb-16 animate-fade-in">
              Our Collection
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 animate-fade-in">
                <p className="text-2xl font-serif text-muted-foreground mb-4">
                  No products found
                </p>
                <p className="text-lg text-muted-foreground">
                  Our collection is coming soon. Please check back later!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {products.map((product, idx) => (
                  <div 
                    key={product.id} 
                    className="animate-scale-in"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="gradient-shine text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Al Falah Boutique
          </h3>
          <p className="text-white/90 mb-6 text-lg">
            Premium modest fashion for the modern woman
          </p>
          <div className="w-20 h-1 bg-white/40 mx-auto mb-6 rounded-full" />
          <p className="text-sm text-white/70">
            © 2025 Al Falah Boutique. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
