import { FriendScreen } from "@/components/friends/FriendScreen";
import { safeRedirect } from "@/lib/utils/url";
export default async function FriendPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { userId } = await params;
  const { returnTo } = await searchParams;
  const destination = safeRedirect(returnTo, "/friends");
  return (
    <FriendScreen
      id={userId}
      returnTo={
        destination.split("?")[0] === "/friends" ? destination : "/friends"
      }
    />
  );
}
