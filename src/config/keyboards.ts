import { InlineKeyboard } from 'grammy';
import { InlineKeyboardMarkup } from 'grammy/types';
import { kgs } from '@/helpers/unitConverters.js';
import { getCompletedSetsString } from '@/helpers/workoutStats.js';

export const backButton = '◀ Back';
export const prevButton = '<< Prev';
export const nextButton = 'Next >>';
export const checkedSquare = '■';
export const uncheckedSquare = '□';
export const checkedCircle = '●';
export const uncheckedCircle = '○';

export type InlineKeyboardOptions = { parse_mode?: "HTML" | "MarkdownV2", reply_markup?: InlineKeyboardMarkup };

const isEveryThirdButton = (index: number) => (index + 1) % 3 === 0;

export const rpeValues = [9, 9.5, 10, 7.5, 8, 8.5, 6, 6.5, 7];

export const getRpeOptionColor = (value: number): string => {
  if (value >= 9) {
    return '🔴';
  }

  if (value >= 7.5) {
    return '🟠';
  }

  return '🟡';
};

export const getRpeOptions = (prefix = ''): InlineKeyboard => {
  const keyboard = new InlineKeyboard();

  for (const [index, value] of rpeValues.entries()) {
    const color = getRpeOptionColor(value);
    keyboard.text(`${color} ${value}`, `${prefix}:${value}`);

    if (isEveryThirdButton(index)) {
      keyboard.row();
    }
  }

  keyboard.text(backButton, `${prefix}:goBack`);

  return keyboard;
};

export function generateExerciseOptions(
  exerciseNames: string[],
  setCountMap: Record<string, number>,
  prefix = ''
) {
  const todaysExercises = new InlineKeyboard();
  todaysExercises
    .text(backButton, `${prefix}:goBack`)
    .row();

  for (const exerciseName of exerciseNames) {
    const numberOfCompletedSets = setCountMap[exerciseName];
    const buttonLabel = `${exerciseName} ${getCompletedSetsString(
      numberOfCompletedSets
    )}`;

    todaysExercises.text(buttonLabel, `${prefix}:${exerciseName}`).row();
  }

  return todaysExercises;
}

export const getWeightOptions = (
  prevWeight: number,
  prefix = '',
  unit: 'kg' | 'lb',
): InlineKeyboard => {
  const weightIncrementsKg = [1.25, 2.5, 5, -1.25, -2.5, -5];
  const weightIncrementsLb = [2.5, 5, 10, -2.5, -5, -10];
  const weightIncrements = unit === 'kg' ? weightIncrementsKg : weightIncrementsLb;

  const keyboard = new InlineKeyboard();

  for (const [index, value] of weightIncrements.entries()) {
    const incrementValue = unit === 'kg' ? value : kgs(value);
    const newWeightInKg = prevWeight + incrementValue;

    const buttonLabel = value > 0 ? `+${value}` : `${value}`;
    const buttonData = `${prefix}:${newWeightInKg}`;

    keyboard.text(buttonLabel, buttonData);

    if (isEveryThirdButton(index)) {
      keyboard.row();
    }
  }

  keyboard.text(backButton, `${prefix}:goBack`);

  const toggleUnitButtonLabel = `${unit === 'kg' ? `${checkedCircle} kg / ${uncheckedCircle} lb` : `${uncheckedCircle} kg / ${checkedCircle} lb`}`;
  const toggleUnitButtonData = `${prefix}:toggle_unit~${unit}`;
  keyboard.text(toggleUnitButtonLabel, toggleUnitButtonData);

  const defaultButtonLabel = '🆗 Use same';
  const defaultButtonData = `${prefix}:${prevWeight}`;
  keyboard.text(defaultButtonLabel, defaultButtonData);

  return keyboard;
};

export const getRepOptions = (
  prevReps: number,
  prefix = ''
): InlineKeyboard => {
  const increments = [1, 2, 3, -1, -2, -3];
  const keyboard = new InlineKeyboard();

  for (const [index, value] of increments.entries()) {
    const newReps = prevReps + value;

    const buttonLabel = value > 0 ? `+${value}` : `${value}`;
    const buttonData = `${prefix}:${newReps}`;
    keyboard.text(buttonLabel, buttonData);

    if (isEveryThirdButton(index)) {
      keyboard.row();
    }
  }

  keyboard.text(backButton, `${prefix}:goBack`);

  const defaultButtonLabel = '🆗 Use same';
  const defaultButtonData = `${prefix}:${prevReps}`;
  keyboard.text(defaultButtonLabel, defaultButtonData);

  return keyboard;
};

export const getMainMenu = (): InlineKeyboard =>
  new InlineKeyboard()
    .text('Next workout', '/next_workout')
    .row()
    .text('Record set', '/record_set')
    .row()
    .text('Add exercise', '/add_exercise')
    .row()
    .text('Edit exercises', '/edit_exercises')
    .row()
    .text('Settings', '/settings');

export const getEditOptions = (): InlineKeyboard =>
  new InlineKeyboard().text('✏️ Edit', 'editOption').text('✅ Ok', 'okOption');

export const getYesNoOptions = (prefix = ''): InlineKeyboard =>
  new InlineKeyboard().text('No', `${prefix}:no`).text('Yes', `${prefix}:yes`);

export const getNumberRange = (number: number): InlineKeyboard => {
  const keyboard = new InlineKeyboard();
  for (let i = 0; i < number; i++) {
    keyboard.text(`${i + 1}`);
  }

  return keyboard;
};

export const getMenuFromStringArray = (
  labels: string[],
  prefix = '',
  options?: { addBackButton?: boolean; nColumns?: number }
) => {
  const { addBackButton = false, nColumns = 1 } = options || {};

  const keyboard = new InlineKeyboard();
  if (addBackButton) {
    keyboard.text(backButton, `${prefix}:goBack`).row();
  }

  for (const [index, label] of labels.entries()) {
    if (index % nColumns === 0) {
      keyboard.row();
    }

    keyboard.text(label, `${prefix}:${label}`);
  }

  return keyboard;
};
