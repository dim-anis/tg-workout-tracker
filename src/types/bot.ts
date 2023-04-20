import type { Context as GrammyContext, SessionFlavor } from 'grammy';
import {
  type Conversation,
  type ConversationFlavor
} from '@grammyjs/conversations';
import { type UserType } from 'models/user.js';

export type SessionStorage = {
  userSettings: {
    isMetric: boolean;
    splitLength: number;
  };
  state: {
    cmdName: string;
    data: string;
    lastMessageId: number;
  };
  exercises: {
    fromDB: Set<string>;
    toAdd: Set<string>;
  };
};

// Export type MemorySessionStorage = {
// 	exercises: {
// 		fromDB: Set<string>;
// 		toAdd: Set<string>;
// 	};
// };

// export type MongoSessionStorage = {
// 	state: {
// 		cmdName: string;
// 		data: string;
// 		lastMessageId: number;
// 	};
// };

// export type SessionData = {
// 	memorySession: MemorySessionStorage;
// 	storageSession: MongoSessionStorage;
// };

export type MyContext = GrammyContext &
  SessionFlavor<SessionStorage> &
  ConversationFlavor & { dbchat: UserType };

export type MyConversation = Conversation<MyContext>;
