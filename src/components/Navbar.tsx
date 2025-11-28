import { Link } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <h1 className="text-2xl font-serif font-semibold text-primary">
            Al Falah Boutique
          </h1>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            Shop
          </Link>
          <CartDrawer />
        </div>
      </div>
    </nav>
  );
};
