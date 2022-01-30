import botAPI from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import * as exercises from "./controllers/exercises";
import * as sets from "./controllers/sets";
import * as routines from "./controllers/routines";
import * as users from "./controllers/users";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { IRoutine } from "./models/routine";
import { getTodaysWorkout, getWorkoutSequence, generateKeyboardOptions } from "./utils/utils"

dotenv.config();

const uri =
  "mongodb+srv://<username>:<password>@cluster1.vp9hy.mongodb.net/<database>";
const options = {
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  pass: process.env.DB_PASSWORD,
};

mongoose.connect(uri, options);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error: "));
db.once("open", function () {
  console.log("Connected to MongoDB successfully");
});

const bot = new botAPI(<string>process.env.KEY, { polling: true });

bot.setMyCommands([
  {
    command: "/start",
    description: "- starts a workout sequence with exercises in selected order",
  }, // implemented
  {
    command: "/record_set",
    description: "- allows to record a single set to the db",
  }, // implemented
  { command: "/delete_last_set", description: "- deletes last set" }, // implemented
  {
    command: "/show_last_workout",
    description: "- shows all sets of the last workout",
  }, // implemented
  { command: "/set_routine", description: "- allows to set a routine" },
  { command: "/help", description: "- help" },
]);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;
  const user = msg.from?.last_name;

  if (message === "/record_set") {
    const exerciseList = await exercises.showExercises("");
    if (exerciseList) {
      const keyboard_options = generateKeyboardOptions(exerciseList);
      bot.sendMessage(chatId, "Choose an exercise: ", {
        reply_markup: { inline_keyboard: keyboard_options },
      });
    };
  };

  if (message === "/show_last_workout") {
    const workoutList = await sets.getLastWorkout();
    let lastWorkout = "";
    if (workoutList) {
      const lastSetDate = workoutList[0].createdAt;
      await bot.sendMessage(
        chatId,
        `Here\'s your last workout from *${formatDistanceToNow(lastSetDate)}* ago: `,
        { parse_mode: "Markdown" }
      );
      for (let i = 0; i < workoutList.length; i++) {
        lastWorkout += `📌 ${workoutList[i].exercise}: ${workoutList[i].weight} x ${workoutList[i].repetitions}\n`;
      }
    }
    await bot.sendMessage(chatId, lastWorkout, {
      parse_mode: "Markdown",
    });
  }

  if (message === "/delete_last_set") {
    await sets.deleteLastSet();
    await bot.sendMessage(chatId, "✅ Last set deleted");
  }

  if (message === "/start") {
    const userData = await users.getUserData(user!);
    const current_routine = await userData!.current_routine.name;
    const routineObject = await routines.displayRoutine(current_routine);
    const workoutSequence = getWorkoutSequence(routineObject!);
    let lastWorkout = userData!.last_workout;
    const todaysWorkout = getTodaysWorkout(lastWorkout, workoutSequence);
    const todaysWorkoutObject = routineObject!.workouts.filter((obj) => obj.name === todaysWorkout);
    let keyboard_options = generateKeyboardOptions(
      todaysWorkoutObject[0].exercise_sequence
    );
    await bot.sendMessage(chatId, `Here's today's ${todaysWorkout} workout: ⤵`, {
      reply_markup: { inline_keyboard: keyboard_options },
    });
    await users.updateLastWorkout(todaysWorkout);
  };
});

let messageIds: Array<number> = [];

bot.on("callback_query", async (msg) => {
  const exercise = msg.data!;
  const chatId = msg.message!.chat.id;

  if (exercise !== "Done") {
    try {
      await bot
        .sendMessage(chatId, `Recording a set of ${exercise}s...`)
        .then((msg) => messageIds.unshift(msg.message_id));
      const weight = await recordData(chatId, "Add weight in kgs:");
      messageIds.unshift(weight.userMessageId, weight.botMessageId);
      const repetitions = await recordData(chatId, "Add reps:");
      messageIds.unshift(repetitions.userMessageId, repetitions.botMessageId);
      const rpe = await recordData(
        chatId,
        "How difficult was the set on a scale from 5 to 10?"
      );
      messageIds.unshift(rpe.userMessageId, rpe.botMessageId);
      const setData = await sets.addSet(
        exercise,
        weight.data,
        repetitions.data,
        rpe.data
      );
      await bot
        .sendMessage(chatId, setData)
        .then((msg) => messageIds.unshift(msg.message_id));
      let keyboard_options: Array<any> = [
        [{ text: "Yes", callback_data: exercise }],
        [{ text: "No", callback_data: "Done" }],
      ];
      await bot
        .sendMessage(chatId, "One more set?", {
          reply_markup: { inline_keyboard: keyboard_options },
        })
        .then((msg) => messageIds.unshift(msg.message_id));
      console.log(messageIds);
    } catch (e) {
      let result = (e as Error).message;
      await bot
        .sendMessage(chatId, result)
        .then((msg) => messageIds.unshift(msg.message_id));
      return;
    }
  } else {
    if (messageIds.length > 0) {
      for (let i = 0; i < messageIds.length; i++) {
        bot.deleteMessage(chatId, messageIds[i].toString());
      }
    }
    messageIds = [];
    return;
  }
});

interface IData {
  data: number;
  userMessageId: number;
  botMessageId: number;
}
const recordData = (chatId: number, message: string) =>
  new Promise<IData>((resolve, reject) => {
    let botMessageId: number;
    bot
      .sendMessage(chatId, message)
      .then((msg) => (botMessageId = msg.message_id));
    bot.on("message", async (msg) => {
      const userMessageId = msg.message_id;
      if (!isNaN(Number(msg.text!))) {
        const data = {
          data: parseFloat(msg.text!),
          userMessageId,
          botMessageId,
        };
        resolve(data);
      }
      reject(
        new Error(
          `❌ Failed: expected "number" received "${msg.text}".`
        )
      );
    });
  });
