import { FriendScreen } from "@/components/friends/FriendScreen";
export default async function FriendPage({ params }: { params: Promise<{ userId: string }> }) { const { userId } = await params; return <FriendScreen id={userId} />; }
