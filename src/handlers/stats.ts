import { Menu } from "@grammyjs/menu";
import { InlineKeyboardOptions } from "config/keyboards.js";
import { Composer } from "grammy";
import { MyContext } from "types/bot.js";
import { getWorkoutStatsText } from "./helpers/workoutStats.js";

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('statsMenu')
  .submenu(
    { text: 'by workout', payload: 'workout' },
    'statsByWorkout',
    async (ctx) => {
      const lastWorkout = ctx.dbchat.recentWorkouts[0];
      const message = getWorkoutStatsText(lastWorkout, 0, [], true);

      await ctx.editMessageText(message, { parse_mode: 'HTML' })
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

const statsByWorkoutMenu = new Menu<MyContext>('statsByWorkout')
  .text('1')
  .text('2')
  .text('3')
  .text('4')
  .text('>>')
  .row()
  .back(
    'Go back',
    async (ctx) => {
      await ctx.editMessageText('Last 20 workouts shows', { parse_mode: 'HTML' })
    }
  )
  ;

mainMenu.register(statsByWorkoutMenu);
composer.use(mainMenu);

const mainMenuTitle = '📊 ' + '<b>Training Stats</b>';
const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: 'HTML'
}

composer.command('stats', async (ctx) => {
  await ctx.reply(mainMenuTitle, mainMenuOpts);
});
composer.callbackQuery('/stats', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(mainMenuTitle, mainMenuOpts);
});

export default composer;
