import { type WorkoutType } from 'models/workout.js';
import intervalToDuration from 'date-fns/intervalToDuration';
import { ExerciseType, PersonalBest } from 'models/exercise.js';
import { isToday } from 'date-fns';
import { fromKgToLbRounded, roundToNearestHalf } from './unitConverters.js';
import { checkedCircle, getRpeOptionColor } from '../../config/keyboards.js';
import { ArchivedWorkoutType } from 'models/archivedWorkout.js';

type PersonalBestWithName = PersonalBest & { exerciseName: string };
type MuscleGroupToVolumeMap = { [muscleGroup: string]: number };

export function getStats(workouts: (WorkoutType | ArchivedWorkoutType)[], exercises: ExerciseType[]) {
  const volumePerMuscleGroup = workouts.reduce((acc: MuscleGroupToVolumeMap, workout) => {
    const volumePerWorkout = getVolumePerMuscleGroup(workout.sets, exercises);
    for (const [muscleGroup, volume] of Object.entries(volumePerWorkout)) {
      if (!acc[muscleGroup]) {
        acc[muscleGroup] = volume;
      } else {
        acc[muscleGroup] += volume;
      }
    }

    return acc;
  }, {});

  const totalVolume = Object.values(volumePerMuscleGroup).reduce((total, currVolume) => total + currVolume, 0);
  let avgRPE = workouts.reduce((total, workout) => total + workout.avg_rpe, 0);
  avgRPE = roundToNearestHalf(avgRPE / workouts.length);

  return { volumePerMuscleGroup, totalVolume, avgRPE };
}

export function getStatsString(totalVolume: number, volumePerMuscleGroupMap: MuscleGroupToVolumeMap, avgRPE: number, isMetric: boolean) {
  const weightUnit = isMetric ? 'kg' : 'lb';
  totalVolume = weightUnit === 'kg' ? Math.round(totalVolume) : Math.round(fromKgToLbRounded(totalVolume));

  const volumePerMuscleGroup: string[] = [];
  for (let [muscleGroup, volume] of Object.entries(volumePerMuscleGroupMap)) {
    volume = weightUnit === 'kg' ? Math.round(volume) : Math.round(fromKgToLbRounded(volume));
    volumePerMuscleGroup.push(`    • <b>${muscleGroup}:</b> ${volume.toLocaleString()}${weightUnit}`);
  }

  const statsText = `
<b>Total volume: ${totalVolume.toLocaleString()}${weightUnit}</b> 

${volumePerMuscleGroup.join('\n')}

Average RPE: ${getRpeOptionColor(avgRPE)} <b>${avgRPE}</b>
`
  return statsText;
}

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
    ? `<b>${hours || 0}h ${minutes || 0}m ${seconds || 0}s</b>`
    : 'N/A'
  const totalVolumeInKg = getTotalVolume(workout.sets);
  const totalVolume = weightUnit === 'kg' ? totalVolumeInKg : fromKgToLbRounded(totalVolumeInKg);
  const prMessage = prs?.length ? generatePrMessage(prs, weightUnit) : '';

  const statsText =
    `<b>Workout Stats</b>\n\n` +
    `📅 Date: <b>${workoutDate}</b>\n` +
    `💤 Is deload workout: <b>${workout.isDeload ? 'yes' : 'no'}</b>\n` +
    `📋 Workout number: <b>${workoutCount}</b>\n` +
    `🏋️‍♂️ Total volume: <b>${totalVolume.toLocaleString()}${weightUnit}</b>\n` +
    `⏱️ Total duration: <b>${totalDurationString}</b>\n` +
    `${getRpeOptionColor(workout.avg_rpe)} Average RPE: <b>${workout.avg_rpe}</b>` +
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

function generatePrMessage(newPbs: PersonalBestWithName[], unit: 'kg' | 'lb') {
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

export const getAverageRPE = (sets: WorkoutType['sets']) => roundToNearestHalf(sets.reduce((total, set) =>
  total + set.rpe, 0) / sets.length);

export function getTotalVolume(sets: WorkoutType['sets']) {
  return sets.reduce(
    (totalVolume, set) => totalVolume + set.weight * set.repetitions,
    0
  );
}

export function getVolumePerMuscleGroup(sets: WorkoutType['sets'], exercises: ExerciseType[]) {
  const result = sets.reduce((acc: MuscleGroupToVolumeMap, set) => {
    const category = exercises.find(exercise => exercise.name === set.exercise)?.category;
    if (!category) return {};

    if (!acc[category]) {
      acc[category] = set.weight * set.repetitions;
    } else {
      acc[category] += set.weight * set.repetitions;
    }

    return acc;
  }, {});

  return result;
}

export function getCompletedSetsString(setCount = 0) {
  return `${[checkedCircle.repeat(setCount)]}`;
}
