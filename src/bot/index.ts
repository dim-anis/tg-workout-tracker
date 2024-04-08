import { Bot as TelegramBot, session } from "grammy";
import { type MyContext } from "@/bot/types/bot.js";
import { initial } from "@/bot/config/sessionStorage.js";
import attachUser from "@/bot/middleware/attachUser.js";
import { conversations } from "@grammyjs/conversations";
import handlers from "@/bot/handlers/index.js";
import { errorHandler } from "@/bot/middleware/errorHandler.js";

export function createBot(token: string) {
  const bot = new TelegramBot<MyContext>(token);

  bot.use(
    session({
      initial,
    }),
  );
  bot.use(attachUser);
  bot.use(conversations());

  bot.command("cancel", async (ctx) => {
    await ctx.conversation.exit();
    await ctx.reply("Left the conversation");
  });

  bot.use(handlers);

  bot.on("callback_query:data", async (ctx) => {
    console.log("Unknown button event with payload:", ctx.callbackQuery.data);
    await ctx.answerCallbackQuery();
  });

  bot.catch(errorHandler);

  return bot;
}

export type Bot = ReturnType<typeof createBot>;
