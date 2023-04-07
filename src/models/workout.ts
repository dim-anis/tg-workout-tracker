/* eslint-disable @typescript-eslint/naming-convention */
import {model, Schema} from 'mongoose';
import {type SetType, SetSchema} from './set';

type WorkoutType = {
	sets: SetType[];
	avg_rpe: number;
	isDeload: boolean;
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
		isDeload: {
			type: Boolean,
			default: false,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

const Workout = model<WorkoutType>('Workout', WorkoutSchema);

export {Workout, type WorkoutType, WorkoutSchema};
