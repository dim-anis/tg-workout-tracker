export const successMessages = {
  onRecordSetSuccess:
    '✅ <b>Successfully recorded.</b> Would you like to record one more set?'
};

export const getRecordWeightMessage = (exerciseName: string, completedSets: string, previousWeight: number, hitAllReps: boolean, unit: 'kg' | 'lb' = 'kg') => {
  const weightUnit = unit === 'kg' ? 'kg' : 'lbs';
  const weightConversionFactor = unit === 'kg' ? 1 : 2.20462;
  const convertedWeight = previousWeight * weightConversionFactor;

  return `<b>${exerciseName.toUpperCase()} ${completedSets}</b>\n\n` +
    'Please enter the weight\n\n' +
    `Last working weight: <b>${convertedWeight}${weightUnit}</b>\n\n` +
    `${hitAllReps ? '✅' : "❌ didn't"} hit all reps last time`;
}

export const getRepetitionsText = (exerciseName: string, completedSets: string, previousReps: number, hitAllReps: boolean) => {
  return `<b>${exerciseName.toUpperCase()} ${completedSets}</b>\n\n` +
    'Please enter the repetitions\n\n' +
    `Expected number of repetitions: <b>${previousReps}</b>\n\n` +
    `${hitAllReps ? '✅' : "❌ didn't"} hit all reps last time`;
}

export const getRPEText = (exerciseName: string, completedSets: string) => {
  return `<b>${exerciseName.toUpperCase()} ${completedSets}</b>\n\n` + 'Please enter the RPE\n\nHow hard was this set?';
}

export const getWorkoutTitleMessage = (workoutCount: number) => {
  return `<b>Workout #${workoutCount} of Current Mesocycle</b>\n\n<i>Select an exercise:</i>`;
}
