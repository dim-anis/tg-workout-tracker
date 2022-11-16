import dotenv from 'dotenv';
import bot from './src/bot.js';
import dbConnect from './src/config/dbConnection.js';
import express from 'express';
import mongoose from 'mongoose';

import allExercises from './src/routes/exercises.js';
import workouts from './src/routes/workouts.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT ?? 5000;

void dbConnect();

const db = mongoose.connection;
app.listen(PORT, () => {
	console.log(`Server is running on port: ${PORT}.`);
	db.once('open', async () => {
		console.log('Connected to MongoDB');
		await bot.start({
			async onStart() {
				console.log('Bot is running');
			},
		});
	});
});

app.use(express.json());
app.use('/exercises', allExercises);
app.use('/workouts', workouts);
