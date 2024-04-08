import "dotenv/config";
import { API_CONSTANTS } from "grammy";
import { z } from "zod";

const envVariablesSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  BOT_TOKEN: z.string(),
  DB_URL: z.string(),
  BOT_ALLOWED_UPDATES: z
    .array(z.enum(API_CONSTANTS.ALL_UPDATE_TYPES))
    .default(["message", "callback_query"]),
  BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
  BOT_WEBHOOK: z.string(),
  BOT_SERVER_HOST: z.string().default("0.0.0.0"),
  BOT_SERVER_PORT: z.string().default("80"),
});

export const envVariables = envVariablesSchema.parse(process.env);
