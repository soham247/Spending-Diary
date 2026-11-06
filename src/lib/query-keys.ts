export const queryKeys = {
  money: { roots: () => [["balances"], ["group"], ["friend"], ["friends"], ["activity"], ["insights"], ["settlement"]] as const },
  invites: { preview: (token: string) => ["invite", token] as const },
  activityRoot: () => ["activity"] as const,
  insightsRoot: () => ["insights"] as const,
  activity: (filters: { groupId?: string; expenseId?: string } = {}) => ["activity", filters] as const,
  settlements: { list: (filters: { groupId?: string; friendId?: string; deleted?: string }) => ["settlement", filters] as const },
  sessions: () => ["sessions"] as const,
  paymentContext: () => ["settlement", "context"] as const,
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
    all: () => ["expense"] as const,
    list: (filters: { kind?: string; deleted?: string; groupId?: string; friendId?: string; scope?: string; from?: string; to?: string }) => ["expense", "list", filters] as const,
    detail: (expenseId: string) => ["expense", expenseId] as const,
  },
  friends: {
    all: () => ["friends"] as const,
    detail: (userId: string) => ["friend", userId] as const,
  },
  insights: {
    month: (month: string, kind?: string) => ["insights", month, kind] as const,
  },
} as const;
