import botAPI from "node-telegram-bot-api";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { findExercise } from "./controllers/exercises";
import {
  getLastWorkoutSets,
  getAllSetsOf,
  addSet,
  deleteLastSet,
  getLastNumberOfSets,
  getAllSetsFrom
} from "./controllers/sets";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {
  generateKeyboardOptions,
  sortSetsByDate,
  getLastWorkoutsDate
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
    description: "start next workout in the split",
  }, // implemented
  {
    command: "/record_set",
    description: "record a single set",
  }, // implemented
  { command: "/delete_last_set", description: "delete last set" }, // implemented
  {
    command: "/show_last_workout",
    description: "show all sets of the last workout",
  }, // implemented
  {
    command: "/set_routine",
    description: "set a routine (currently disabled)",
  },
]);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;

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
    const lastWorkoutSets = await getLastWorkoutSets();
    if (lastWorkoutSets) {
      const lastWorkoutDate = lastWorkoutSets[0].createdAt;
      let lastWorkoutMessage = `Your last workout from *${formatDistanceToNow(
        lastWorkoutDate
      )}* ago:\n\n`;
      for (let i = 0; i < lastWorkoutSets.length; i++) {
        lastWorkoutMessage += `📌 ${lastWorkoutSets[i].exercise}: ${lastWorkoutSets[i].weight} x ${lastWorkoutSets[i].repetitions}\n`;
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
    // continue here
    const lastWorkoutsSets = await getLastNumberOfSets(100);
    const lastWorkoutsDate = getLastWorkoutsDate(3, lastWorkoutsSets!);
    const setsFromTheLastWorkout = await getAllSetsFrom(lastWorkoutsDate);
    const options = new Set(setsFromTheLastWorkout!.map((object) => object.exercise));
    const keyboard_options = generateKeyboardOptions(
      [...options],
      "startCommand"
    );
    await bot.sendMessage(
      chatId,
      `Here's today's WORKOUT_NAME workout:`,
      {
        reply_markup: { inline_keyboard: keyboard_options },
      }
    );
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
      const repsIncrement = parseFloat(msg.data!.split("/")[2]);
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
        .sendMessage(chatId, "✅ Set successfully recorded")
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
      const exerciseType = await findExercise(exercise);
      const isCompound = exerciseType![0].is_compound;
      const allSets = await getAllSetsOf(exercise);
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
