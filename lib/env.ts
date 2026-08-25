import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAYMENT_SECRET_KEY: z.string().optional().default(''),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(''),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Parse on import — fail fast at boot if env is malformed.
// Lazy parse: env is read on first call, not at module load, so Next.js
// can still type-check without .env.local populated.
let cachedClient: ClientEnv | null = null;
let cachedServer: ServerEnv | null = null;

function readEnv(): NodeJS.ProcessEnv {
  // process.env is populated by Next.js; this helper exists so we have one
  // place to add fallback behaviour (e.g. .env.local on the server during build).
  return process.env;
}

export function getClientEnv(): ClientEnv {
  if (cachedClient) return cachedClient;
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: readEnv().NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: readEnv().NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid public environment variables:\n${issues}\n` +
        `See .env.example for the required keys.`,
    );
  }
  cachedClient = parsed.data;
  return cachedClient;
}

export function getServerEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: readEnv().NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: readEnv().NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: readEnv().SUPABASE_SERVICE_ROLE_KEY,
    PAYMENT_SECRET_KEY: readEnv().PAYMENT_SECRET_KEY,
    PAYMENT_WEBHOOK_SECRET: readEnv().PAYMENT_WEBHOOK_SECRET,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid server environment variables:\n${issues}\n` +
        `SUPABASE_SERVICE_ROLE_KEY is required for server-only operations.`,
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}