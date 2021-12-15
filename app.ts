import * as dotenv from 'dotenv';
import botAPI from 'node-telegram-bot-api';
import mongoose from 'mongoose';
import User from './models/user';
import Set from './models/set';

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

// command "/startWorkout" - starts a workout sequence with exercises in selected order

// command "/setRoutine" - allows to set a routine

// command "/recordSet" - allows to record a single set to the db

// command "/deleteLastSet" - deletes last set

// command "/help"
