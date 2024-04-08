import { Menu, MenuRange } from "@grammyjs/menu";
import { type MyContext } from "@/bot/types/bot.js";
import { deleteUserExercise } from "@/bot/models/user.js";
import { backButton } from "@/bot/config/keyboards.js";

export const categoriesMenuText =
  "✏️ <b>Edit exercises</b>\n\n<i>Select a category:</i>";

export const categoriesMenu = new Menu<MyContext>("cat");
categoriesMenu.dynamic((ctx) => {
  ctx.session.state.cmdName = "editExercise";

  const { exercises } = ctx.dbchat;

  const categories = new Set(exercises.map((ex) => ex.category));

  const range = new MenuRange<MyContext>();
  for (const cat of categories) {
    range
      .submenu(
        { text: cat, payload: cat },
        "ex",
        async (ctx) =>
          await ctx.editMessageText(exercisesMenuText(cat), {
            parse_mode: "HTML",
          }),
      )
      .row();
  }

  return range;
});

const exercisesMenuText = (category: string) =>
  `<b>${category}</b>\n\nSelect an exercise`;
const exercisesMenu = new Menu<MyContext>("ex");
exercisesMenu.dynamic((ctx) => {
  const payload = ctx.match;
  if (typeof payload !== "string") {
    throw new Error("No category chosen!");
  }

  const [category] = payload.split(",");

  return createExerciseMenu(ctx, category);
});

function createExerciseMenu(ctx: MyContext, category: string) {
  const { exercises } = ctx.dbchat;
  const selectedCategoryExercises = exercises.filter(
    (e) => e.category === category,
  );
  const range = new MenuRange<MyContext>();

  range
    .back({ text: backButton, payload: category }, async (ctx) => {
      await ctx.editMessageText(categoriesMenuText, { parse_mode: "HTML" });
    })
    .row();

  for (const exercise of selectedCategoryExercises) {
    range
      .submenu(
        { text: exercise.name, payload: `${category},${exercise.name}` },
        "selectExercise",
        async (ctx) => {
          await ctx.editMessageText(
            selectExerciseMenuText(category, exercise.name),
            {
              parse_mode: "HTML",
            },
          );
        },
      )
      .row();
  }

  return range;
}

const selectExerciseMenuText = (category: string, exercise: string) =>
  `<b>${exercise} [${category}]</b>\n\nWhat would you like to do with this exercise?`;
const selectExerciseMenu = new Menu<MyContext>("selectExercise");
selectExerciseMenu.dynamic((ctx) => {
  const payload = ctx.match;
  if (typeof payload !== "string") {
    throw new Error("No exercise chosen!");
  }

  const [category, exercise] = payload.split(",");

  return createSelectExerciseMenu(category, exercise);
});

function createSelectExerciseMenu(category: string, exercise: string) {
  console.log({ category, exercise });
  return new MenuRange<MyContext>()
    .back({ text: backButton, payload: category }, async (ctx) => {
      await ctx.editMessageText(exercisesMenuText(category), {
        parse_mode: "HTML",
      });
    })
    .back(
      { text: "❌ Delete", payload: `${category},${exercise}` },
      async (ctx) => {
        const exercise = ctx.match.split(",")[1];
        await deleteUserExercise(ctx.dbchat.user_id, exercise);
        const index = ctx.dbchat.exercises.findIndex(
          (e) => e.name === exercise,
        );
        ctx.dbchat.exercises.splice(index, 1);
        await ctx.editMessageText(categoriesMenuText, { parse_mode: "HTML" });
      },
    )
    .text({ text: "✏️ Edit", payload: exercise }, async (ctx) => {
      const exercise = ctx.match;
      ctx.session.state.data = exercise;
      await ctx.conversation.enter("editExerciseConversation");
    });
}

exercisesMenu.register(selectExerciseMenu);
categoriesMenu.register(exercisesMenu);
