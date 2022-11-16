import {InlineKeyboard} from 'grammy';

export const rpeOptions = new InlineKeyboard();
rpeOptions.text('🔴 9', '9');
rpeOptions.text('🔴 9.5', '9.5');
rpeOptions.text('🔴 10', '10').row();
rpeOptions.text('🟠 7.5', '7.5');
rpeOptions.text('🟠 8', '8');
rpeOptions.text('🟠 8.5', '8.5').row();
rpeOptions.text('🟡 6', '6');
rpeOptions.text('🟡 6.5', '6.5');
rpeOptions.text('🟡 7', '7');

export const weightOptions = new InlineKeyboard();
weightOptions.text('+1');
weightOptions.text('+2.5');
weightOptions.text('+5').row();
weightOptions.text('-1');
weightOptions.text('-2.5');
weightOptions.text('-5').row();
weightOptions.text('Custom', 'customWeightValue');
weightOptions.text('Use same', '0');

export const repOptions = new InlineKeyboard();
repOptions.text('+1');
repOptions.text('+2');
repOptions.text('+3').row();
repOptions.text('-1');
repOptions.text('-2');
repOptions.text('-3').row();
repOptions.text('Custom', 'customRepValue');
repOptions.text('Use same', '0');
