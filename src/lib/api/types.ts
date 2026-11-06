export type JsonValue<T> = T extends Date ? string : T extends (infer U)[] ? JsonValue<U>[] : T extends object ? { [K in keyof T]: JsonValue<T[K]> } : T;
