"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv = __importStar(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const exercises = __importStar(require("./controllers/exercises"));
const sets = __importStar(require("./controllers/sets"));
dotenv.config();
const uri = "mongodb+srv://<username>:<password>@cluster1.vp9hy.mongodb.net/<database>";
const options = {
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD
};
mongoose_1.default.connect(uri, options);
const db = mongoose_1.default.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', function () {
    console.log('Connected to MongoDB successfully');
});
const bot = new node_telegram_bot_api_1.default(process.env.KEY, { polling: true });
bot.setMyCommands([
    { command: '/start_workout', description: '- starts a workout sequence with exercises in selected order' },
    { command: '/show_last_workout', description: '- shows all sets of the last workout' },
    { command: '/show_exercises', description: ' - shows a list of all exercises in the DB' },
    { command: '/set_routine', description: '- allows to set a routine' },
    { command: '/record_set', description: '- allows to record a single set to the db' },
    { command: '/delete_last_set', description: '- deletes last set' },
    { command: '/help', description: '- help' }
]);
bot.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const message = msg.text;
    if (message === '/show_exercises') {
        exercises.showExercises('').then(exercises => {
            if (exercises) {
                let keyboard_options = [];
                for (let i = 0; i < exercises.length; i++) {
                    keyboard_options.push([{ text: exercises[i].name, callback_data: exercises[i].name }]);
                }
                bot.sendMessage(chatId, 'Here\'s today\'s workout: ', { "reply_markup": { inline_keyboard: keyboard_options } });
            }
        });
    }
    if (message === '/show_last_workout') {
        const workoutList = yield sets.getLastWorkout();
        console.log(workoutList);
    }
}));
bot.on('callback_query', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const exercise = msg.data;
    const chatId = msg.message.chat.id;
    try {
        yield bot.sendMessage(chatId, `Recording a set of ${exercise}s...`);
        const weight = yield recordData(chatId, 'Add weight in kgs:');
        const repetitions = yield recordData(chatId, 'Add reps:');
        const rpe = yield recordData(chatId, 'How difficult was the workout on a scale from 5 to 10?');
        console.log(exercise, weight, repetitions, rpe);
        const setData = yield sets.addSet(exercise, weight, repetitions, rpe);
        yield bot.sendMessage(chatId, setData);
    }
    catch (e) {
        let result = e.message;
        yield bot.sendMessage(chatId, result);
        return;
    }
}));
const recordData = (chatId, message) => new Promise((resolve, reject) => {
    bot.sendMessage(chatId, message);
    bot.on('message', msg => {
        const data = parseInt(msg.text);
        if (!isNaN(data)) {
            resolve(data);
        }
        else {
            bot.sendMessage(chatId, `Expected "number" received "${typeof msg.text}".`);
            reject(new Error('Failed to record the set.'));
        }
    });
});
