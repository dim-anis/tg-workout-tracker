import type {Types} from 'mongoose';
import {model, Schema} from 'mongoose';
import differenceInMinutes from 'date-fns/differenceInMinutes';

const workoutOpts = {
	timestamps: true,
	collection: 'workouts',
	toObject: {virtuals: true},
	toJSON: {virtuals: true},
};

const setOpts = {
	timestamps: true,
};

type SetType = {
	weight: number;
	exercise: string;
	repetitions: number;
	rpe: number;
	notes?: string;
};

const setSchema = new Schema<SetType>(
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
	setOpts,
);

export type WorkoutType = {
	user: Types.ObjectId;
	sets: SetType[];
	avg_rpe: number;
	durationInMinutes: number;
};

const workoutSchema = new Schema<WorkoutType>(
	{
		user: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		sets: [setSchema],
		avg_rpe: {type: Number, default: 0},
	},
	workoutOpts,
);

workoutSchema.virtual('durationInMinutes').get(function (this: {createdAt: Date; updatedAt: Date}) {
	return differenceInMinutes(this.updatedAt, this.createdAt);
});

export default model<WorkoutType>('Workout', workoutSchema);
