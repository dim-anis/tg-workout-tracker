import { type WorkoutType } from 'models/workout.js';
import intervalToDuration from 'date-fns/intervalToDuration';
import { ExerciseType, PersonalBest } from 'models/exercise.js';
import { isToday } from 'date-fns';

export function convertWeightWithRounding(weight: number, weightUnit: 'kg' | 'lb'): number {
  const weightConversionFactor = 2.20462;
  const roundingFactor = weightUnit === 'kg' ? 0.5 : 1;
  const convertedWeight = Math.round(weight * weightConversionFactor / roundingFactor) * roundingFactor;

  return convertedWeight;
}

export function getWorkoutStatsText(
  workout: WorkoutType,
  workoutCount: number,
  prs: PersonalBestWithName[],
  isMetric: boolean
) {
  const weightUnit = isMetric ? 'kg' : 'lb';
  const dateString = new Date().toLocaleDateString();
  const { createdAt, updatedAt } = workout;
  const { hours, minutes, seconds } = intervalToDuration({
    start: new Date(createdAt),
    end: new Date(updatedAt)
  });
  const totalDurationString = `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'min' : ''
    } ${seconds ? seconds + 's' : ''}`;
  const totalVolume = convertWeightWithRounding(getTotalVolume(workout.sets), weightUnit).toLocaleString();
  const prMessage = prs.length ? createPrMessage(prs, isMetric) : '';

  const statsText =
    `<b>Workout Stats</b>\n\n` +
    `🔢 Workout number: <b>${workoutCount}</b>\n` +
    `📅 Date: <b>${dateString}</b>\n` +
    `🏋️‍♂️ Total volume: <b>${totalVolume}${weightUnit}</b>\n` +
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

function createPrMessage(newPbs: PersonalBestWithName[], isMetric: boolean) {
  const weightUnit = isMetric ? 'kg' : 'lb';

  const pbMessageLines = [];
  if (newPbs.length > 0) {
    for (const newPb of newPbs) {
      let diff;
      if (newPb.oldPb) {
        diff = convertWeightWithRounding(newPb.weight - newPb.oldPb?.weight, weightUnit);
        diff = Number.isInteger(diff) ? diff : diff.toFixed(2);
      }
      const strengthImprovement = diff ? ` (+${diff}${weightUnit})` : '';
      pbMessageLines.push(`${newPb.exerciseName} - ${convertWeightWithRounding(newPb.weight, weightUnit)}${weightUnit} x ${newPb.repetitions} ${strengthImprovement}`)
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

