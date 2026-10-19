/**
 * Tenant boundary for this deployed barbershop app.
 * Set VITE_BARBERSHOP_ID in deployment settings for each new barbershop.
 * The fallback keeps the existing Thebrooklynn deployment scoped correctly.
 */
const configuredBarbershopId = import.meta.env.VITE_BARBERSHOP_ID?.trim();

export const BARBERSHOP_ID =
  configuredBarbershopId || "836d4853-d45e-44cb-9b87-14b88fc0fe48";

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(BARBERSHOP_ID)) {
  throw new Error("VITE_BARBERSHOP_ID precisa ser um UUID válido.");
}
