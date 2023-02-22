const commands = [
	{
		command: '/start',
		description: 'show all commands',
	},
	{
		command: '/next_workout',
		description: 'start next workout in the split',
	},
	{
		command: '/record_set',
		description: 'record a single set',
	},
	{
		command: '/edit_exercises',
		description: 'remove or add new exercises',
	},
	{
		command: '/delete_last_set',
		description: 'delete last set'},
	{
		command: '/show_last_workout',
		description: 'show Nth last workout (defaults to last workout)',
	},
	{
		command: '/settings',
		description: 'nuff said',
	},
];

export default commands;
