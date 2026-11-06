import ReactQueryProvider from "@/components/ReactQueryProvider";
import { InviteLanding } from "@/components/invite/InviteLanding";
import { getOptionalSession } from "@/lib/auth/guards";
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, session] = await Promise.all([params, getOptionalSession()]);
  return <ReactQueryProvider><main className="mx-auto max-w-lg px-4 py-16"><InviteLanding token={token} signedIn={!!session} /></main></ReactQueryProvider>;
}
