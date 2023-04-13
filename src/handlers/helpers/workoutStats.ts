import {type WorkoutType} from 'models/workout';
import intervalToDuration from 'date-fns/intervalToDuration';

export function countSets(setsArray: WorkoutType['sets'] = []): Record<string, number> {
	const counts: Record<string, number> = setsArray.reduce<Record<string, number>>((acc, set) => {
		const exerciseName = set.exercise;
		acc[exerciseName] = acc[exerciseName] ? acc[exerciseName] + 1 : 1;
		return acc;
	}, {});
	return counts;
}

export const getAverageRPE = (setsArray: WorkoutType['sets']) => Number((setsArray.reduce((total, set) => total + set.rpe, 0) / setsArray.length).toFixed(1));

export function getTotalVolume(setsArray: WorkoutType['sets']) {
	return setsArray.reduce((totalVolume, set) => totalVolume + (set.weight * set.repetitions), 0);
}

export function getWorkoutStatsText(workout: WorkoutType, workoutNumber: number, mesocycleLength: number) {
	const dateString = new Date().toLocaleDateString();
	const {createdAt, updatedAt} = workout;
	const {hours, minutes, seconds} = intervalToDuration({
		start: new Date(createdAt),
		end: new Date(updatedAt),
	});
	const totalDurationString = `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'min' : ''} ${seconds ? seconds + 's' : ''}`;
	const avgRpe = getAverageRPE(workout.sets);
	const totalVolume = getTotalVolume(workout.sets).toLocaleString();
	
	const statsText = `<b>Workout Stats</b>\n\n`
	+ `🔢 Workout number: <b>${workoutNumber}/${mesocycleLength}</b>\n`
	+ `📅 Date: <b>${dateString}</b>\n`
	+ `🏋️‍♂️ Total volume: <b>${totalVolume}kgs</b>\n`
	+ `⏱️ Total duration: <b>${totalDurationString}</b>\n`
	+ `⭐ Average RPE: <b>${avgRpe}</b>`;

	return statsText;
}
