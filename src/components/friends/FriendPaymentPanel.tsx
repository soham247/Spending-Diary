"use client";

import { useProfile } from "@/hooks/use-profile";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import {
  SettlePanel,
  type SettlePanelProps,
} from "@/components/settlement/SettlePanel";

export function FriendPaymentPanel({ other }: Pick<SettlePanelProps, "other">) {
  const profile = useProfile();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError || !profile.data)
    return (
      <ErrorState
        message="Couldn't load your payment details. Try again."
        retry={() => void profile.refetch()}
      />
    );
  return <SettlePanel viewerId={profile.data.id} other={other} />;
}
