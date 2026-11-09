"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useInvitePreview, useClaimInvite } from "@/hooks/use-invites";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { LoadingState } from "@/components/common/LoadingState";
import { Card } from "@/components/ui/card";
export function InviteLanding({
  token,
  signedIn,
}: {
  token: string;
  signedIn: boolean;
}) {
  const preview = useInvitePreview(token);
  const claim = useClaimInvite();
  const router = useRouter();
  async function join() {
    try {
      const result = await claim.mutateAsync(token);
      if (preview.data?.type === "PERSONAL")
        toast.success("Friend request sent. They will need to accept.");
      router.replace(result.destination);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't claim invitation");
    }
  }
  if (preview.isPending) return <LoadingState />;
  if (preview.isError)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          This invite is no longer available.
        </h1>
        <p className="text-muted-foreground">
          It may have expired or been revoked. Ask the person who invited you
          for a new link.
        </p>
      </div>
    );
  const row = preview.data;
  const callback = "/j/" + token;
  return (
    <div className="space-y-6">
      <p className="font-semibold">Spending Diary</p>
      <h1 className="text-2xl font-semibold">
        {row.type === "GROUP_LINK"
          ? row.inviterName + " invited you to " + row.groupName
          : row.type === "DIRECT"
            ? row.inviterName + " added you as " + row.placeholderName
            : "Connect with " + row.inviterName}
      </h1>
      {row.type === "GROUP_LINK" && (
        <p className="text-muted-foreground">{row.memberCount} people</p>
      )}
      {row.type === "PERSONAL" && (
        <p className="text-muted-foreground">
          Send a friend request. You can share direct expenses after they
          accept. Your email stays private.
        </p>
      )}
      {row.balances.map((balance) => (
        <p key={balance.currency}>
          {balance.net < 0
            ? "You owe " + row.inviterName
            : row.inviterName + " owes you"}{" "}
          <Money
            amount={Math.abs(balance.net)}
            currency={balance.currency}
            tone={balance.net < 0 ? "debit" : "credit"}
          />
        </p>
      ))}
      {row.expenses.length > 0 && (
        <Card className="gap-0 py-0 divide-y divide-border">
          {row.expenses.map((expense) => (
            <div key={expense.id} className="flex justify-between gap-3 p-4">
              <span>
                {expense.description}
                <span className="block text-sm text-muted-foreground">
                  Your share
                </span>
              </span>
              <Money amount={expense.amount} currency={expense.currency} />
            </div>
          ))}
        </Card>
      )}
      {signedIn ? (
        <Button disabled={claim.isPending} onClick={() => void join()}>
          {claim.isPending
            ? "Joining…"
            : row.type === "DIRECT"
              ? "Claim your history"
              : row.type === "GROUP_LINK"
                ? "Join group"
                : "Send friend request"}
        </Button>
      ) : (
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href={"/login?callbackUrl=" + encodeURIComponent(callback)}>
              Sign in to continue
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link
              href={"/register?callbackUrl=" + encodeURIComponent(callback)}
            >
              Create an account
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
