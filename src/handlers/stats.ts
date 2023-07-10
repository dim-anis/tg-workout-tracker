import { Menu, MenuRange } from "@grammyjs/menu";
import { InlineKeyboardOptions } from "config/keyboards.js";
import { Composer } from "grammy";
import { MyContext } from "types/bot.js";
import { generateWorkoutStatsString } from "./helpers/workoutStats.js";

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('statsMenu')
  .submenu(
    { text: 'by workout', payload: '0' },
    'statsByWorkout',
    async (ctx) => {
      const workoutStatsString = generateWorkoutStatsString(
        ctx.dbchat.recentWorkouts[0],
        ctx.dbchat.settings.isMetric
      );
      await ctx.editMessageText(workoutStatsString, { parse_mode: 'HTML' })
    }
  )
  .row()
  .submenu(
    { text: 'by week', payload: 'week' },
    'statsByWeek',
  )
  .row()
  .submenu(
    { text: 'by month', payload: 'month' },
    'statsByMonth',
  );

const mainMenuTitle = '📊 ' + '<b>Training Stats</b>';
const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: 'HTML'
}

const statsByDayMenu = new Menu<MyContext>('statsByWorkout');
statsByDayMenu.dynamic((ctx) => {
  const startIndex = Number(ctx.match);
  const workouts = ctx.dbchat.recentWorkouts;
  const range = new MenuRange<MyContext>();

  const remainingWorkouts = workouts.slice(startIndex);
  const increment = Math.min(4, remainingWorkouts.length);

  const prevPageStartIndex = startIndex - 4;

  // hide 'prev' button on the first page
  if (startIndex > 0) {
    range.submenu({ text: '<<', payload: prevPageStartIndex.toString() }, 'statsByWorkout');
  }

  // show 4 buttons when 'back' and 'forward' buttons are shown, show 5 otherwise
  // 'back' and 'forward' not included in the count
  for (let i = 0; i < increment; i++) {
    const workoutIndex = startIndex + i;
    const dateShort = workouts[workoutIndex].createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric' });
    range
      .text(
        { text: dateShort, payload: `${workoutIndex}` },
      )
  }

  // calculate the workout index in the payload
  const nextPageStartIndex = (startIndex || 0) + increment;

  // show 'forward' button on all pages but the last
  if (remainingWorkouts.length - increment > 0) {
    range.submenu({ text: '>>', payload: nextPageStartIndex.toString() }, 'statsByWorkout')
  }

  return range;
});

statsByDayMenu.row();
statsByDayMenu
  .back(
    { text: '<< Back to all stats', payload: 'byDay' },
    async ctx => await ctx.editMessageText(mainMenuTitle, { parse_mode: 'HTML' })
  );

mainMenu.register(statsByDayMenu);
composer.use(mainMenu);


composer.command('stats', async (ctx) => {
  await ctx.reply(mainMenuTitle, mainMenuOpts);
});
composer.callbackQuery('/stats', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(mainMenuTitle, mainMenuOpts);
});

export default composer;
