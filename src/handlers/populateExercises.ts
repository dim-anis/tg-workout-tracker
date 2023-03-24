import {Composer} from 'grammy';
import {Menu, MenuRange} from '@grammyjs/menu';
import {type MyContext} from '../types/bot';
import {createConversation} from '@grammyjs/conversations';
import handleAddExercise from './addExercise';
// Import {getAllUserExercises} from 'models/user';
import exerciseData from '../config/exercises.json' assert {type: 'json'};

export type Exercise = {
	name: string;
	category: string;
	is_compound: boolean;
};

const exercises: Exercise[] = exerciseData as Exercise[];

const mainMenu = new Menu<MyContext>('main')
	.submenu(
		{text: 'Select from preloaded', payload: 'populateExercises'},
		'populate-exercises-main',
		async ctx => {
			const userExercises = ctx.dbchat.exercises.map(exercise => exercise.name);
			ctx.session.preloadedExercises = userExercises;
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
				const userExercises = ctx.dbchat.exercises.map(exercise => exercise.name);
				const notInUserExercises = ctx.session.preloadedExercises.filter(exercise => !userExercises.includes(exercise));
				console.log(`Number of new exercises: ${notInUserExercises.length}`);
				const newExercises = exercises.filter(exercise => notInUserExercises.includes(exercise.name));
				console.log(`Preloading ${newExercises.length} exercises...`);
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
						ctx.session.preloadedExercises.includes(exercise.name) ? `${exercise.name} ■` : `${exercise.name} □`,
					payload: category,
				},
				async ctx => {
					/*
					   Do nothing if exercise is in userDB
						 update the text if not in userDB and added to newList
					 	 update the text if not in userDB and removed from the newList
					*/
					if (ctx.session.preloadedExercises.includes(exercise.name)) {
						ctx.session.preloadedExercises = ctx.session.preloadedExercises.filter(ex => ex !== exercise.name);
						ctx.menu.update();
					} else {
						ctx.session.preloadedExercises.push(exercise.name);
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

composer.command('addEx', async ctx => {
	await ctx.reply('📋 <b>ADD EXERCISE</b>', {reply_markup: mainMenu, parse_mode: 'HTML'});
});

export default composer;
