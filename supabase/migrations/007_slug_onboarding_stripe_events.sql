-- ============================================================
-- Doceria Pro — Migration 007
-- Adiciona: slug, onboarding_completo, dados operacionais em confeitarias;
--           tabela stripe_events_processados para idempotência de webhooks.
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeitarias — colunas extras                           │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.confeitarias
  -- Identificador único na URL do cardápio público
  ADD COLUMN IF NOT EXISTS slug                TEXT UNIQUE,
  -- Espelha confeiteiros.onboarding_completo para o novo schema
  ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN NOT NULL DEFAULT FALSE,
  -- Área de entrega (lista livre de bairros/cidades)
  ADD COLUMN IF NOT EXISTS area_entrega        TEXT,
  -- Prazo padrão de produção em dias úteis
  ADD COLUMN IF NOT EXISTS prazo_padrao_dias   INT DEFAULT 3 CHECK (prazo_padrao_dias >= 0),
  -- Horários de atendimento (texto livre: "Seg–Sex 9h–18h")
  ADD COLUMN IF NOT EXISTS horarios_atendimento TEXT,
  -- Menu público ativo?
  ADD COLUMN IF NOT EXISTS menu_publico_ativo  BOOLEAN NOT NULL DEFAULT FALSE;

-- Sincroniza onboarding_completo a partir da tabela legada
UPDATE public.confeitarias c
   SET onboarding_completo = ce.onboarding_completo
  FROM public.confeiteiros ce
 WHERE ce.id = c.id;

-- Gera slug inicial a partir do nome (normalizado, sem acentos, com hifens)
UPDATE public.confeitarias
   SET slug = LOWER(
     REGEXP_REPLACE(
       REGEXP_REPLACE(
         TRANSLATE(nome,
           'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
           'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
         ),
       '[^a-zA-Z0-9\s-]', '', 'g'),   -- remove non-alphanumeric
     '\s+', '-', 'g')                 -- spaces → hyphens
   )
 WHERE slug IS NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  stripe_events_processados                               │
-- │                                                          │
-- │  Tabela de idempotência para webhooks Stripe.            │
-- │  Garante que o mesmo evento não seja processado 2x       │
-- │  mesmo que o Stripe reenvie por timeout.                 │
-- │                                                          │
-- │  Sem RLS — apenas service_role acessa (webhooks).        │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.stripe_events_processados (
  stripe_event_id  TEXT        PRIMARY KEY,
  tipo             TEXT        NOT NULL,
  -- Dados relevantes do evento (para auditoria/debug)
  payload_resumo   JSONB,
  processado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para limpeza periódica (eventos > 90 dias)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processado_em
  ON public.stripe_events_processados (processado_em);

-- Trigger para atualizar confeitarios.onboarding_completo quando confeiteiros muda
CREATE OR REPLACE FUNCTION public.sync_onboarding_completo()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  IF NEW.onboarding_completo IS DISTINCT FROM OLD.onboarding_completo THEN
    UPDATE public.confeitarias
       SET onboarding_completo = NEW.onboarding_completo,
           updated_at          = NOW()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER confeiteiros_sync_onboarding
  AFTER UPDATE OF onboarding_completo ON public.confeiteiros
  FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_completo();

ANALYZE public.confeitarias;
ANALYZE public.stripe_events_processados;
