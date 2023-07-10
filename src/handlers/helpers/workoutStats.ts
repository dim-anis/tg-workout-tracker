import { type WorkoutType } from 'models/workout.js';
import intervalToDuration from 'date-fns/intervalToDuration';
import { ExerciseType, PersonalBest } from 'models/exercise.js';
import { isToday } from 'date-fns';
import { fromKgToLbRounded } from './unitConverters.js';
import { checkedCircle } from '../../config/keyboards.js';

export function generateWorkoutStatsString(
  workout: WorkoutType,
  isMetric: boolean,
  workoutCount?: number,
  prs?: PersonalBestWithName[],
) {
  const weightUnit = isMetric ? 'kg' : 'lb';
  const workoutDate = workout.createdAt.toLocaleDateString();
  const { hours, minutes, seconds } = workout.updatedAt && intervalToDuration({
    start: new Date(workout.createdAt),
    end: new Date(workout.updatedAt)
  });
  const totalDurationString = workout.updatedAt 
    ? 'N/A' 
    : `<b>${hours || 0}h ${minutes || 0}m ${seconds || 0}s</b>`
  const totalVolumeInKg = getTotalVolume(workout.sets);
  const totalVolume = weightUnit === 'kg' ? totalVolumeInKg : fromKgToLbRounded(totalVolumeInKg);
  const prMessage = prs?.length ? createPrMessage(prs, weightUnit) : '';

  const statsText =
    `<b>Workout Stats</b>\n\n` +
    `🔢 Workout number: <b>${workoutCount}</b>\n` +
    `📅 Date: <b>${workoutDate}</b>\n` +
    `🏋️‍♂️ Total volume: <b>${totalVolume.toLocaleString()}${weightUnit}</b>\n` +
    `⏱️ Total duration: <b>${totalDurationString}</b>\n` +
    `⭐ Average RPE: <b>${workout.avg_rpe}</b>` +
    prMessage;

  return statsText;
}

export function getPrs(exercises: ExerciseType[]): PersonalBestWithName[] {
  const exerciseMap = new Map(exercises.map(exercise => [exercise.name, exercise]));
  const out = [];

  for (const [exerciseName, exerciseData] of exerciseMap) {
    if (exerciseData.personalBests) {
      for (const pb of exerciseData.personalBests) {
        if (isToday(pb.date)) {
          const newPr = { exerciseName, ...pb };
          out.push(newPr);
        }
      }
    }
  }

  return out;
}

type PersonalBestWithName = PersonalBest & { exerciseName: string };

function createPrMessage(newPbs: PersonalBestWithName[], unit: 'kg' | 'lb') {
  const pbMessageLines = [];
  if (newPbs.length > 0) {
    for (const newPb of newPbs) {
      let pbDiff = 0;
      if (newPb.oldPb) {
        const pbWeightDiffInKg = Number((newPb.weight - newPb.oldPb?.weight).toFixed(1));
        const pbWeightDiffConverted = unit === 'kg' ? pbWeightDiffInKg : fromKgToLbRounded(pbWeightDiffInKg);
        const pbWeightDiffConvertedRounded = Number.isInteger(pbWeightDiffConverted) ? Math.floor(pbWeightDiffConverted) : pbWeightDiffConverted;
        pbDiff = pbWeightDiffConvertedRounded;
      }

      const strengthImprovement = pbDiff ? ` (+${pbDiff}${unit})` : '';
      const newWeight = unit === 'kg' ? newPb.weight : fromKgToLbRounded(newPb.weight);

      pbMessageLines.push(`${newPb.exerciseName} - <b>${newWeight}${unit} x ${newPb.repetitions} ${strengthImprovement}</b>`)
    }
  }

  return '\n\n<b>You\'ve hit new PRs!</b>\n' + pbMessageLines.join('\n');
}


export function countSets(
  setsArray: WorkoutType['sets'] = []
): Record<string, number> {
  const counts: Record<string, number> = setsArray.reduce<
    Record<string, number>
  >((acc, set) => {
    const exerciseName = set.exercise;
    acc[exerciseName] = acc[exerciseName] ? acc[exerciseName] + 1 : 1;
    return acc;
  }, {});
  return counts;
}

export const getAverageRPE = (setsArray: WorkoutType['sets']) =>
  Number(
    (
      setsArray.reduce((total, set) => total + set.rpe, 0) / setsArray.length
    ).toFixed(1)
  );

export function getTotalVolume(setsArray: WorkoutType['sets']) {
  return setsArray.reduce(
    (totalVolume, set) => totalVolume + set.weight * set.repetitions,
    0
  );
}

export function getCompletedSetsString(setCount = 0) {
  return `${[checkedCircle.repeat(setCount)]}`;
}
