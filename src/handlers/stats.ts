import { Menu, MenuRange } from "@grammyjs/menu";
import {
  InlineKeyboardOptions,
  prevButton,
  nextButton,
  backButton,
} from "@/config/keyboards.js";
import { Composer } from "grammy";
import { type WorkoutType } from "@/models/workout.js";
import { type MyContext } from "@/types/bot.js";
import { getMonthNameFromNumber, getWeekDates } from "@/helpers/dates.js";
import {
  ArchivedWorkoutType,
  getArchivedWorkouts,
} from "@/models/archivedWorkout.js";
import { getStats, getStatsString } from "@/helpers/workoutStats.js";
import {
  getUserWorkoutsGroupedByMonth,
  getUserWorkoutsGroupedByWeek,
} from "@/models/user.js";

const DAY_PAGE_SIZE = 19;
const WEEK_PAGE_SIZE = 5;
const MONTH_PAGE_SIZE = 5;
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>("statsMenu")
  .submenu(
    { text: "Daily", payload: "day?page=1" },
    "periodMenu",
    async (ctx) =>
      await ctx.editMessageText(mainMenuTitle + " > <b>Daily</b>", {
        parse_mode: "HTML",
      }),
  )
  .row()
  .submenu(
    { text: "Weekly", payload: "week?page=1" },
    "periodMenu",
    async (ctx) =>
      await ctx.editMessageText(mainMenuTitle + " > <b>Weekly</b>", {
        parse_mode: "HTML",
      }),
  )
  .row()
  .submenu(
    { text: "Monthly", payload: "month?page=1" },
    "periodMenu",
    async (ctx) =>
      await ctx.editMessageText(mainMenuTitle + " > <b>Monthly</b>", {
        parse_mode: "HTML",
      }),
  );

const periodMenu = new Menu<MyContext>("periodMenu");
periodMenu.dynamic((ctx) => {
  const payload = ctx.match;
  if (typeof payload !== "string") {
    throw new Error("No period chosen!");
  }

  const [period, page] = payload.split("?page=");

  switch (period) {
    case "day":
      return createStatsByDayMenu(ctx, Number(page));
    case "week":
      return createStatsByWeekMenu(ctx, Number(page));
    case "month":
      return createStatsByMonthMenu(ctx, Number(page));
  }
});

async function createStatsByWeekMenu(ctx: MyContext, page = 1) {
  const { isMetric } = ctx.dbchat.settings;
  const { exercises } = ctx.dbchat;
  const workouts = await getUserWorkoutsGroupedByWeek(
    ctx.dbchat._id.toString(),
    Number(page),
    WEEK_PAGE_SIZE,
  );

  const range = new MenuRange<MyContext>();
  for (const group of workouts) {
    const { week, year } = group._id;
    const workoutsByWeek = group.workouts;

    const { startDate, endDate } = getWeekDates(year, Number(week), 1);

    const fromToDate = `${dateFormat.format(startDate)} - ${dateFormat.format(endDate)}`;

    range
      .submenu(
        { text: fromToDate, payload: `week?page=${page}` },
        "renderWeekMenu",
        async (ctx) => {
          await ctx.editMessageText(
            mainMenuTitle +
              " > <b>Weekly</b>" +
              ` > <b>${fromToDate}</b>\n` +
              getStatsString(getStats(workoutsByWeek, exercises), isMetric),
            { parse_mode: "HTML" },
          );
        },
      )
      .row();
  }

  if (page > 1) {
    range.submenu(
      { text: prevButton, payload: `week?page=${page - 1}` },
      "periodMenu",
    );
  }

  if (workouts.length === WEEK_PAGE_SIZE) {
    range.submenu(
      { text: nextButton, payload: `week?page=${page + 1}` },
      "periodMenu",
    );
  }

  range
    .row()
    .back(
      { text: backButton, payload: "week?page=1" },
      async (ctx) =>
        await ctx.editMessageText(mainMenuTitle, { parse_mode: "HTML" }),
    );

  return range;
}

const renderWeekMenu = new Menu<MyContext>("renderWeekMenu");
renderWeekMenu.back(
  { text: backButton, payload: "week?page=1" },
  async (ctx) => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Weekly</b>", {
      parse_mode: "HTML",
    });
  },
);

async function createStatsByMonthMenu(ctx: MyContext, page = 0) {
  const { isMetric } = ctx.dbchat.settings;
  const { exercises } = ctx.dbchat;
  const workoutsGroupedByMonth = await getUserWorkoutsGroupedByMonth(
    ctx.dbchat._id.toString(),
    Number(page),
    MONTH_PAGE_SIZE,
  );

  const range = new MenuRange<MyContext>();
  for (const group of workoutsGroupedByMonth) {
    const { month } = group._id;
    const { workouts } = group;
    const monthString = getMonthNameFromNumber(Number(month));
    range
      .submenu(
        { text: monthString, payload: `month?page=${page}` },
        "renderMonthMenu",
        async (ctx) => {
          await ctx.editMessageText(
            mainMenuTitle +
              " > <b>Monthly</b>" +
              ` > <b>${monthString}</b>\n` +
              getStatsString(getStats(workouts, exercises), isMetric),
            { parse_mode: "HTML" },
          );
        },
      )
      .row();
  }

  if (page > 1) {
    range.submenu(
      { text: prevButton, payload: `month?page=${page - 1}` },
      "periodMenu",
    );
  }

  if (workoutsGroupedByMonth.length === WEEK_PAGE_SIZE) {
    range.submenu(
      { text: nextButton, payload: `month?page=${page + 1}` },
      "periodMenu",
    );
  }

  range
    .row()
    .back(
      { text: backButton, payload: "month?page=1" },
      async (ctx) =>
        await ctx.editMessageText(mainMenuTitle, { parse_mode: "HTML" }),
    );

  return range;
}

const renderMonthMenu = new Menu<MyContext>("renderMonthMenu");
renderMonthMenu.back(
  { text: backButton, payload: "month?page=1" },
  async (ctx) => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Monthly</b>", {
      parse_mode: "HTML",
    });
  },
);

async function createStatsByDayMenu(ctx: MyContext, page = 1) {
  const { isMetric } = ctx.dbchat.settings;
  const { exercises } = ctx.dbchat;

  let workouts: WorkoutType[] | ArchivedWorkoutType[] =
    ctx.dbchat.recentWorkouts;
  if (page && Number(page) > 1) {
    workouts = await getArchivedWorkouts(
      ctx.dbchat._id.toString(),
      page,
      DAY_PAGE_SIZE,
    );
  }

  if (workouts.length === 0) {
    await ctx.reply("No workouts recorded");
    return;
  }

  const range = new MenuRange<MyContext>();
  for (const [index, workout] of workouts.entries()) {
    if (Number(index) % 4 === 0) {
      range.row();
    }

    const formattedDate = dateFormat.format(
      "created" in workout ? workout.created : workout.createdAt,
    );

    range.submenu(
      { text: `${formattedDate}`, payload: `day?page=${page}` },
      "renderDayMenu",
      async (ctx) => {
        await ctx.editMessageText(
          mainMenuTitle +
            " > <b>Daily</b>" +
            ` > <b>${formattedDate}</b>\n` +
            getStatsString(getStats([workout], exercises), isMetric),
          { parse_mode: "HTML" },
        );
      },
    );

    if (Number(index) === workouts.length - 1) {
      range.row();
    }
  }

  // only show prevButton button if NOT on the first page
  if (page > 1) {
    range.submenu(
      { text: prevButton, payload: `day?page=${page - 1}` },
      "periodMenu",
    );
  }

  // simple guard for now
  if (workouts.length === DAY_PAGE_SIZE) {
    range.submenu(
      { text: nextButton, payload: `day?page=${page + 1}` },
      "periodMenu",
    );
  }

  range
    .row()
    .back(
      { text: backButton, payload: "day?page=1" },
      async (ctx) =>
        await ctx.editMessageText(mainMenuTitle, { parse_mode: "HTML" }),
    );

  return range;
}

const renderDayMenu = new Menu<MyContext>("renderDayMenu");
renderDayMenu.back({ text: backButton, payload: "day?page=1" }, async (ctx) => {
  await ctx.editMessageText(mainMenuTitle + " > <b>Daily</b>", {
    parse_mode: "HTML",
  });
});

const mainMenuTitle = "📊 " + "<b>Training Stats</b>";
const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: "HTML",
};

periodMenu.register(renderMonthMenu);
periodMenu.register(renderWeekMenu);
periodMenu.register(renderDayMenu);
mainMenu.register(periodMenu);
composer.use(mainMenu);

composer
  .command("stats", async (ctx) => {
    await ctx.reply(mainMenuTitle, mainMenuOpts);
  })
  .callbackQuery("/stats", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(mainMenuTitle, mainMenuOpts);
  });

export default composer;
