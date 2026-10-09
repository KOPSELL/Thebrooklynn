import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import corteImage from "@/assets/corte-service.png";
import luzesImage from "@/assets/luzes-service.png";
import barbaImage from "@/assets/barba-service.png";

const serviceImages: Record<string, string> = {
  "Corte": corteImage,
  "Luzes": luzesImage,
  "Barba": barbaImage,
};

const serviceIcons: Record<string, string> = {
  "Corte + Barba": "💈",
};

const ServiceCards = () => {
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("barbershop_id", "836d4853-d45e-44cb-9b87-14b88fc0fe48");
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
          <span className="text-gold-gradient">Nossos Serviços</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Qualidade e estilo em cada detalhe
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services?.map((service) => (
            <div
              key={service.id}
              className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 group"
            >
              {serviceImages[service.name] ? (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-2 border-primary/30">
                  <img src={serviceImages[service.name]} alt={service.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="text-4xl mb-4">{serviceIcons[service.name] || "💈"}</div>
              )}
              <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                {service.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mb-2">
                <Clock className="w-3 h-3" />
                {service.duration_minutes} min
              </p>
              <p className="text-xl font-bold text-primary">
                R$ {Number(service.price).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCards;
