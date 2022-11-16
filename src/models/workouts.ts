import type {InferSchemaType} from 'mongoose';
import {model, Schema} from 'mongoose';

const workoutSchema = new Schema(
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

export type WorkoutType = InferSchemaType<typeof workoutSchema> & {updatedAt: Date; createdAt: Date};

export default model<WorkoutType>('Workout', workoutSchema);
