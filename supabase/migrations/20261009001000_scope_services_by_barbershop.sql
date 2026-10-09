-- Verifique o esquema antes de executar qualquer alteração.
-- A tabela public.services atualmente conhecida no app não tem barbershop_id.
-- Este script apenas diagnostica a estrutura e NÃO altera dados.

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'services'
ORDER BY ordinal_position;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('barbershop_id', 'barbershop')
ORDER BY table_name, ordinal_position;
