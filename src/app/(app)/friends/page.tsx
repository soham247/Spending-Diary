import { FriendsScreen } from "@/components/friends/FriendsScreen";
import { Suspense } from "react";
export default function FriendsPage() {
  return (
    <Suspense>
      <FriendsScreen />
    </Suspense>
  );
}
