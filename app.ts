import botAPI from "node-telegram-bot-api";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { findExercise } from "./controllers/exercises";
import {
  getLastWorkout,
  getAllSets,
  addSet,
  deleteLastSet,
} from "./controllers/sets";
import { displayRoutine } from "./controllers/routines";
import { getUserData, updateLastWorkout } from "./controllers/users";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {
  getTodaysWorkout,
  getWorkoutSequence,
  generateKeyboardOptions,
  sortSetsByDate,
} from "./utils/utils";

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
]);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;
  const user = msg.from?.last_name;

  if (message === "/record_set") {
    const exerciseList = await findExercise("");
    const exerciseNames = exerciseList?.map((item) => item.name);
    if (exerciseNames) {
      const keyboard_options = generateKeyboardOptions(
        exerciseNames,
        "recordSetCommand"
      );
      bot.sendMessage(chatId, "Choose an exercise: ", {
        reply_markup: { inline_keyboard: keyboard_options },
      });
    }
  }

  if (message === "/show_last_workout") {
    const workoutList = await getLastWorkout();
    if (workoutList) {
      const lastSetDate = workoutList[0].createdAt;
      let lastWorkoutMessage = `Your last workout from *${formatDistanceToNow(
        lastSetDate
      )}* ago:\n\n`;
      for (let i = 0; i < workoutList.length; i++) {
        lastWorkoutMessage += `📌 ${workoutList[i].exercise}: ${workoutList[i].weight} x ${workoutList[i].repetitions}\n`;
      }
      await bot.sendMessage(chatId, lastWorkoutMessage, {
        parse_mode: "Markdown",
      });
    }
  }

  if (message === "/delete_last_set") {
    await deleteLastSet();
    await bot.sendMessage(chatId, "✅ Last set deleted");
  }

  if (message === "/start") {
    const userData = await getUserData(user!);
    const current_routine = await userData!.current_routine[0].name;
    const routineObject = await displayRoutine(current_routine);

    if (routineObject) {
      const workoutSequence = getWorkoutSequence(routineObject!);
      let lastWorkout = userData!.last_workout;
      const todaysWorkout = getTodaysWorkout(lastWorkout, workoutSequence);
      const todaysWorkoutObject = routineObject!.workouts.filter(
        (obj) => obj.name === todaysWorkout
      );
      const todaysExercises = todaysWorkoutObject[0].exercise_sequence.map(
        (item) => item.name
      );
      const keyboard_options = generateKeyboardOptions(
        todaysExercises,
        "startCommand"
      );
      await bot.sendMessage(
        chatId,
        `Here's today's ${todaysWorkout} workout:`,
        {
          reply_markup: { inline_keyboard: keyboard_options },
        }
      );
      await updateLastWorkout(todaysWorkout);
    }
  }
});

let messageIds: Array<number> = [];
let numSet = 1;
interface Set {
  exercise?: string;
  lastWeight?: number;
  lastReps?: number;
  lastRPE?: number;
}
let set: Set = {};

bot.on("callback_query", async (msg) => {
  console.log(msg.data);
  const [command, data] = msg.data!.split("/");
  const chatId = msg.message!.chat.id;

  if (command === "startCommand") {
    if (data === "recordWeight") {
      const weightIncrement = parseFloat(msg.data!.split("/")[2]);
      set = {
        ...set,
        lastWeight: !isNaN(weightIncrement)
          ? set.lastWeight! + weightIncrement
          : set.lastWeight,
      };
      const keyboard_options = generateKeyboardOptions(
        ["-2", "-1", "✅", "+1", "+2"],
        "startCommand/recordReps"
      );
      await bot
        .sendMessage(chatId, `Recommended reps: *${set.lastReps}*`, {
          reply_markup: { inline_keyboard: keyboard_options },
          parse_mode: "Markdown",
        })
        .then((msg) => messageIds.unshift(msg.message_id));
    } else if (data === "recordReps") {
      const repsIncrement = parseInt(msg.data!.split("/")[2]);
      set = {
        ...set,
        lastReps: !isNaN(repsIncrement)
          ? set.lastReps! + repsIncrement
          : set.lastReps,
      };
      const keyboard_options = generateKeyboardOptions(
        ["5", "6", "7", "8", "9"],
        "startCommand/recordRPE"
      );
      await bot
        .sendMessage(chatId, `How did it feel?`, {
          reply_markup: { inline_keyboard: keyboard_options },
          parse_mode: "Markdown",
        })
        .then((msg) => messageIds.unshift(msg.message_id));
    } else if (data === "recordRPE") {
      const rpeValue = parseFloat(msg.data!.split("/")[2]);
      set = {
        ...set,
        lastRPE: rpeValue,
      };
      // All data collected, ready to addSet
      await addSet(set.exercise!, set.lastWeight!, set.lastReps!, set.lastRPE!);
      await bot
        .sendMessage(chatId, "✅Set successfully recorded")
        .then((msg) => messageIds.unshift(msg.message_id));
      let keyboard_options: Array<any> = [
        [{ text: "Yes", callback_data: `startCommand/${set.exercise}` }],
        [{ text: "No", callback_data: "finishExercise" }],
      ];
      await bot
        .sendMessage(chatId, "One more set?", {
          reply_markup: { inline_keyboard: keyboard_options },
        })
        .then((msg) => messageIds.unshift(msg.message_id));
    } else {
      const exercise = data;
      const exerciseInfo = await findExercise(exercise);
      const isCompound = exerciseInfo![0].is_compound;
      const allSets = await getAllSets(exercise);
      const sortedSets = sortSetsByDate(allSets!);
      const lastWeight = sortedSets?.at(-2)?.sets[0].weight;
      const lastReps = sortedSets?.at(-2)?.sets[0].repetitions;
      const options =
        isCompound === true
          ? ["-5kg", "-2.5kg", "✅", "+2.5kg", "+5kg"]
          : ["-2.5kg", "-1kg", "✅", "+1kg", "+2.5kg"];
      set = {
        ...set,
        exercise,
        lastWeight,
        lastReps,
      };
      const keyboard_options = generateKeyboardOptions(
        options,
        "startCommand/recordWeight"
      );
      await bot
        .sendMessage(
          chatId,
          `Recording a set of *${exercise.toUpperCase()}*\nLast time you did: *${lastWeight}kg x ${lastReps}*`,
          {
            reply_markup: { inline_keyboard: keyboard_options },
            parse_mode: "Markdown",
          }
        )
        .then((msg) => messageIds.unshift(msg.message_id));
    }
  } else if (command === "recordSetCommand") {
    try {
      const exercise = data;
      await bot
        .sendMessage(chatId, `Recording set #${numSet} of ${exercise}s...`)
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
      const setData = await addSet(
        exercise,
        weight.data,
        repetitions.data,
        rpe.data
      );
      await bot
        .sendMessage(chatId, setData)
        .then((msg) => messageIds.unshift(msg.message_id));
      let keyboard_options: Array<any> = [
        [{ text: "Yes", callback_data: `recordSetCommand/${exercise}` }],
        [{ text: "No", callback_data: "finishExercise" }],
      ];
      await bot
        .sendMessage(chatId, "One more set?", {
          reply_markup: { inline_keyboard: keyboard_options },
        })
        .then((msg) => messageIds.unshift(msg.message_id));
      numSet += 1;
    } catch (e) {
      let result = (e as Error).message;
      numSet = 1;
      await bot
        .sendMessage(chatId, result)
        .then((msg) => messageIds.unshift(msg.message_id));
      return;
    }
  } else if (command === "finishExercise") {
    if (messageIds.length > 0) {
      for (let i = 0; i < messageIds.length; i++) {
        bot.deleteMessage(chatId, messageIds[i].toString());
      }
    }
    numSet = 1;
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
      reject(new Error(`❌ Failed: expected "number" received "${msg.text}".`));
    });
  });
