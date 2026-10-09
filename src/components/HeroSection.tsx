import heroImage from "@/assets/hero-barbershop.jpg";
import logoImage from "@/assets/WhatsApp Image 2026-10-09 at 13.47.26.jpeg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>
      <div className="relative z-10 flex w-full justify-center px-4 py-12">
        <img
          src={logoImage}
          alt="Thebrooklynn Barbearia"
          className="w-full max-w-[min(90vw,620px)] h-auto object-contain drop-shadow-[0_0_24px_rgba(212,165,65,0.18)]"
          fetchPriority="high"
        />
      </div>
    </section>
  );
};

export default HeroSection;
