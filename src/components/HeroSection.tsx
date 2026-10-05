import { useState, useEffect } from "react";
import heroImage from "@/assets/hero-barbershop.jpg";

const HeroSection = () => {
  const [displayText, setDisplayText] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const fullText = "EL PATRON";

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => setShowSubtitle(true), 300);
        setTimeout(() => setShowLine(true), 700);
      }
    }, 150);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="El Patron Barbearia"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
          <span className="text-gold-gradient">{displayText}</span>
          <span className="inline-block w-[3px] h-[0.8em] bg-primary ml-1 animate-pulse align-middle" 
                style={{ opacity: displayText.length < fullText.length ? 1 : 0, transition: "opacity 0.5s" }} />
        </h1>
        <p className={`text-lg md:text-xl text-muted-foreground tracking-[0.3em] uppercase transition-all duration-700 ${showSubtitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          Barbearia
        </p>
        <div className="mt-8 flex justify-center">
          <div className={`h-px bg-gold-gradient transition-all duration-700 ${showLine ? "w-24 opacity-100" : "w-0 opacity-0"}`} />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
