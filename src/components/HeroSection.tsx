import logoImage from "@/assets/WhatsApp Image 2026-10-09 at 13.47.26.jpeg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[48vh] flex items-center justify-center overflow-hidden bg-background">
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-8 text-center">
        <img
          src={logoImage}
          alt="Thebrooklynn Barbearia"
          className="w-full max-w-[min(68vw,360px)] h-auto object-contain"
          fetchPriority="high"
        />
        <p className="mt-4 max-w-md text-sm font-medium tracking-[0.16em] text-primary sm:text-base">
          ESTILO NA RÉGUA. ATITUDE EM CADA DETALHE.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
