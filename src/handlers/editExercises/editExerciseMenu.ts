import { Composer } from 'grammy';
import { Menu, MenuRange } from '@grammyjs/menu';
import { type MyContext } from '../../types/bot.js';
import { deleteUserExercise } from '../../models/user.js';
import { createConversation } from '@grammyjs/conversations';
import editExerciseConversation from './editExerciseConversation.js';
import { userHasExercises } from '../../middleware/userHasExercises.js';
import { backButton } from '../../config/keyboards.js';

const composer = new Composer<MyContext>();

const categoriesMenuText =
  '✏️ <b>Edit exercises</b>\n\n<i>Select a category:</i>';
const categoriesMenu = new Menu<MyContext>('cat');
categoriesMenu.dynamic((ctx) => {
  ctx.session.state.cmdName = 'editExercise';

  const { exercises } = ctx.dbchat;

  const categories = new Set(exercises.map((ex) => ex.category));

  const range = new MenuRange<MyContext>();
  for (const cat of categories) {
    range
      .submenu(
        { text: cat, payload: cat },
        'ex',
        async (ctx) =>
          await ctx.editMessageText(exercisesMenuText(cat), {
            parse_mode: 'HTML'
          })
      )
      .row();
  }

  return range;
});

const exercisesMenuText = (category: string) =>
  `<b>${category}</b>\n\nSelect an exercise`;
const exercisesMenu = new Menu<MyContext>('ex');
exercisesMenu.dynamic((ctx) => {
  const payload = ctx.match;
  if (typeof payload !== 'string') {
    throw new Error('No category chosen!');
  }

  const [category] = payload.split(',');

  return createExerciseMenu(ctx, category);
});

function createExerciseMenu(ctx: MyContext, category: string) {
  const { exercises } = ctx.dbchat;
  const selectedCategoryExercises = exercises.filter(
    (ex) => ex.category === category
  );
  const range = new MenuRange<MyContext>();

  range
    .back({ text: backButton, payload: category }, async (ctx) => {
      await ctx.editMessageText(categoriesMenuText, { parse_mode: 'HTML' });
    })
    .row();

  for (const exercise of selectedCategoryExercises) {
    range
      .submenu(
        { text: exercise.name, payload: `${category},${exercise.name}` },
        'selectExercise',
        async (ctx) => {
          await ctx.editMessageText(
            selectExerciseMenuText(category, exercise.name),
            {
              parse_mode: 'HTML'
            }
          );
        }
      )
      .row();
  }

  return range;
}

const selectExerciseMenuText = (category: string, exercise: string) =>
  `<b>${exercise} [${category}]</b>\n\nWhat would you like to do with this exercise?`;
const selectExerciseMenu = new Menu<MyContext>('selectExercise');
selectExerciseMenu.dynamic((ctx) => {
  const payload = ctx.match;
  if (typeof payload !== 'string') {
    throw new Error('No exercise chosen!');
  }

  const [category, exercise] = payload.split(',');

  return createSelectExerciseMenu(category, exercise);
});

function createSelectExerciseMenu(category: string, exercise: string) {
  return new MenuRange<MyContext>()
    .back({ text: backButton, payload: category }, async (ctx) => {
      await ctx.editMessageText(exercisesMenuText(category), {
        parse_mode: 'HTML'
      });
    })
    .submenu(
      { text: '❌ Delete', payload: `${category},${exercise}` },
      'deleteMenu',
      async (ctx) => {
        await ctx.editMessageText(deleteMenuText(category, exercise), {
          parse_mode: 'HTML'
        });
      }
    )
    .text({ text: '✏️ Edit', payload: exercise }, async (ctx) => {
      const exercise = ctx.match;
      ctx.session.state.data = exercise;

      await ctx.conversation.enter('editExerciseConversation');
    });
}

const deleteMenuText = (category: string, exercise: string) =>
  `<b>${exercise} [${category}]</b>\n\nAre you sure you want to delete this exercise?`;
const deleteMenu = new Menu<MyContext>('deleteMenu');
deleteMenu.dynamic((ctx) => {
  const payload = ctx.match;

  if (typeof payload !== 'string') {
    throw new Error('No exercise chosen!');
  }

  const [category, exercise] = payload.split(',');

  return new MenuRange<MyContext>()
    .back({ text: 'No', payload }, async (ctx) => {
      console.log({ category, exercise });
      await ctx.editMessageText(selectExerciseMenuText(category, exercise), {
        parse_mode: 'HTML'
      });
    })
    .text({ text: 'Yes', payload }, async (ctx) => {
      const [category, exercise] = ctx.match.split(',');
      console.log({ category, exercise });
      await deleteUserExercise(ctx.dbchat.user_id, exercise);
      ctx.dbchat.exercises = ctx.dbchat.exercises.filter(
        (exObj) => exObj.name !== exercise
      );
      await ctx.editMessageText(selectExerciseMenuText(category, exercise), {
        parse_mode: 'HTML'
      });
      ctx.menu.nav('cat');
      await ctx.editMessageText(categoriesMenuText, { parse_mode: 'HTML' });
    });
});

composer.use(createConversation(editExerciseConversation));

selectExerciseMenu.register(deleteMenu);
exercisesMenu.register(selectExerciseMenu);
categoriesMenu.register(exercisesMenu);

composer.use(categoriesMenu);

composer.command('edit_exercises', userHasExercises, async (ctx) => {
  const { message_id } = await ctx.reply(categoriesMenuText, {
    reply_markup: categoriesMenu,
    parse_mode: 'HTML'
  });
  ctx.session.state.lastMessageId = message_id;
});
composer.callbackQuery('/edit_exercises', userHasExercises, async (ctx) => {
  await ctx.answerCallbackQuery();
  const { message_id } = await ctx.reply(categoriesMenuText, {
    reply_markup: categoriesMenu,
    parse_mode: 'HTML'
  });
  ctx.session.state.lastMessageId = message_id;
});

export default composer;
