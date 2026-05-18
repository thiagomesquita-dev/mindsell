import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Brain, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const APP_URL = "https://app.mindsell.ia.br";

const navItems = [
  { label: "Como funciona", to: "/#como-funciona" },
  { label: "Resultados", to: "/#resultados" },
  { label: "Planos", to: "/planos" },
  { label: "Blog", to: "/blog" },
];

export function InstitutionalHeader() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o menu sempre que a rota mudar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  const isActive = (to: string) => {
    if (to.startsWith("/#")) return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          <span className="text-xl font-heading font-bold text-foreground">MindSell</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`hover:text-foreground transition-colors ${isActive(item.to) ? "text-foreground" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href={APP_URL} className="hidden sm:inline-flex">
            <Button variant="outline" size="sm">Entrar</Button>
          </a>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            <a href={APP_URL} className="sm:hidden">
              <Button variant="outline" size="sm">Entrar</Button>
            </a>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu"
                  className="h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="font-heading">MindSell</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`px-3 py-3 rounded-md text-base font-medium transition-colors hover:bg-accent ${
                        isActive(item.to) ? "text-foreground bg-accent/50" : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <a
                    href={APP_URL}
                    onClick={() => setMobileOpen(false)}
                    className="mt-4"
                  >
                    <Button className="w-full" size="lg">Entrar no app</Button>
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
