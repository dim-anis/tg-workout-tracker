import type {ObjectId} from 'mongoose';
import {model, Schema} from 'mongoose';

export type IWorkout = {
	user: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	sets: [
		{
			weight: number;
			exercise: string;
			repetitions: number;
			rpe: number;
			notes?: string;
			createdAt: Date;
			updatedAt?: Date;
		},
	];
};

const WorkoutSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		sets: [
			{
				type: new Schema(
					{
						weight: {
							type: Number,
							required: true,
						},
						exercise: {
							type: String,
							required: true,
						},
						repetitions: {
							type: Number,
							required: true,
						},
						rpe: {
							type: Number,
							min: 5,
							max: 10,
							required: true,
						},
						notes: {
							type: String,
						},
					},
					{timestamps: true},
				),
			},
		],
	},
	{timestamps: true, collection: 'workouts'},
);

export default model<IWorkout>('Workout', WorkoutSchema);
