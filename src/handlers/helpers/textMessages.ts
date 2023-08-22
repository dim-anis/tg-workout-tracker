import { pounds } from "./unitConverters.js";

export const successMessages = {
  onRecordSetSuccess:
    '✅ <b>Successfully recorded.</b> Would you like to record one more set?'
};

export const errorMessages = {
  input_is_not_yes_or_no: '\n\n❌ <b>Input must be "Yes" or "No".</b>',
  input_too_long:
    '\n\n❌ <b>Input is too long. Max length is 50 characters.</b>',
  input_contains_special_chars:
    '\n\n❌ Input contains special characters. Only alphanumeric characters are allowed.',
  input_is_not_a_number: '\n\n❌ <b>Input must be a number.</b>',
  input_is_out_of_range_weight:
    '\n\n❌ <b>Input is out of range. Must be between 1 and 999.</b>',
  input_is_out_of_range_rpe:
    '\n\n❌ <b>Input is out of range. Must be between 6.0 and 10.0.</b>',
  input_is_out_of_range_repetitions:
    '\n\n❌ <b>Input is out of range. Must be between 1 and 99.</b>',
  input_is_not_a_multiple_of_half:
    '\n\n❌ <b>Input must be a multiple of 0.5 (5.5, 6, 6.5, etc.)./b>',
  input_is_not_an_integer: '\n\n❌ <b>Input must be an integer.</b>\n',
  input_is_not_defined: "\n\n❌ <b>Input isn't one of the given options.</b>\n"
};

export const getRecordWeightMessage = (exerciseName: string, completedSets: string, previousWeight: number, hitAllReps: boolean, unit: 'kg' | 'lb') => {
  const convertedWeight = unit === 'kg' ? previousWeight : pounds(previousWeight); 

  return `<b>${exerciseName.toUpperCase()} ${completedSets}</b>\n\n` +
    'Please enter the weight\n\n' +
    `Last working weight: <b>${convertedWeight}${unit}</b>\n\n` +
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
