import { SettlementList } from "@/components/settlement/SettlementList";
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ groupId?: string; friendId?: string }> }) { const filters=await searchParams;return <SettlementList groupId={filters.groupId} friendId={filters.friendId} />; }
