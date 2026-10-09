import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import corteImage from "@/assets/WhatsApp Image 2026-10-05 at 10.22.15.jpeg";
import barbaImage from "@/assets/barba.webp";
import comboImage from "@/assets/WhatsApp Image 2026-10-09 at 13.47.26.jpeg";
import sobrancelhaImage from "@/assets/sobrancelha.webp";

const normalize = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

const ServiceCards = () => {
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*");
      if (error) throw error;
      const order = ["corte", "corte + barba + sobrancelha", "barba", "sobrancelha"];
      const matching = (data ?? []).filter((service) => order.includes(normalize(service.name)));
      matching.sort((first, second) => {
        const firstScoped = first.barbershop_id === "836d4853-d45e-44cb-9b87-14b88fc0fe48" ? 0 : 1;
        const secondScoped = second.barbershop_id === "836d4853-d45e-44cb-9b87-14b88fc0fe48" ? 0 : 1;
        return firstScoped - secondScoped || order.indexOf(normalize(first.name)) - order.indexOf(normalize(second.name));
      });
      const seen = new Set<string>();
      return matching.filter((service) => {
        const name = normalize(service.name);
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      }).sort((first, second) => order.indexOf(normalize(first.name)) - order.indexOf(normalize(second.name)));
    },
  });

  const getServiceImage = (name: string) => {
    const normalized = normalize(name);
    if (normalized === "sobrancelha") return sobrancelhaImage;
    if (normalized === "corte") return corteImage;
    if (normalized === "barba") return barbaImage;
    if (normalized === "corte + barba + sobrancelha") return comboImage;
    return undefined;
  };

  return (
    <section className="py-10 md:py-12 px-3 md:px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
          <span className="text-gold-gradient">Nossos Serviços</span>
        </h2>
        <p className="text-center text-muted-foreground mb-6 md:mb-7">
          Qualidade e estilo em cada detalhe
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          {services?.map((service) => {
            const image = getServiceImage(service.name);
            return (
              <div
                key={service.id}
                className="bg-card border border-border rounded-xl p-4 md:p-5 text-center hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 group"
              >
                {image ? (
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full overflow-hidden border-2 border-primary/30">
                    <img src={image} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="text-3xl mb-3">💈</div>
                )}
                <h3 className="font-semibold text-base md:text-lg mb-1 group-hover:text-primary transition-colors">
                  {normalize(service.name) === "corte + barba + sobrancelha" ? "Corte + sobrancelha e barba" : service.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mb-2">
                  <Clock className="w-3 h-3" />
                  {service.duration_minutes} min
                </p>
                <p className="text-xl font-bold text-primary">
                  R$ {Number(service.price).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceCards;