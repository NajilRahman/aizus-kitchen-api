const { z } = require("zod");

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CLIENT_ORIGIN: z.string().optional().default("http://localhost:5173"),
  ADMIN_BOOTSTRAP_USER: z.string().optional(),
  ADMIN_BOOTSTRAP_PASS: z.string().optional(),
});

function getEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables:\n", parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}

module.exports = { getEnv };


