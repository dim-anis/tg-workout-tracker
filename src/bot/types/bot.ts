import type {Context as GrammyContext, SessionFlavor} from 'grammy';
import {
	type Conversation,
	type ConversationFlavor,
} from '@grammyjs/conversations';
import {type UserType} from 'models/user';
import {type WorkoutType} from 'models/workout';
import {type ExerciseType} from 'models/exercise';

export type SessionStorage = {
	userSettings: {
		isMetric: boolean;
		splitLength: number;
	};
	sets: WorkoutType['sets'];
	exercises: ExerciseType[];
};

export type MyContext = GrammyContext & SessionFlavor<SessionStorage> & ConversationFlavor & {dbchat: UserType};

export type MyConversation = Conversation<MyContext>;
