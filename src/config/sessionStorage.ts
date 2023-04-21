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

export function initial(): SessionStorage {
  return {
    userSettings: {
      isMetric: true,
      splitLength: 4
    },
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
