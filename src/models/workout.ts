/* eslint-disable @typescript-eslint/naming-convention */
import {type Types, model, Schema, type Document} from 'mongoose';
import {startOfDay, endOfDay} from 'date-fns';
import {type SetType, SetSchema} from './set';
import {User} from './user';
import {averageRpe} from '../handlers/helpers/countSets';

type WorkoutType = {
	sets: SetType[];
	avg_rpe: number;
} & {updatedAt: Date; createdAt: Date};

const WorkoutSchema = new Schema<WorkoutType>(
	{
		sets: {
			type: [SetSchema],
			required: true,
		},
		avg_rpe: {
			type: Number,
			default: 0,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

const Workout = model<WorkoutType>('Workout', WorkoutSchema);

const getWorkouts = async (limit: number) => Workout.find({}).sort({createdAt: -1}).limit(limit).lean().exec();

export {Workout, type WorkoutType, WorkoutSchema, getWorkouts};
