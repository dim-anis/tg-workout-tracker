import { Composer } from "grammy";
import type { MyContext } from "@/bot/types/bot.js";
import { Menu, type MenuFlavor } from "@grammyjs/menu";
import { updateUserSettings } from "@/bot/models/user.js";
import {
  InlineKeyboardOptions,
  checkedSquare,
  uncheckedSquare,
} from "@/bot/config/keyboards.js";
import { type UserType } from "@/bot/models/user.js";

const mesocycleLengths = [4, 5, 6];

const composer = new Composer<MyContext>();

const mainMenuTitle = "⚙️ " + "<b>Settings</b>";
const unitMenuTitle = "<b>Unit system</b>";
const mesoLengthMenuTitle = "<b>Mesocycle length</b>";
const splitLengthMenuTitle = "<b>Split length</b>";

const mainMenu = new Menu<MyContext>("main")
  .submenu(
    { text: "Unit system", payload: "unit" },
    "settings-unit",
    async (ctx) =>
      await ctx.editMessageText(
        `${mainMenuTitle} > ${unitMenuTitle} > Select unit`,
        { parse_mode: "HTML" },
      ),
  )
  .row()
  .submenu(
    { text: "Split length", payload: "splitLength" },
    "split-length",
    async (ctx) =>
      await ctx.editMessageText(
        `${mainMenuTitle} > ${splitLengthMenuTitle} > Select length`,
        { parse_mode: "HTML" },
      ),
  )
  .row()
  .submenu(
    { text: "Mesocycle length", payload: "mesosycleLength" },
    "mesocycle-length",
    async (ctx) =>
      await ctx.editMessageText(
        `${mainMenuTitle} > ${mesoLengthMenuTitle} > Select length (in weeks)`,
        { parse_mode: "HTML" },
      ),
  )
  .row()
  .text(
    "✅ Submit",
    async (ctx) =>
      await ctx.editMessageText("👌 Settings saved!", {
        reply_markup: undefined,
      }),
  );

const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: "HTML",
};

const splitLengthMenu = new Menu<MyContext>("split-length");
for (let l = 1; l < 8; l++) {
  if (l === 5) splitLengthMenu.row();

  splitLengthMenu.text(
    (ctx) =>
      ctx.dbchat.settings.splitLength === l
        ? `${checkedSquare} ${l}`
        : `${uncheckedSquare} ${l}`,
    async (ctx) => await updateSettings(ctx, "splitLength", l),
  );
}

splitLengthMenu
  .row()
  .back(
    "✅ Apply",
    async (ctx) =>
      await ctx.editMessageText(mainMenuTitle, { parse_mode: "HTML" }),
  );

const mesocycleLengthMenu = new Menu<MyContext>("mesocycle-length");
for (const lengthOption of mesocycleLengths) {
  mesocycleLengthMenu.text(
    (ctx) =>
      ctx.dbchat.settings.mesocycleLength === lengthOption
        ? `${checkedSquare} ${lengthOption}`
        : `${uncheckedSquare} ${lengthOption}`,
    async (ctx) => await updateSettings(ctx, "mesocycleLength", lengthOption),
  );
}

mesocycleLengthMenu
  .row()
  .back(
    "✅ Apply",
    async (ctx) =>
      await ctx.editMessageText(mainMenuTitle, { parse_mode: "HTML" }),
  );

const settingsUnitMenu = new Menu<MyContext>("settings-unit")
  .text(
    (ctx) =>
      ctx.dbchat.settings.isMetric
        ? `${checkedSquare} Metric (kg)`
        : `${uncheckedSquare} Metric (kg)`,
    async (ctx) => await updateSettings(ctx, "isMetric", true),
  )
  .text(
    (ctx) =>
      ctx.dbchat.settings.isMetric
        ? `${uncheckedSquare} Imperial (lb)`
        : `${checkedSquare} Imperial (lb)`,
    async (ctx) => await updateSettings(ctx, "isMetric", false),
  )
  .row()
  .back(
    "✅ Apply",
    async (ctx) =>
      await ctx.editMessageText(mainMenuTitle, { parse_mode: "HTML" }),
  );

const updateSettings = async <K extends keyof UserType["settings"]>(
  ctx: MyContext & MenuFlavor,
  settingsKey: K,
  updatedValue: UserType["settings"][K],
) => {
  ctx.dbchat.settings[settingsKey] = updatedValue;
  const { splitLength, mesocycleLength, isMetric } = ctx.dbchat.settings;

  await updateUserSettings(
    ctx.dbchat.user_id,
    splitLength,
    mesocycleLength,
    isMetric,
  );

  ctx.menu.update();
};

mainMenu.register(mesocycleLengthMenu);
mainMenu.register(settingsUnitMenu);
mainMenu.register(splitLengthMenu);

composer.use(mainMenu);

composer.command("settings", async (ctx) => {
  await ctx.reply(mainMenuTitle, mainMenuOpts);
});

composer.callbackQuery("/settings", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(mainMenuTitle, mainMenuOpts);
});

export default composer;
