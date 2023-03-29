import {type WorkoutType} from 'models/workout';

export function countSets(sets: WorkoutType['sets'] = []): Record<string, number> {
	const counts: Record<string, number> = sets.reduce<Record<string, number>>((acc, set) => {
		const exerciseName = set.exercise;
		acc[exerciseName] = acc[exerciseName] ? acc[exerciseName] + 1 : 1;
		return acc;
	}, {});
	return counts;
}

export const averageRpe = (array: WorkoutType['sets']) => Number((array.reduce((total, set) => total + set.rpe, 0) / array.length).toFixed(1));
