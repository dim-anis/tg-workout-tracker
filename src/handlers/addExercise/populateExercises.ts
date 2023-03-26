import {Composer} from 'grammy';
import {Menu, MenuRange} from '@grammyjs/menu';
import {type MyContext} from '../../types/bot';
import {createConversation} from '@grammyjs/conversations';
import handleAddExercise from './addExerciseConversation';
import exerciseData from '../../config/exercises.json' assert {type: 'json'};
import {createUserExercise} from '../../models/user';
import {type ExerciseType} from '../../models/exercise';

const exercises: ExerciseType[] = exerciseData as ExerciseType[];

const mainMenu = new Menu<MyContext>('main')
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

const populateMainText = '<b>POPULATE EXERCISES</b>\n\nSelect the exercise that you would like to add to your list, then click "SUBMIT"';
const populateExercisesMain = new Menu<MyContext>('populate-exercises-main');
populateExercisesMain.dynamic(async ctx => {
	const categories = new Set(exercises.map(ex => ex.category));

	const range = new MenuRange<MyContext>()
		.back('⬅️ Back')
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
				const exercisesToAdd = exercises.filter(exObj => [...toAdd].includes(exObj.name));
				console.log(`Preloading ${toAdd.size} exercises...`);
				const r = await createUserExercise(ctx.dbchat.user_id, exercisesToAdd);

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
	const selectedCategoryExercises = exercises.filter(ex => ex.category === category);
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
						ctx.session.exercises.fromDB.has(exercise.name) ? `${exercise.name} ■` : `${exercise.name} □`,
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

const composer = new Composer<MyContext>();

composer.use(createConversation(handleAddExercise));

populateExercisesMain.register(populateExercisesSub);
mainMenu.register(populateExercisesMain);
composer.use(mainMenu);

composer.command('add_exercise', async ctx => {
	await ctx.reply('📋 <b>ADD EXERCISE</b>', {reply_markup: mainMenu, parse_mode: 'HTML'});
});

export default composer;
