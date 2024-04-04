import {
  ChatTypeContext,
  Context as GrammyContext,
  SessionFlavor,
} from "grammy";
import {
  type Conversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import { type UserType } from "@/models/user.js";
import { type SessionStorage } from "@/config/sessionStorage.js";

export type MyContext = ChatTypeContext<GrammyContext, "private"> &
  SessionFlavor<SessionStorage> &
  ConversationFlavor & { dbchat: UserType };

export type MyConversation = Conversation<MyContext>;
