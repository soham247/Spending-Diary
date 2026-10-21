export const queryKeys = {
  me: () => ["me"] as const,
  balances: {
    overall: () => ["balances"] as const,
    group: (groupId: string) => ["group", groupId, "balances"] as const,
    friend: (userId: string) => ["friend", userId, "balances"] as const,
  },
  groups: {
    all: () => ["groups"] as const,
    detail: (groupId: string) => ["group", groupId] as const,
    expenses: (groupId: string) => ["group", groupId, "expenses"] as const,
    activity: (groupId: string) => ["group", groupId, "activity"] as const,
  },
  expenses: {
    detail: (expenseId: string) => ["expense", expenseId] as const,
  },
  friends: {
    all: () => ["friends"] as const,
    detail: (userId: string) => ["friend", userId] as const,
  },
  insights: {
    month: (month: string) => ["insights", month] as const,
  },
} as const;
