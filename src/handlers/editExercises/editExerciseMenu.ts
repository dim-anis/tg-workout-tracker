import {Composer} from 'grammy';
import {Menu, MenuRange} from '@grammyjs/menu';
import {type MyContext} from '../../types/bot';
import {deleteUserExercise, getAllUserExercises} from '../../models/user';
import {createConversation} from '@grammyjs/conversations';
import editExerciseConversation from './editExerciseConversation';

const composer = new Composer<MyContext>();

const categoriesMenuText = '<b>EDIT EXERCISES\n\nSelect a category:</b>';
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

const exercisesMenuText = (category: string) => `<b>${category}</b>\n\nSelect an exercise`;
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
				await ctx.editMessageText(categoriesMenuText, {parse_mode: 'HTML'});
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
		.submenu(
			{text: '❌ Delete', payload: `${category},${exercise}`},
			'deleteMenu',
			async ctx => {
				await ctx.editMessageText(deleteMenuText(category, exercise), {
					parse_mode: 'HTML',
				});
			},
		)
		.text(
			{text: '✏️ Edit', payload: exercise},
			async ctx => {
				const exercise = ctx.match;
				ctx.session.state.data = exercise;

				await ctx.conversation.enter('editExerciseConversation');
			},
		);
}

const deleteMenuText = (category: string, exercise: string) => `<b>${exercise} [${category}]</b>\n\nAre you sure you want to delete this exercise?`;
const deleteMenu = new Menu<MyContext>('deleteMenu');
deleteMenu.dynamic(async ctx => {
	const payload = ctx.match;

	if (typeof payload !== 'string') {
		throw new Error('No exercise chosen!');
	}

	const [category, exercise] = payload.split(',');

	return new MenuRange<MyContext>()
		.back(
			{text: 'No', payload},
			async ctx => {
				console.log({category, exercise});
				await ctx.editMessageText(selectExerciseMenuText(category, exercise), {
					parse_mode: 'HTML',
				});
			},
		)
		.text(
			{text: 'Yes', payload},
			async ctx => {
				const [category, exercise] = ctx.match.split(',');
				console.log({category, exercise});
				await deleteUserExercise(ctx.dbchat.user_id, exercise);
				await ctx.editMessageText(selectExerciseMenuText(category, exercise), {
					parse_mode: 'HTML',
				});
				ctx.menu.nav('categories');
				await ctx.editMessageText(categoriesMenuText, {parse_mode: 'HTML'});
			},
		);
});

composer.use(createConversation(editExerciseConversation));

selectExerciseMenu.register(deleteMenu);
exercisesMenu.register(selectExerciseMenu);
categoriesMenu.register(exercisesMenu);

composer.use(categoriesMenu);

composer.command('editExercises', async ctx => ctx.reply(categoriesMenuText, {reply_markup: categoriesMenu, parse_mode: 'HTML'}));

export default composer;
