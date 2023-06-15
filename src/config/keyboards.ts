import { InlineKeyboard } from 'grammy';
import { InlineKeyboardMarkup } from 'grammy/types';

export const backButton = '◀ Back';
export const checkedSquare = '■';
export const uncheckedSquare = '□';
export const checkedCircle = '⦿'; // ● ○ 
export const uncheckedCircle = '⦾'; // ○ ●

export type InlineKeyboardOptions = { parse_mode?: "HTML" | "MarkdownV2", reply_markup?: InlineKeyboardMarkup };

const isEveryThirdButton = (index: number) => (index + 1) % 3 === 0;

export const rpeValues = [9, 9.5, 10, 7.5, 8, 8.5, 6, 6.5, 7];

const getRpeOptionColor = (value: number): string => {
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

  return keyboard;
};

export const getWeightOptions = (
  prevWeight: number,
  prefix = '',
  isMetric = true,
): InlineKeyboard => {
  const increments = [1.25, 2.5, 5, -1.25, -2.5, -5];
  const keyboard = new InlineKeyboard();

  // three most common smallest plates in kgs: 1.25, 2.5, 5 
  //                                   in lbs: 2.5,  5,   10
  for (const [index, inc] of increments.entries()) {
    const value = isMetric ? inc : inc * 2;
    const newWeight = prevWeight + value;

    const buttonLabel = value > 0 ? `+${value}` : `${value}`;
    const buttonData = `${prefix}:${newWeight}`;
    keyboard.text(buttonLabel, buttonData);

    if (isEveryThirdButton(index)) {
      keyboard.row();
    }
  }

  const toggleUnitButtonLabel = `${isMetric ? `${checkedCircle} kg / ${uncheckedCircle} lb` :  `${uncheckedCircle} kg / ${checkedCircle} lb`}`;
  const toggleUnitButtonData = `${prefix}:toggle_unit~${isMetric ? 'kg' : 'lb'}`;
  keyboard.text(toggleUnitButtonLabel, toggleUnitButtonData);

  const defaultButtonLabel = '✓ Use same';
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
    keyboard.text(backButton, `${prefix}:${backButton}`).row();
  }

  for (const [index, label] of labels.entries()) {
    if (index % nColumns === 0) {
      keyboard.row();
    }

    keyboard.text(label, `${prefix}:${label}`);
  }

  return keyboard;
};
