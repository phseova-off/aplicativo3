import { z } from "zod";

/**
 * Schema de validação para variáveis de ambiente.
 * Separamos em "server" (nunca expostas ao browser) e "client" (prefixo NEXT_PUBLIC_).
 */
const serverSchema = z.object({
  // Supabase — service role (acesso admin, nunca vai pro client)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatória"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY deve começar com sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET é obrigatória"),
  STRIPE_PRICE_ID_STARTER: z.string().startsWith("price_", "STRIPE_PRICE_ID_STARTER deve começar com price_"),
  STRIPE_PRICE_ID_PRO: z.string().startsWith("price_", "STRIPE_PRICE_ID_PRO deve começar com price_"),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith("sk-", "OPENAI_API_KEY deve começar com sk-"),
});

const clientSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL deve ser uma URL válida"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, "NEXT_PUBLIC_APP_NAME é obrigatória"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória"),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY deve começar com pk_"),
});

// ── Validação ──────────────────────────────────────────────

function validateEnv() {
  const client = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });

  // Variáveis server só são validadas no servidor
  const isServer = typeof window === "undefined";

  const server = isServer
    ? serverSchema.safeParse({
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_PRICE_ID_STARTER: process.env.STRIPE_PRICE_ID_STARTER,
        STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      })
    : { success: true as const, data: {} as z.infer<typeof serverSchema> };

  if (!client.success) {
    const formatted = client.error.flatten().fieldErrors;
    console.error("❌ Variáveis de ambiente CLIENT inválidas:", formatted);
    throw new Error(
      `Variáveis de ambiente inválidas:\n${JSON.stringify(formatted, null, 2)}\n\nCopie .env.example para .env.local e preencha os valores.`
    );
  }

  if (!server.success) {
    const formatted = server.error.flatten().fieldErrors;
    console.error("❌ Variáveis de ambiente SERVER inválidas:", formatted);
    throw new Error(
      `Variáveis de ambiente inválidas:\n${JSON.stringify(formatted, null, 2)}\n\nCopie .env.example para .env.local e preencha os valores.`
    );
  }

  return { ...client.data, ...server.data };
}

export const env = validateEnv();

// ── Tipos exportados ───────────────────────────────────────

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
export type Env = ServerEnv & ClientEnv;
