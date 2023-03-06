/* eslint-disable @typescript-eslint/naming-convention */

import dotenv from 'dotenv';
import bot from './src/bot/bot.js';
import dbConnect from './src/config/dbConnection.js';
import express from 'express';
import mongoose from 'mongoose';

import exercises from './src/routes/exercises.js';
import workouts from './src/routes/workouts.js';
import users from './src/routes/users.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT ?? 5000;

mongoose.set('strictQuery', false);
await dbConnect();

const db = mongoose.connection;
app.listen(PORT, () => {
	console.log(`Server is running on port: ${PORT}.`);
	db.once('open', async () => {
		console.log('Connected to MongoDB');
		await bot.start({
			drop_pending_updates: true,
			async onStart() {
				console.log('Bot is running');
			},
		});
	});
});

app.use(express.json());

app.use('/exercises', exercises);
app.use('/workouts', workouts);
app.use('/users', users);

// App.use(errorHandler);

process.once('SIGTERM', async () => bot.stop());
process.once('SIGINT', async () => bot.stop());
