import type {Context as GrammyContext, SessionFlavor} from 'grammy';
import {
	type Conversation,
	type ConversationFlavor,
} from '@grammyjs/conversations';
import {type UserType} from 'models/user';
import {type Exercise} from '../handlers/populateExercises';
import {type ExerciseType} from 'models/exercise';

export type SessionStorage = {
	userSettings: {
		isMetric: boolean;
		splitLength: number;
	};
	state: {
		cmdName: string;
		data: string;
	};
	preloadedExercises: string[];
};

export type MyContext = GrammyContext & SessionFlavor<SessionStorage> & ConversationFlavor & {dbchat: UserType};

export type MyConversation = Conversation<MyContext>;
