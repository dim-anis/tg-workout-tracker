const commands = [
	{
		command: '/start',
		description: 'start next workout in the split',
	},
	{
		command: '/record_set',
		description: 'record a single set',
	},
	{command: '/delete_last_set', description: 'delete last set'},
	{
		command: '/show_last_workout',
		description: 'show nth last workout (defaults to last workout)',
	},
	{
		command: '/set_routine',
		description: 'set a routine (currently disabled)',
	},
];

export default commands;
