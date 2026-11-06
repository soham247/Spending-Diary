import { computeLedgerEdges, type LedgerEdge } from "./splits";
export function simplifyDebts(nets: { userId: string; net: number }[]): LedgerEdge[] {
  if (nets.some(row => !Number.isSafeInteger(row.net)) || nets.reduce((sum, row) => sum + row.net, 0) !== 0) throw new Error("Member nets must balance exactly");
  return computeLedgerEdges(nets.map(row => ({ userId: row.userId, paid: Math.max(row.net, 0), owed: Math.max(-row.net, 0) })));
}
