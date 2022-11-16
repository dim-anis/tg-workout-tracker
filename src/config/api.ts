import type {WorkoutType} from '../models/workouts';

export type GetWorkoutsResponse = {
	response: string;
	message?: string;
	data: WorkoutType[];
};

export type UpdateWorkoutResponse = {
	response: string;
	message?: string;
	data: WorkoutType;
};
