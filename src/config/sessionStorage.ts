export type SessionStorage = {
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

export function initial(): SessionStorage {
  return {
    state: {
      cmdName: 'idle',
      data: '',
      lastMessageId: 0
    },
    exercises: {
      fromDB: new Set(),
      toAdd: new Set()
    }
  };
}
