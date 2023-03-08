import {type WorkoutType} from 'models/workout';

export const countSets = (setsArray: WorkoutType['sets']) => setsArray.reduce<Record<string, number>>((result, curr) => {
	if (curr.exercise in result) {
		result[curr.exercise]++;
	} else {
		result[curr.exercise] = 1;
	}

	return result;
}, {});

export const averageRpe = (array: WorkoutType['sets']) => Number((array.reduce((total, set) => total + set.rpe, 0) / array.length).toFixed(1));
