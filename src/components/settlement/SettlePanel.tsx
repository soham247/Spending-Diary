"use client";
import { usePaymentContext } from "@/hooks/use-settlements";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { PaymentForm } from "./PaymentForm";

export interface SettlePanelProps {
  viewerId: string;
  other?: { id: string; name: string; upiId: string | null };
  net?: number;
  scopeId?: string;
  onRecorded?: () => void;
}
export function SettlePanel(props: SettlePanelProps) {
  const context = usePaymentContext();
  if (context.isPending) return <LoadingState />;
  if (context.isError) return <ErrorState retry={() => void context.refetch()} />;
  return <PaymentForm {...props} scopes={context.data} />;
}
