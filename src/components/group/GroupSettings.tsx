"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUpdateGroup, useChangeMember } from "@/hooks/use-groups";
import type { GroupDetail } from "@/lib/api/groups";
import type { MemberActionInput } from "@/lib/validation/group";
export function GroupSettings({ group }: { group: GroupDetail }) {
  const [name, setName] = useState(group.name);
  const update = useUpdateGroup(); const change = useChangeMember();
  async function save(input: Parameters<typeof update.mutateAsync>[0]["input"]) { try { await update.mutateAsync({ id: group.id, input }); toast.success("Group updated"); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } }
  async function member(input: MemberActionInput) { try { await change.mutateAsync({ id: group.id, input }); toast.success("Membership updated"); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't update member"); } }
  return <div className="space-y-4 rounded-xl border border-border bg-card p-4"><h2 className="text-lg font-semibold">Group settings</h2><Label htmlFor="rename">Group name</Label><Input id="rename" value={name} onChange={event => setName(event.target.value)} /><Button className="h-11" disabled={update.isPending || !name.trim()} onClick={() => void save({ name })}>Save name</Button><div className="flex items-center gap-3"><Switch id="simplify" checked={group.simplifyDebts} onCheckedChange={simplifyDebts => void save({ simplifyDebts })} /><Label htmlFor="simplify">Simplify debts</Label></div><Button variant="outline" className="h-11" onClick={() => void save({ archived: !group.archivedAt })}>{group.archivedAt ? "Unarchive group" : "Archive group"}</Button>
    {!group.archivedAt && group.members.filter(p => p.status === "ACTIVE").map(person => <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p>{person.name} ({person.role.toLowerCase()})</p><div className="flex gap-2">{person.role !== "ADMIN" && <Button variant="outline" className="h-11" disabled={change.isPending} onClick={() => void member({ action: "PROMOTE", userId: person.id })}>Make admin</Button>}<AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="h-11">Remove</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {person.name}?</AlertDialogTitle><AlertDialogDescription>Their history and any outstanding balances remain. They will no longer be able to add expenses in this group.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void member({ action: "REMOVE", userId: person.id, confirmOutstandingBalance: true })}>Remove {person.name}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>)}
  </div>;
}
