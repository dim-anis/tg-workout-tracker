/* eslint-disable @typescript-eslint/naming-convention */
import {type Types, Schema, model} from 'mongoose';
import {type SetType, SetSchema} from './set';

export type ArchivedWorkoutType = {
	user: Types.ObjectId;
	sets: SetType[];
	avg_rpe: number;
} & {updatedAt: Date; createdAt: Date};

export const ArchivedWorkoutSchema = new Schema<ArchivedWorkoutType>(
	{
		user: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
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
