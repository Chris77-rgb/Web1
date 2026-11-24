/** Centralised, validated access to environment variables. */
function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export const env = {
  get appUrl() {
    return req("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
  get encryptionKey() {
    const k = req("ENCRYPTION_KEY");
    if (k.length < 32) throw new Error("ENCRYPTION_KEY debe tener al menos 32 caracteres");
    return k;
  },
  get storageDir() {
    return process.env.STORAGE_DIR || "./storage";
  },
  smtpUrl: () => process.env.SMTP_URL || "",
  mailFrom: () => process.env.MAIL_FROM || "Forjapp <no-reply@forjapp.local>",
  anthropicKey: () => process.env.ANTHROPIC_API_KEY || "",
  aiModel: () => process.env.AI_MODEL || "claude-opus-5-5",
  stripeKey: () => process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET || "",
  isProd: () => process.env.NODE_ENV === "production",
};
