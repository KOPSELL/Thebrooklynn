import { Link } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import ServiceCards from "@/components/ServiceCards";
import BookingForm from "@/components/BookingForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <ServiceCards />
      <BookingForm />
      <footer className="py-8 text-center border-t border-border">
        <p className="text-sm text-muted-foreground mb-2">
          © 2026 <span className="text-primary font-semibold">The Brooklyn</span> Barbearia. Todos os direitos reservados.
        </p>
        <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Área do Barbeiro
        </Link>
      </footer>
    </div>
  );
};

export default Index;
