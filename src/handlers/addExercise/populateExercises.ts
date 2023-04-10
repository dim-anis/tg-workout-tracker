import {Composer} from 'grammy';
import {Menu, MenuRange} from '@grammyjs/menu';
import {type MyContext} from '../../types/bot';
import {createConversation} from '@grammyjs/conversations';
import handleAddExercise from './addExerciseConversation';
import {defaultExercises} from '../../config/exercises';
import {createUserExercise} from '../../models/user';

const composer = new Composer<MyContext>();

const addExerciseMenu = new Menu<MyContext>('addExerciseMenu')
	.submenu(
		{text: 'Select from preloaded', payload: 'populateExercises'},
		'populate-exercises-main',
		async ctx => {
			ctx.session.exercises.fromDB = new Set(ctx.dbchat.exercises.map(exercise => exercise.name));
			await ctx.editMessageText(populateMainText, {parse_mode: 'HTML'});
		},
	)
	.row()
	.text(
		{text: 'Add exercise', payload: 'addExercise'},
		async ctx => {
			await ctx.conversation.enter('handleAddExercise');
		},
	);

const populateMainText = '<b>Populate exercises</b>\n\nSelect the exercise that you would like to add to your list, then click "SUBMIT"';
const populateExercisesMain = new Menu<MyContext>('populate-exercises-main');
populateExercisesMain.dynamic(async () => {
	const categories = new Set(defaultExercises.map(ex => ex.category));

	const range = new MenuRange<MyContext>()
		.back('<< Back')
		.row();

	for (const cat of categories) {
		range
			.submenu(
				{
					text: cat,
					payload: cat,
				},
				'populate-exercises-submenu',
				async ctx => {
					await ctx.editMessageText(populateExercisesMainSubText(cat), {
						parse_mode: 'HTML',
					});
				},
			)
			.row();
	}

	range
		.text(
			{text: '✅ Submit'},
			async ctx => {
				const {toAdd} = ctx.session.exercises;
				const exercisesToAdd = defaultExercises.filter(exObj => [...toAdd].includes(exObj.name));
				const r = await createUserExercise(ctx.dbchat.user_id, exercisesToAdd);
				ctx.dbchat.exercises.concat(exercisesToAdd);

				await ctx.editMessageText('👌 Exercises updated!', {reply_markup: undefined});
			},
		);

	return range;
});

const populateExercisesMainSubText = (category: string) => `<b>${category}</b>\n\nSelect exercises that you'd like to add:`;
const populateExercisesSub = new Menu<MyContext>('populate-exercises-submenu');

populateExercisesSub.dynamic(async ctx => {
	const category = ctx.match;
	if (typeof category !== 'string') {
		throw new Error('No category chosen!');
	}

	return createExerciseMenu(category);
});

async function createExerciseMenu(category: string) {
	const selectedCategoryExercises = defaultExercises.filter(ex => ex.category === category);
	const range = new MenuRange<MyContext>();

	range
		.back(
			{text: '⬅️ Back', payload: category},
			async ctx => {
				await ctx.editMessageText(populateMainText, {parse_mode: 'HTML'});
			},
		)
		.row();

	for (const exercise of selectedCategoryExercises) {
		range
			.text(
				{
					text: ctx =>
						ctx.session.exercises.fromDB.has(exercise.name) || ctx.session.exercises.toAdd.has(exercise.name) ? `${exercise.name} ■` : `${exercise.name} □`,
					payload: category,
				},
				async ctx => {
					const {fromDB, toAdd} = ctx.session.exercises;

					if (toAdd.has(exercise.name) && !fromDB.has(exercise.name)) {
						toAdd.delete(exercise.name);
						ctx.menu.update();
					} else if (!toAdd.has(exercise.name) && !fromDB.has(exercise.name)) {
						toAdd.add(exercise.name);
						ctx.menu.update();
					}
				},
			)
			.row();
	}

	return range;
}

composer.use(createConversation(handleAddExercise));

populateExercisesMain.register(populateExercisesSub);
addExerciseMenu.register(populateExercisesMain);

composer.use(addExerciseMenu);

composer
	.callbackQuery('/add_exercise', async ctx => {
		await ctx.answerCallbackQuery();
		const {message_id} = await ctx.reply('📋 <b>Add exercise</b>', {reply_markup: addExerciseMenu, parse_mode: 'HTML'});
		ctx.session.state.lastMessageId = message_id;
	});
composer
	.command('add_exercise', async ctx => {
		const {message_id} = await ctx.reply('📋 <b>Add exercise</b>', {reply_markup: addExerciseMenu, parse_mode: 'HTML'});
		ctx.session.state.lastMessageId = message_id;
	});

export default composer;
