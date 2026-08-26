import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://mjgneisuyrlvvcjtdaaz.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ25laXN1eXJsdnZjanRkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDgxNTQsImV4cCI6MjEwMjI4NDE1NH0.mewZu8lT1EZ98SQORL2Cy0tpH719IaHvqKiv-Oy1FbI'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://menu.krishnaanandam.in'),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ25laXN1eXJsdnZjanRkYWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcwODE1NCwiZXhwIjoyMTAyMjg0MTU0fQ.0DfWYxbgxmwrzBF58RXP6vxrJqrQyvfXzJ8OtnkGslc'),
  PAYMENT_SECRET_KEY: z.string().optional().default(''),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(''),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().optional().default('ka_restaurent_order'),
  WHATSAPP_MANAGEMENT_PHONE: z.string().optional().default('919198433007'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedClient: ClientEnv | null = null;
let cachedServer: ServerEnv | null = null;

function readEnv(): NodeJS.ProcessEnv {
  return process.env;
}

export function getClientEnv(): ClientEnv {
  if (cachedClient) return cachedClient;
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: readEnv().NEXT_PUBLIC_SUPABASE_URL || 'https://mjgneisuyrlvvcjtdaaz.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ25laXN1eXJsdnZjanRkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDgxNTQsImV4cCI6MjEwMjI4NDE1NH0.mewZu8lT1EZ98SQORL2Cy0tpH719IaHvqKiv-Oy1FbI',
    NEXT_PUBLIC_SITE_URL: readEnv().NEXT_PUBLIC_SITE_URL || 'https://menu.krishnaanandam.in',
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
    NEXT_PUBLIC_SUPABASE_URL: readEnv().NEXT_PUBLIC_SUPABASE_URL || 'https://mjgneisuyrlvvcjtdaaz.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ25laXN1eXJsdnZjanRkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDgxNTQsImV4cCI6MjEwMjI4NDE1NH0.mewZu8lT1EZ98SQORL2Cy0tpH719IaHvqKiv-Oy1FbI',
    NEXT_PUBLIC_SITE_URL: readEnv().NEXT_PUBLIC_SITE_URL || 'https://menu.krishnaanandam.in',
    SUPABASE_SERVICE_ROLE_KEY: readEnv().SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ25laXN1eXJsdnZjanRkYWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcwODE1NCwiZXhwIjoyMTAyMjg0MTU0fQ.0DfWYxbgxmwrzBF58RXP6vxrJqrQyvfXzJ8OtnkGslc',
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