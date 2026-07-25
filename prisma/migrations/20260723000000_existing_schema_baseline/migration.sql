-- Baseline de adoção do schema existente da plataforma SST até o Checkpoint 10.11.
-- Esta migration NÃO cria o schema em um banco vazio.
-- Banco existente: execute `prisma migrate resolve --applied 20260723000000_existing_schema_baseline`.
-- Banco novo: use DB_SCHEMA_MODE=bootstrap uma única vez; depois altere para DB_SCHEMA_MODE=migrate.
SELECT 1;
