import logoImage from "@/assets/WhatsApp Image 2026-10-09 at 13.47.26.jpeg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-background">
      <div className="relative z-10 flex w-full justify-center px-4 py-12">
        <img
          src={logoImage}
          alt="Thebrooklynn Barbearia"
          className="w-full max-w-[min(90vw,620px)] h-auto object-contain"
          fetchPriority="high"
        />
      </div>
    </section>
  );
};

export default HeroSection;
