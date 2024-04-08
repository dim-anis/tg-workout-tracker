import fastify from "fastify";
import { webhookCallback } from "grammy";
import type { Bot } from "@/bot/index.js";
import { envVariables } from "@/config.js";

export const createServer = async (bot: Bot) => {
  const server = fastify();

  // server.setErrorHandler(async (error, request, response) => {
  //   logger.error(error);
  //
  //   await response.status(500).send({ error: "Oops! Something went wrong." });
  // });

  server.get("/", () => ({ status: true }));

  server.get(`/${bot.token}`, async (request, response) => {
    const hostname = request.headers["x-forwarded-host"];
    if (typeof hostname === "string") {
      const webhookUrl = new URL(bot.token, `https://${hostname}`).href;
      await bot.api.setWebhook(webhookUrl, {
        allowed_updates: envVariables.BOT_ALLOWED_UPDATES,
      });
      await response.send({
        status: true,
      });
    } else {
      await response.status(500).send({
        status: false,
      });
    }
  });

  server.post(`/${bot.token}`, webhookCallback(bot, "fastify"));

  return server;
};
