import { Menu, MenuRange } from "@grammyjs/menu";
import { getISOWeek } from "date-fns";
import { InlineKeyboardOptions, prevButton, nextButton, backButton } from "../config/keyboards.js";
import { Composer } from "grammy";
import { type WorkoutType } from "../models/workout.js";
import { type MyContext } from "types/bot.js";
import { getMonthNameFromNumber, getWeekDates } from "./helpers/dateConverters.js";
import { ArchivedWorkoutType, getArchivedWorkouts } from "../models/archivedWorkout.js";
import { getStats, getStatsString } from "./helpers/workoutStats.js";

const ITEMS_PER_PAGE = 19;

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('statsMenu')
  .submenu(
    { text: 'Daily', payload: 'day?page=0' },
    'periodMenu',
    async ctx => await ctx.editMessageText(mainMenuTitle + " > <b>Daily</b>", { parse_mode: 'HTML' })
  )
  .row()
  .submenu(
    { text: 'Weekly', payload: 'week?page=0' },
    'periodMenu',
    async ctx => await ctx.editMessageText(mainMenuTitle + " > <b>Weekly</b>", { parse_mode: 'HTML' })
  )
  .row()
  .submenu(
    { text: 'Monthly', payload: 'month?page=0' },
    'periodMenu',
    async ctx => await ctx.editMessageText(mainMenuTitle + " > <b>Monthly</b>", { parse_mode: 'HTML' })
  );

const periodMenu = new Menu<MyContext>('periodMenu');
periodMenu.dynamic(ctx => {
  const payload = ctx.match;
  if (typeof payload !== 'string') {
    throw new Error('No period chosen!');
  }

  const [period, page] = payload.split('?page=');

  switch (period) {
    case "day":
      return createStatsByDayMenu(ctx, Number(page));
    case "week":
      return createStatsByWeekMenu(ctx, Number(page));
    case "month":
      return createStatsByMonthMenu(ctx, Number(page));
  }
})

interface WeekToWorkoutsMap { [week: string]: ((WorkoutType | ArchivedWorkoutType)[]) };
interface MonthToWorkoutsMap { [week: string]: ((WorkoutType | ArchivedWorkoutType)[]) };

async function createStatsByWeekMenu(ctx: MyContext, page = 0) {
  const { isMetric } = ctx.dbchat.settings;
  const { exercises } = ctx.dbchat;
  let workouts: WorkoutType[] | ArchivedWorkoutType[] = ctx.dbchat.recentWorkouts;
  if (page && Number(page) > 0) {
    workouts = await getArchivedWorkouts(ctx.dbchat._id.toString(), Number(page));
  }

  const weekToWorkoutsMap = getWeekToWorkoutsMap(workouts);

  const range = new MenuRange<MyContext>();
  for (const [weekNumber, workouts] of Object.entries(weekToWorkoutsMap).sort(([weekA], [weekB]) => Number(weekB) - Number(weekA))) {
    let year: number;
    //hacky typescript stuff
    if ('created' in workouts[0]) {
      year = workouts[0].created.getFullYear();
    } else {
      year = workouts[0].createdAt.getFullYear();
    }

    const { startDate, endDate } = getWeekDates(year, Number(weekNumber), 1);
    const formattedStartDate = startDate
      .toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short'
      });
    const formattedEndDate = endDate
      .toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short'
      });

    const fromToDate = `${formattedStartDate} - ${formattedEndDate}`;
    range
      .submenu(
        { text: fromToDate, payload: `week?page=${page}` },
        'renderWeekMenu',
        async ctx => {
          const { volumePerMuscleGroup, totalVolume, avgRPE } = getStats(workouts, exercises);
          const statsText = getStatsString(totalVolume, volumePerMuscleGroup, avgRPE, isMetric);
          await ctx.editMessageText(mainMenuTitle + ' > <b>Weekly</b>' + ` > <b>${fromToDate}</b>\n` + statsText, { parse_mode: 'HTML' });
        }
      )
      .row()
  }

  if (page > 0) {
    range.submenu(
      { text: prevButton, payload: `week?page=${page - 1}` },
      'periodMenu'
    )
  }

  if (workouts.length === ITEMS_PER_PAGE) {
    range.submenu(
      { text: nextButton, payload: `week?page=${page + 1}` },
      'periodMenu'
    )
  }

  range
    .row()
    .back(
      { text: backButton, payload: 'week?page=0' },
      async ctx => await ctx.editMessageText(mainMenuTitle, { parse_mode: 'HTML' })
    )

  return range;
}

const renderWeekMenu = new Menu<MyContext>('renderWeekMenu');
renderWeekMenu.back(
  { text: backButton, payload: 'week?page=0' },
  async ctx => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Weekly</b>", { parse_mode: 'HTML' });
  }
);

async function createStatsByMonthMenu(ctx: MyContext, page = 0) {
  const { isMetric } = ctx.dbchat.settings;
  const { exercises } = ctx.dbchat;
  let workouts: WorkoutType[] | ArchivedWorkoutType[] = ctx.dbchat.recentWorkouts;

  if (page && Number(page) > 0) {
    workouts = await getArchivedWorkouts(ctx.dbchat._id.toString(), Number(page));
  }

  const monthToWorkoutsMap = getMonthToWorkoutsMap(workouts);

  const range = new MenuRange<MyContext>();
  for (const [monthNumber, workouts] of Object.entries(monthToWorkoutsMap).sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))) {
    const monthString = getMonthNameFromNumber(Number(monthNumber));
    range
      .submenu(
        { text: monthString, payload: `month?page=${page}` },
        'renderMonthMenu',
        async ctx => {
          const { volumePerMuscleGroup, totalVolume, avgRPE } = getStats(workouts, exercises);
          const statsText = getStatsString(totalVolume, volumePerMuscleGroup, avgRPE, isMetric);
          await ctx.editMessageText(mainMenuTitle + ' > <b>Monthly</b>' + ` > <b>${monthString}</b>\n` + statsText, { parse_mode: 'HTML' });
        }
      )
      .row()
  }

  if (page > 0) {
    range.submenu(
      { text: prevButton, payload: `month?page=${page - 1}` },
      'periodMenu'
    )
  }

  if (workouts.length === ITEMS_PER_PAGE) {
    range.submenu(
      { text: nextButton, payload: `month?page=${page + 1}` },
      'periodMenu'
    )
  }

  range
    .row()
    .back(
      { text: backButton, payload: 'month?page=0' },
      async ctx => await ctx.editMessageText(mainMenuTitle, { parse_mode: 'HTML' })
    )

  return range;
}

const renderMonthMenu = new Menu<MyContext>('renderMonthMenu');
renderMonthMenu.back(
  { text: backButton, payload: 'month?page=0' },
  async ctx => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Monthly</b>", { parse_mode: 'HTML' });
  }
);

async function createStatsByDayMenu(ctx: MyContext, page = 0) {
  const { isMetric } = ctx.dbchat.settings;
  const { exercises } = ctx.dbchat;

  let workouts: WorkoutType[] | ArchivedWorkoutType[] = ctx.dbchat.recentWorkouts;
  if (page && Number(page) > 0) {
    workouts = await getArchivedWorkouts(ctx.dbchat._id.toString(), page);
  }

  if (workouts.length === 0) {
    await ctx.reply("No workouts recorded");
    return;
  }

  const range = new MenuRange<MyContext>();
  for (const [index, workout] of Object.entries(workouts)) {
    if (Number(index) % 4 === 0) {
      range.row();
    }

    let formattedDate: string;
    if ('created' in workout) {
      formattedDate = workout
        .created
        .toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short'
        });
    } else {
      formattedDate = workout
        .createdAt
        .toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short'
        });
    }
    range.submenu(
      { text: `${formattedDate}`, payload: `day?page=${page}` },
      'renderDayMenu',
      async ctx => {
        const { volumePerMuscleGroup, totalVolume, avgRPE } = getStats([workout], exercises);
        const statsText = getStatsString(totalVolume, volumePerMuscleGroup, avgRPE, isMetric);
        await ctx.editMessageText(mainMenuTitle + ' > <b>Daily</b>' + ` > <b>${formattedDate}</b>\n` + statsText, { parse_mode: 'HTML' });
      }
    )

    if (Number(index) === workouts.length - 1) {
      range.row();
    }
  }

  // only show prevButton button if NOT on the first page
  if (page > 0) {
    range
      .submenu(
        { text: prevButton, payload: `day?page=${page - 1}` },
        'periodMenu'
      )
  }

  // simple guard for now
  if (workouts.length === ITEMS_PER_PAGE) {
    range
      .submenu(
        { text: nextButton, payload: `day?page=${page + 1}` },
        'periodMenu'
      )
  }

  range
    .row()
    .back(
      { text: backButton, payload: 'day?page=0' },
      async ctx => await ctx.editMessageText(mainMenuTitle, { parse_mode: 'HTML' })
    )

  return range;
}

const renderDayMenu = new Menu<MyContext>('renderDayMenu');
renderDayMenu.back(
  { text: backButton, payload: 'day?page=0' },
  async ctx => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Daily</b>", { parse_mode: 'HTML' });
  }
);

const mainMenuTitle = '📊 ' + '<b>Training Stats</b>';
const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: 'HTML'
}

function getWeekToWorkoutsMap(workouts: (WorkoutType | ArchivedWorkoutType)[]): WeekToWorkoutsMap {
  const result: WeekToWorkoutsMap = {};

  workouts.forEach(workout => {
    if ('createdAt' in workout) {
      const week = getISOWeek(workout.createdAt).toString();

      if (!result[week]) {
        result[week] = [workout];
      } else {
        result[week].push(workout);
      }
    } else if ('created' in workout) {
      const week = getISOWeek(workout.created).toString();

      if (!result[week]) {
        result[week] = [workout];
      } else {
        result[week].push(workout);
      }
    }
  })

  return result;
}

function getMonthToWorkoutsMap(workouts: (WorkoutType | ArchivedWorkoutType)[]): MonthToWorkoutsMap {
  const result: MonthToWorkoutsMap = {};

  workouts.forEach(workout => {
    if ('createdAt' in workout) {
      const month = workout.createdAt.getMonth().toString();

      if (!result[month]) {
        result[month] = [workout];
      } else {
        result[month].push(workout);
      }
    } else if ('created' in workout) {
      const month = workout.created.getMonth().toString();

      if (!result[month]) {
        result[month] = [workout];
      } else {
        result[month].push(workout);
      }
    }
  })

  return result;
}

periodMenu.register(renderMonthMenu);
periodMenu.register(renderWeekMenu);
periodMenu.register(renderDayMenu);
mainMenu.register(periodMenu);
composer.use(mainMenu);

composer
  .command('stats', async (ctx) => {
    await ctx.reply(mainMenuTitle, mainMenuOpts);
  })
  .callbackQuery('/stats', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(mainMenuTitle, mainMenuOpts);
  });

export default composer;
