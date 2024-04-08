import type { IncomingMessage, ServerResponse } from "node:http";
import { createBot } from "../src/bot/index.js";
import { envVariables } from "../src/config.js";
import { createServer } from "../src/server/index.js";

const bot = createBot(envVariables.BOT_TOKEN);
const server = await createServer(bot);

export default async (request: IncomingMessage, response: ServerResponse) => {
  await server.ready();
  server.server.emit("request", request, response);
};
