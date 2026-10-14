-- Permite registrar o valor realmente cobrado em cada atendimento,
-- sem alterar o preço padrão do serviço para todos os clientes.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS final_price numeric(10,2);

COMMENT ON COLUMN public.appointments.final_price IS
'Valor final cobrado neste agendamento; quando NULL, usa o preço cadastrado no serviço.';
