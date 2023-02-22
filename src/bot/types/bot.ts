import type {Context as GrammyContext, SessionFlavor} from 'grammy';
import {
	type Conversation,
	type ConversationFlavor,
} from '@grammyjs/conversations';
import {type UserType} from 'models/user';

export type SessionStorage = {
	userSettings: {
		unit: string;
		splitLength: number;
	};
};

export type MyContext = GrammyContext & SessionFlavor<SessionStorage> & ConversationFlavor & {dbchat: UserType};

export type MyConversation = Conversation<MyContext>;
