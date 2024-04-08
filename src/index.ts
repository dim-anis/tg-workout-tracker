import commands from "./bot/config/botCommands.js";
import dbConnect from "./bot/config/dbConnection.js";
import { createBot } from "./bot/index.js";
import { envVariables } from "./config.js";
import { createServer } from "./server/index.js";

try {
  const bot = createBot(envVariables.BOT_TOKEN);
  const server = await createServer(bot);
  await dbConnect();
  await bot.api.setMyCommands(commands);

  if (envVariables.BOT_MODE === "webhook") {
    // to prevent receiving updates before the bot is ready
    await bot.init();

    await server.listen();

    await bot.api.setWebhook(envVariables.BOT_WEBHOOK, {
      allowed_updates: envVariables.BOT_ALLOWED_UPDATES,
    });
  } else if (envVariables.BOT_MODE === "polling") {
    await bot.start({
      drop_pending_updates: true,
      allowed_updates: envVariables.BOT_ALLOWED_UPDATES,
      onStart() {
        console.log("bot connected");
      },
    });
  }
} catch (err) {
  console.log(err);
  process.exit(1);
}
