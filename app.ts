import botAPI from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import mongoose, { Query } from 'mongoose';
import User from './models/user';
import Set from './models/set';
import * as exercises from './controllers/exercises';
import * as sets from './controllers/sets';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

dotenv.config();

const uri = "mongodb+srv://<username>:<password>@cluster1.vp9hy.mongodb.net/<database>";
const options = {
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD
};

mongoose.connect(uri, options);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', function() {
    console.log('Connected to MongoDB successfully');
});

const bot = new botAPI(<string>process.env.KEY, { polling: true } );



bot.setMyCommands(
    [
        { command: '/start_workout', description: '- starts a workout sequence with exercises in selected order' },
        { command: '/show_last_workout', description: '- shows all sets of the last workout' }, // implemented
        { command: '/show_exercises', description: ' - shows a list of all exercises in the DB'}, // implemented
        { command: '/set_routine', description: '- allows to set a routine' },
        { command: '/record_set', description: '- allows to record a single set to the db' },
        { command: '/delete_last_set', description: '- deletes last set' },
        { command: '/help', description: '- help' }
    ]
)

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const message = msg.text;
    if (message === '/show_exercises') {
        exercises.showExercises('').then( exercises => {
            if (exercises) {
                let keyboard_options = [];
                for (let i = 0; i < exercises.length; i++) {

                    keyboard_options.push([ {text: exercises[i].name, callback_data: exercises[i].name} ]);
                }
                bot.sendMessage(chatId, 'Here\'s today\'s workout: ', { "reply_markup": { inline_keyboard: keyboard_options } });
            }
        });
    }
    if (message === '/show_last_workout') {
        const workoutList = await sets.getLastWorkout();
        let lastWorkoutMessage = '';
        if (workoutList) {
            await bot.sendMessage(chatId, `Here\'s your last workout from *${formatDistanceToNow(workoutList[0].createdAt)}* ago: `, { parse_mode: 'Markdown'});
            for (let i = 0; i < workoutList?.length; i++) {
                lastWorkoutMessage += `• ${workoutList[i].exercise} \- ${workoutList[i].weight}kgs\|${workoutList[i].repetitions}reps\n`
            }
        }
        await bot.sendMessage(chatId, lastWorkoutMessage, { parse_mode: 'Markdown' });
    }
    if (message === '/delete_last_set') {
        await sets.deleteLastSet();
        bot.sendMessage(chatId, '🗑Last set has been successfully deleted.');
    }
});

bot.on('callback_query', async msg => {
    const exercise = msg.data!;
    const chatId = msg.message!.chat.id;

    try {
        await bot.sendMessage(chatId, `Recording a set of ${exercise}s...`);
        const weight = await recordData(chatId, 'Add weight in kgs:');
        const repetitions = await recordData(chatId, 'Add reps:');
        const rpe = await recordData(chatId, 'How difficult was the workout on a scale from 5 to 10?');
        console.log(exercise, weight, repetitions, rpe);
        const setData = await sets.addSet(exercise, weight, repetitions, rpe);
        await bot.sendMessage(chatId, setData);
    } catch (e) {
        let result = (e as Error).message;
        await bot.sendMessage(chatId, result);
        return;
    }
});

const recordData = (chatId: number, message: string) => new Promise<number>( (resolve, reject) => {
    bot.sendMessage(chatId, message);
    bot.on('message', async msg => {
        const data = parseInt(msg.text!);
        if (!isNaN(data)) {
            resolve(data);
            return;
        }
        reject(new Error(`Failed to record the set. Expected "number" received "${typeof msg.text}".`));
        return;
    });
});