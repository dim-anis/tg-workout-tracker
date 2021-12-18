import botAPI from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import mongoose, { Query } from 'mongoose';
import User from './models/user';
import Set from './models/set';
import * as exercises from './controllers/exercises';

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
        { command: '/show_exercises', description: ' - shows a list of all exercises in the DB'},
        { command: '/set_routine', description: '- allows to set a routine' },
        { command: '/record_set', description: '- allows to record a single set to the db' },
        { command: '/delete_last_set', description: '- deletes last set' },
        { command: '/help', description: '- help' }
    ]
)

bot.on('message', msg => {
    const chatId = msg.chat.id;
    const message = msg.text;
    if (message === '/show_exercises') {
        exercises.showExercises('').then( exercises => {
            if (exercises) {
                let keyboard_options = [];
                for (let i = 0; i < exercises.length; i++) {

                    keyboard_options.push([ {text: exercises[i].name, callback_data: i.toString()} ]);
                }
                bot.sendMessage(chatId, 'Here\'s today\'s workout: ', { "reply_markup": { inline_keyboard: keyboard_options } });
            }
        });
    }
});
