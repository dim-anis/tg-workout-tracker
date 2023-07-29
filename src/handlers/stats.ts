import { Menu, MenuRange } from "@grammyjs/menu";
import { getISOWeek } from "date-fns";
import { InlineKeyboardOptions } from "../config/keyboards.js";
import { Composer } from "grammy";
import { type WorkoutType } from "../models/workout.js";
import { type MyContext } from "types/bot.js";
import { generateWorkoutStatsString } from "./helpers/workoutStats.js";
import { getWeekDates } from "./helpers/dateConverters.js";
import { ArchivedWorkoutType, getArchivedWorkouts } from "../models/archivedWorkout.js";

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
    { text: 'Monthly', payload: 'month' },
    'perioMenu',
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
      return createStatsByMonthMenu(ctx);
  }
})

interface WeekToWorkoutsMap { [week: string]: ((WorkoutType | ArchivedWorkoutType)[]) };

async function createStatsByWeekMenu(ctx: MyContext, page = 0) {
  let workouts: WorkoutType[] | ArchivedWorkoutType[] = ctx.dbchat.recentWorkouts;
  if (page && Number(page) > 0) {
    workouts = await getArchivedWorkouts(ctx.dbchat._id.toString(), Number(page));
  }

  const weekToWorkoutsMap = getWeekToWorkoutsMap(workouts);

  const range = new MenuRange<MyContext>();
  for (const [weekNumber, workouts] of Object.entries(weekToWorkoutsMap)) {
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

    range
      .submenu(
        { text: `${formattedStartDate} - ${formattedEndDate}`, payload: `week?page=${page}` },
        'renderWeekMenu',
        async ctx => {
          await ctx.editMessageText(mainMenuTitle + ' > <b>Weekly</b>' + ` > <b>${formattedStartDate} - ${formattedEndDate}</b>`, { parse_mode: 'HTML' })
        }
      )
      .row()
  }

  range.submenu(
    { text: 'Next Batch >>', payload: `week?page=${page + 1}` },
    'periodMenu'
  )

  return range;
}

const renderWeekMenu = new Menu<MyContext>('renderWeekMenu');
renderWeekMenu.back(
  { text: 'Go back', payload: 'week?page=0' },
  async ctx => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Weekly</b>", { parse_mode: 'HTML' });
  }
);

function createStatsByMonthMenu(ctx: MyContext) {
  const workouts = ctx.dbchat.recentWorkouts;
}

async function createStatsByDayMenu(ctx: MyContext, page = 0) {
  const { isMetric } = ctx.dbchat.settings;

  let workouts: WorkoutType[] | ArchivedWorkoutType[] = ctx.dbchat.recentWorkouts;
  if (page && Number(page) > 0) {
    workouts = await getArchivedWorkouts(ctx.dbchat._id.toString(), page);
  }

  console.log(workouts);

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
        // const message = generateWorkoutStatsString(workouts[Number(index)], isMetric);
        await ctx.editMessageText('Hi', { parse_mode: 'HTML' });
      }
    )
  }

  range
    .row()
    .back(
      { text: 'Back to Stats', payload: 'day?page=0' },
      async ctx => await ctx.editMessageText(mainMenuTitle, { parse_mode: 'HTML' })
    )

  range
    .submenu(
      { text: 'Next Batch >>', payload: `day?page=${page + 1}` },
      'periodMenu'
    )

  return range;
}

const renderDayMenu = new Menu<MyContext>('renderDayMenu');
renderDayMenu.back(
  { text: 'Go back', payload: 'day?page=0' },
  async ctx => {
    await ctx.editMessageText(mainMenuTitle + " > <b>Daily</b>", { parse_mode: 'HTML' });
  }
);

const mainMenuTitle = '📊 ' + '<b>Training Stats</b>';
const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: 'HTML'
}


function getWeekToWorkoutsMap(workouts: WorkoutType[] | ArchivedWorkoutType[]): WeekToWorkoutsMap {
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
