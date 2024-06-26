import { defaultExercises } from "@/bot/config/exercises.js";
import {
  backButton,
  checkedSquare,
  uncheckedSquare,
} from "@/bot/config/keyboards.js";
import { createUserExercise } from "@/bot/models/user.js";
import { MyContext } from "@/bot/types/bot.js";
import { Menu, MenuRange } from "@grammyjs/menu";

export const addExerciseMenu = new Menu<MyContext>("addExerciseMenu")
  .submenu(
    { text: "Select from preloaded", payload: "populateExercises" },
    "populate-exercises-main",
    async (ctx) => {
      ctx.session.exercises.fromDB = new Set(
        ctx.dbchat.exercises.map((exercise) => exercise.name),
      );
      await ctx.editMessageText(populateMainText, { parse_mode: "HTML" });
    },
  )
  .row()
  .text({ text: "Add exercise", payload: "addExercise" }, async (ctx) => {
    await ctx.conversation.enter("handleAddExercise");
  });

const populateMainText =
  '<b>Populate exercises</b>\n\nSelect the exercises that you would like to add, then click "SUBMIT"';

const populateExercisesMain = new Menu<MyContext>("populate-exercises-main");
populateExercisesMain.dynamic(() => {
  const categories = new Set(defaultExercises.map((ex) => ex.category));
  const range = new MenuRange<MyContext>().back(backButton).row();
  for (const cat of categories) {
    range
      .submenu(
        {
          text: cat,
          payload: cat,
        },
        "populate-exercises-submenu",
        async (ctx) => {
          await ctx.editMessageText(populateExercisesMainSubText(cat), {
            parse_mode: "HTML",
          });
        },
      )
      .row();
  }

  range.text({ text: "✅ Submit" }, async (ctx) => {
    const { toAdd } = ctx.session.exercises;
    const exercisesToAdd = defaultExercises.filter((exObj) =>
      [...toAdd].includes(exObj.name),
    );
    await createUserExercise(ctx.dbchat.user_id, exercisesToAdd);
    ctx.dbchat.exercises.concat(exercisesToAdd);

    await ctx.editMessageText("👌 Exercises updated!", {
      reply_markup: undefined,
    });
  });

  return range;
});

const populateExercisesMainSubText = (category: string) =>
  `<b>${category}</b>\n\nSelect exercises that you'd like to add:`;
const populateExercisesSub = new Menu<MyContext>("populate-exercises-submenu");

populateExercisesSub.dynamic((ctx) => {
  const category = ctx.match;
  if (typeof category !== "string") {
    throw new Error("No category chosen!");
  }

  return createExerciseMenu(category);
});

function createExerciseMenu(category: string) {
  const selectedCategoryExercises = defaultExercises.filter(
    (ex) => ex.category === category,
  );
  const range = new MenuRange<MyContext>();

  range
    .back({ text: backButton, payload: category }, async (ctx) => {
      await ctx.editMessageText(populateMainText, { parse_mode: "HTML" });
    })
    .row();

  for (const exercise of selectedCategoryExercises) {
    range
      .text(
        {
          text: (ctx) =>
            ctx.session.exercises.fromDB.has(exercise.name) ||
            ctx.session.exercises.toAdd.has(exercise.name)
              ? `${exercise.name} ${checkedSquare}`
              : `${exercise.name} ${uncheckedSquare}`,
          payload: category,
        },
        (ctx) => {
          const { fromDB, toAdd } = ctx.session.exercises;

          if (toAdd.has(exercise.name) && !fromDB.has(exercise.name)) {
            toAdd.delete(exercise.name);
            ctx.menu.update();
          } else if (!toAdd.has(exercise.name) && !fromDB.has(exercise.name)) {
            toAdd.add(exercise.name);
            ctx.menu.update();
          }
        },
      )
      .row();
  }

  return range;
}

populateExercisesMain.register(populateExercisesSub);
addExerciseMenu.register(populateExercisesMain);
