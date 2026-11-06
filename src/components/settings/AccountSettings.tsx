"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAnonymizeAccount } from "@/hooks/use-sessions";
import { signIn } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
export function AccountSettings() {
  const [password, setPassword] = useState(""); const remove = useAnonymizeAccount(); const router = useRouter();
  async function anonymize() { try { await remove.mutateAsync(password || undefined); setPassword(""); router.replace("/login"); router.refresh(); } catch (e) { setPassword(""); toast.error(e instanceof Error ? e.message : "Couldn't delete account"); } }
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Account</h2><p className="text-sm text-muted-foreground">Account deletion replaces your identity with “Former member”. Shared financial history and balances remain.</p><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="lg">Delete account</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete your account?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Your credentials, sessions and personal contact details will be removed. Shared history remains as Former member.</AlertDialogDescription></AlertDialogHeader><Label htmlFor="delete-password">Current password (for password accounts)</Label><Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /><Button variant="outline" className="h-11" onClick={() => void signIn.social({ provider: "google", callbackURL: "/settings" }).catch(() => toast.error("Couldn't start Google sign-in"))}>Sign in with Google again</Button><AlertDialogFooter><AlertDialogCancel onClick={() => setPassword("")}>Cancel</AlertDialogCancel><AlertDialogAction disabled={remove.isPending} onClick={() => void anonymize()}>Delete account</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></section>;
}
