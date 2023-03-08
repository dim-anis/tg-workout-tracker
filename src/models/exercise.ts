/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema, type Types} from 'mongoose';

export type ExerciseType = {
	_id: Types.ObjectId;
	name: string;
	category: string;
	is_compound: boolean;
};

const ExerciseSchema = new Schema(
	{
		name: {type: String, unique: true},
		category: {type: String},
		is_compound: {type: Boolean, default: false},
	},
);

const Exercise = model<ExerciseType>('Exercise', ExerciseSchema);

const getAllExercises = async () => Exercise.find({}).lean();

const findExerciseByName = async (name: string) => Exercise.find({name});

const findExercisesByCategory = async (category: string) => Exercise.find({category}, 'name').exec();

const createExercise = async (name: string, category: string, is_compound: boolean) => {
	const exercise = new Exercise({name, category, is_compound});
	await exercise.save();
	return exercise;
};

export {Exercise, getAllExercises, findExerciseByName, findExercisesByCategory, createExercise};

