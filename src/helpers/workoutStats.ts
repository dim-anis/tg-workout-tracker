import { type WorkoutType } from '@/models/workout.js';
import intervalToDuration from 'date-fns/intervalToDuration';
import { ExerciseType, PersonalBest } from '@/models/exercise.js';
import { isToday } from 'date-fns';
import { pounds, roundToNearestHalf } from './unitConverters.js';
import { checkedCircle, getRpeOptionColor } from '@/config/keyboards.js';
import { ArchivedWorkoutType } from '@/models/archivedWorkout.js';
import { MyContext } from '@/types/bot.js';

const dateFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });

type PersonalBestWithName = PersonalBest & { exerciseName: string };
type MuscleGroupToVolumeMap = { [muscleGroup: string]: number };
type WorkoutStats = {
  muscleGroupVolumes: MuscleGroupToVolumeMap,
  totalVolume: number,
  avgRPE: number
}

export function getStats(workouts: (WorkoutType | ArchivedWorkoutType)[], exercises: ExerciseType[]): WorkoutStats {
  const muscleGroupVolumes = workouts.reduce((acc: MuscleGroupToVolumeMap, workout) => {
    const volumePerWorkout = getVolumePerMuscleGroup(workout.sets, exercises);
    for (const [muscleGroup, volume] of Object.entries(volumePerWorkout)) {
      !acc[muscleGroup]
        ? acc[muscleGroup] = volume
        : acc[muscleGroup] += volume
    }

    return acc;
  }, {});

  const totalVolume = Object.values(muscleGroupVolumes).reduce((total, currVolume) => total + currVolume, 0);
  let avgRPE = workouts.reduce((total, workout) => total + workout.avg_rpe, 0);
  avgRPE = roundToNearestHalf(avgRPE / workouts.length);

  return { muscleGroupVolumes, totalVolume, avgRPE };
}

export function getStatsForWorkout(ctx: MyContext, workout: WorkoutType) {
  const date = workout.createdAt;
  const duration = workout.updatedAt && intervalToDuration({
    start: new Date(workout.createdAt),
    end: new Date(workout.updatedAt)
  });
  const totalVolume = getTotalVolume(workout.sets);
  const prs = getPrs(ctx.dbchat.exercises);

  return { date, duration, totalVolume, prs };
}

export function renderWorkoutStatsMessage(
  ctx: MyContext,
  workout: WorkoutType,
  workoutCount?: number,
) {
  const { isMetric } = ctx.dbchat.settings;
  const weightUnit = isMetric ? 'kg' : 'lb';
  const { date, duration, totalVolume, prs } = getStatsForWorkout(ctx, workout);
  const totalDurationString = workout.updatedAt
    ? `<b>${duration.hours || 0}h ${duration.minutes || 0}m ${duration.seconds || 0}s</b>`
    : 'N/A'
  const prMessage = prs?.length ? generatePrMessage(prs, weightUnit) : '';

  const message =
    `<b>Workout Stats</b>\n\n` +
    `📅 Date: <b>${dateFormat.format(date)}</b>\n` +
    `📋 Workout number: <b>${workout.isDeload ? 'deload workout' : workoutCount}</b>\n` +
    `🏋️‍♂️ Total volume: <b>${isMetric ? totalVolume : pounds(totalVolume)}${weightUnit}</b>\n` +
    `⏱️ Total duration: <b>${totalDurationString}</b>\n` +
    `${getRpeOptionColor(workout.avg_rpe)} Average RPE: <b>${workout.avg_rpe}</b>` +
    prMessage;

  return message;
}

export function getStatsString(workoutStats: WorkoutStats, isMetric: boolean) {
  const { muscleGroupVolumes, avgRPE } = workoutStats;
  let { totalVolume } = workoutStats;
  const weightUnit = isMetric ? 'kg' : 'lb';
  totalVolume = Math.round(isMetric ? totalVolume : pounds(totalVolume));

  const volumePerGroup: string[] = [];
  for (let [muscleGroup, volume] of Object.entries(muscleGroupVolumes)) {
    volume = Math.round(isMetric ? volume : pounds(volume));
    volumePerGroup.push(`    • <b>${muscleGroup}:</b> ${volume.toLocaleString()}${weightUnit}`);
  }

  const statsText = `
<b>Total volume: ${totalVolume.toLocaleString()}${weightUnit}</b> 

${volumePerGroup.join('\n')}

Average RPE: ${getRpeOptionColor(avgRPE)} <b>${avgRPE}</b>
`
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

export function generatePrMessage(newPbs: PersonalBestWithName[], unit: 'kg' | 'lb') {
  const pbMessageLines = [];
  if (newPbs.length > 0) {
    for (const newPb of newPbs) {
      let pbDiff = 0;
      if (newPb.oldPb) {
        const pbWeightDiffInKg = Number((newPb.weight - newPb.oldPb?.weight).toFixed(1));
        const pbWeightDiffConverted = unit === 'kg' ? pbWeightDiffInKg : pounds(pbWeightDiffInKg);
        const pbWeightDiffConvertedRounded = Number.isInteger(pbWeightDiffConverted) ? Math.floor(pbWeightDiffConverted) : pbWeightDiffConverted;
        pbDiff = pbWeightDiffConvertedRounded;
      }

      const strengthImprovement = pbDiff ? ` (+${pbDiff}${unit})` : '';
      const newWeight = unit === 'kg' ? newPb.weight : pounds(newPb.weight);

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
