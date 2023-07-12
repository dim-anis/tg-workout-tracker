import { Menu, MenuRange } from "@grammyjs/menu";
import { type InlineKeyboardOptions } from "config/keyboards.js";
import { Composer } from "grammy";
import { type MyContext } from "types/bot.js";
import { generateWorkoutStatsString } from "./helpers/workoutStats.js";
import { WorkoutType } from "models/workout.js";

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('statsMenu')
  .submenu(
    { text: 'by workout', payload: '0' },
    'statsByWorkout',
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
  const { isMetric } = ctx.dbchat.settings;
  const workouts = ctx.dbchat.recentWorkouts;

  const startIndex = Number(ctx.match);
  const workoutsLeft = workouts.length - startIndex;
  const indexOffset = Math.min(4, workoutsLeft);
  const prevPageStartIndex = Math.max(0, startIndex - 4);

  const range = new MenuRange<MyContext>();
  // hide 'prev' button on the first page
  if (startIndex > 0) {
    range.submenu({ text: '<<', payload: `${prevPageStartIndex}` }, 'statsByWorkout');
  }

  // show 4 buttons when 'back' and 'forward' buttons are shown, show 5 otherwise
  // 'back' and 'forward' not included in the count
  for (let i = 0; i < indexOffset; i++) {
    const workoutIndex = startIndex + i;
    const dateShort = workouts[workoutIndex].createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric' });
    range
      .text(
        { text: dateShort, payload: `${startIndex}` },
        async () => {
          const message = generateWorkoutStatsString(workouts[workoutIndex], isMetric);
          await ctx.editMessageText(message, { parse_mode: 'HTML' });
        }
      )
  }

  // show 'forward' button on all pages but the last
  if (workoutsLeft - indexOffset > 0) {
    range.submenu({ text: '>>', payload: `${startIndex + indexOffset}` }, 'statsByWorkout')
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
