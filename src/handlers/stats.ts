import { Menu, MenuRange } from "@grammyjs/menu";
import { InlineKeyboardOptions } from "../config/keyboards.js";
import { Composer } from "grammy";
import { type MyContext } from "types/bot.js";
import { generateWorkoutStatsString } from "./helpers/workoutStats.js";

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('statsMenu')
  .submenu(
    { text: 'by workout', payload: 'day' },
    'periodMenu',
    async (ctx) => {
      await ctx.editMessageText("Stats <b>Per Workout</b>", { parse_mode: 'HTML' });
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

const periodMenu = new Menu<MyContext>('periodMenu');
periodMenu.dynamic(ctx => {
  const period = ctx.match;
  if (typeof period !== 'string') {
    throw new Error('No period chosen!');
  }

  switch (period) {
    case "day":
      return createStatsByDayMenu(ctx);
  }
})

async function createStatsByDayMenu(ctx: MyContext) {
  const latestWorkouts = ctx.dbchat.recentWorkouts;
  const {isMetric} = ctx.dbchat.settings;

  if (latestWorkouts.length === 0) {
    await ctx.reply("No workouts recorded");
    return;
  }

  const range = new MenuRange<MyContext>();
  for (const [index, workout] of Object.entries(latestWorkouts)) {
    if (Number(index) % 4 === 0) {
      range.row();
    }
    const formattedDate = workout
      .createdAt
      .toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short'
      });
    range.submenu(
      {text: `${formattedDate}`, payload: `day`},
      'perDayMenu',
      async ctx => {
        const message = generateWorkoutStatsString(latestWorkouts[Number(index)], isMetric);
        await ctx.editMessageText(message, {parse_mode: 'HTML'});
      }
    )
  }

  return range;
}

const singleWorkoutMenu = new Menu<MyContext>('perDayMenu');
singleWorkoutMenu.back(
  {text: 'Go back', payload: 'day'},
  async ctx => {
    await ctx.editMessageText('Stats <b>Per Workout</b>', {parse_mode: 'HTML'});
  }
);

const mainMenuTitle = '📊 ' + '<b>Training Stats</b>';
const mainMenuOpts: InlineKeyboardOptions = {
  reply_markup: mainMenu,
  parse_mode: 'HTML'
}

// const statsByDayMenu = new Menu<MyContext>('statsByWorkout');
// statsByDayMenu.dynamic((ctx) => {
//   const { isMetric } = ctx.dbchat.settings;
//   const workouts = ctx.dbchat.recentWorkouts;
//
//   const payload = ctx.match;
//   const [startIndex, selectedWorkout] = (payload as string).split("|").map(idx => Number(idx));
//   const workoutsLeft = workouts.length - startIndex;
//   const indexOffset = Math.min(4, workoutsLeft);
//   const prevPageStartIndex = Math.max(0, startIndex - 4);
//
//   const range = new MenuRange<MyContext>();
//
//   // hide 'prev' button on the first page
//   if (startIndex > 0) {
//     range.submenu({ text: '<<', payload: `${prevPageStartIndex}` }, 'statsByWorkout');
//   }
//
//   // show 4 buttons when 'back' and 'forward' buttons are shown, show 5 otherwise
//   // 'back' and 'forward' not included in the count
//   for (let i = 0; i < indexOffset; i++) {
//     const workoutIndex = startIndex + i;
//     const isSelected = workoutIndex === selectedWorkout;
//     const dateShort = workouts[workoutIndex].createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric' });
//     range
//       .text(
//         {
//           // text: `${isSelected ? checkedCircle : uncheckedCircle} ${dateShort}`,
//           text: dateShort,
//           payload: `${startIndex}|${workoutIndex}`,
//         },
//         async () => {
//           const message = generateWorkoutStatsString(workouts[workoutIndex], isMetric);
//           await ctx.editMessageText(message, { parse_mode: 'HTML' });
//         }
//       );
//   }
//
//   // show 'forward' button on all pages but the last
//   if (workoutsLeft - indexOffset > 0) {
//     range.submenu({ text: '>>', payload: `${startIndex + indexOffset}` }, 'statsByWorkout')
//   }
//
//   return range;
// });
//
// statsByDayMenu
//   .row()
//   .back(
//     { text: "<< BACK TO STATS", payload: "0" },
//     async ctx => await ctx.editMessageText(mainMenuTitle, { reply_markup: undefined, parse_mode: "HTML" })
//   );

periodMenu.register(singleWorkoutMenu);
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
