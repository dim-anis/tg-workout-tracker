import {Composer, InlineKeyboard} from 'grammy';
import {Menu, MenuRange} from '@grammyjs/menu';
import {type MyConversation, type MyContext} from '../types/bot';
import {deleteUserExercise, getAllUserExercises, updateUserExercise} from '../models/user';
import {createConversation} from '@grammyjs/conversations';
import {getYesNoOptions} from '../config/keyboards';

const muscleGroups = ['Legs', 'Chest', 'Back', 'Biceps', 'Triceps'];

const composer = new Composer<MyContext>();

const categoriesMenuText = 'Select a category:';
const categoriesMenu = new Menu<MyContext>('categories');
categoriesMenu.dynamic(async ctx => {
	ctx.session.state.cmdName = 'editExercise';

	const exercises = await getAllUserExercises(ctx.dbchat.user_id);
	const categories = new Set(exercises.map(ex => ex.category));
	const range = new MenuRange<MyContext>();
	for (const cat of categories) {
		range
			.submenu(
				{text: cat, payload: cat},
				'exercises',
				async ctx =>
					ctx.editMessageText(exercisesMenuText(cat), {
						parse_mode: 'HTML',
					}),
			)
			.row();
	}

	return range;
});

const exercisesMenuText = (category: string) => `<b>${category}</b>\n\nChoose your Exercise:`;
const exercisesMenu = new Menu<MyContext>('exercises');
exercisesMenu.dynamic(async ctx => {
	const payload = ctx.match;
	if (typeof payload !== 'string') {
		throw new Error('No category chosen!');
	}

	const [category, exercise] = payload.split(',');

	return createExerciseMenu(ctx, category);
});

async function createExerciseMenu(ctx: MyContext, category: string) {
	const exercises = await getAllUserExercises(ctx.dbchat.user_id);
	const selectedCategoryExercises = exercises.filter(ex => ex.category === category);
	const range = new MenuRange<MyContext>();

	range
		.back(
			{text: '⬅️ Back', payload: category},
			async ctx => {
				await ctx.editMessageText(categoriesMenuText);
			},
		)
		.row();

	for (const exercise of selectedCategoryExercises) {
		range
			.submenu(
				{text: exercise.name, payload: `${category},${exercise.name}`},
				'selectExercise',
				async ctx => {
					await ctx.editMessageText(selectExerciseMenuText(category, exercise.name), {
						parse_mode: 'HTML',
					});
				},
			)
			.row();
	}

	return range;
}

const selectExerciseMenuText = (category: string, exercise: string) => `<b>${exercise} [${category}]</b>\n\nWhat would you like to do with this exercise?`;
const selectExerciseMenu = new Menu<MyContext>('selectExercise');
selectExerciseMenu.dynamic(async ctx => {
	const payload = ctx.match;
	if (typeof payload !== 'string') {
		throw new Error('No exercise chosen!');
	}

	const [category, exercise] = payload.split(',');

	return createSelectExerciseMenu(category, exercise);
});

async function createSelectExerciseMenu(category: string, exercise: string) {
	return new MenuRange<MyContext>()
		.back(
			{text: '⬅️ Back', payload: category},
			async ctx => {
				await ctx.editMessageText(exercisesMenuText(category), {
					parse_mode: 'HTML',
				});
			},
		)
		.back(
			{text: '❌ Delete', payload: `${category},${exercise}`},
			async ctx => {
				await deleteUserExercise(ctx.dbchat.user_id, exercise);
				await ctx.editMessageText(exercisesMenuText(category), {
					parse_mode: 'HTML',
				});
			},
		)
		.text(
			{text: '✏️ Edit', payload: exercise},
			async ctx => {
				const exercise = ctx.match;
				console.log(exercise);
				ctx.session.state.data = exercise;

				await ctx.conversation.enter('editExerciseConversation');
			},
		);
}

async function editExerciseConversation(conversation: MyConversation, ctx: MyContext) {
	const currName = ctx.session.state.data;
	await ctx.editMessageText(`<b>Current name:\n\n${currName.toUpperCase()}</b>\n\nType in the new name:`, {
		parse_mode: 'HTML',
		reply_markup: undefined,
	});

	const name = await conversation.form.text();

	await ctx.editMessageText(
		`<b>ADD ${name.toUpperCase()}</b>\n\nIs it a compound exercise?\n\n<i>*Involving two or more joints at once, think heavy exercises like squats, bench press etc.</i>`,
		{
			parse_mode: 'HTML',
			reply_markup: await getYesNoOptions(),
		},
	);

	const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(['yesOption', 'noOption']);

	let is_compound: boolean;
	if (data === 'yesOption') {
		is_compound = true;
	} else {
		is_compound = false;
	}

	const muscleGroupsKbd = new InlineKeyboard();
	muscleGroups.forEach(group => muscleGroupsKbd.text(group).row());

	await ctx.editMessageText(
		`<b>ADD ${name.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`,
		{
			parse_mode: 'HTML',
			reply_markup: muscleGroupsKbd,
		},
	);

	const {callbackQuery: {data: category}} = await conversation.waitForCallbackQuery(muscleGroups);

	const createdExercise = await conversation.external(async () => updateUserExercise(
		ctx.dbchat.user_id,
		currName,
		{name, category, is_compound},
	));

	if (!createdExercise) {
		throw new Error('Failed to create exercise');
	}

	await ctx.editMessageText(
		`You've added <b>${name.toUpperCase()}</b> to your exercise list!`,
		{
			parse_mode: 'HTML',
		},
	);
}

composer.use(createConversation(editExerciseConversation));

exercisesMenu.register(selectExerciseMenu);
categoriesMenu.register(exercisesMenu);

composer.use(categoriesMenu);

composer.command('expEd', async ctx => ctx.reply(categoriesMenuText, {reply_markup: categoriesMenu}));

export default composer;
