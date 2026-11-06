"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useGroups, useCreateGroup } from "@/hooks/use-groups";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validation/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
export function GroupsScreen() {
  const groups = useGroups(); const create = useCreateGroup();
  const [archived, setArchived] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateGroupInput, unknown, ReturnType<typeof createGroupSchema.parse>>({ resolver: zodResolver(createGroupSchema), defaultValues: { name: "", type: "OTHER", currency: "INR", simplifyDebts: true } });
  async function save(input: CreateGroupInput) { try { await create.mutateAsync({ input, key }); reset(); setKey(crypto.randomUUID()); toast.success("Group created"); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } }
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Groups</h1>
    <form onSubmit={handleSubmit(save)} className="space-y-3 rounded-xl border border-border bg-card p-4"><Label htmlFor="group-name">Create a group</Label><Input id="group-name" placeholder="Goa trip, our flat…" {...register("name")} /><p className="text-sm text-destructive">{errors.name?.message}</p>
      <Select defaultValue="OTHER" onValueChange={value => setValue("type", createGroupSchema.shape.type.parse(value))}><SelectTrigger className="h-11" aria-label="Group type"><SelectValue /></SelectTrigger><SelectContent>{(["TRIP","HOME","COUPLE","OTHER"] as const).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">Currency: INR</p><Button type="submit" size="lg" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create group"}</Button>
    </form>
    <Button variant="outline" className="h-11" onClick={() => setArchived(value => !value)}>{archived ? "Active groups" : "Archived groups"}</Button>
    {groups.isPending ? <LoadingState /> : groups.isError ? <ErrorState retry={() => void groups.refetch()} /> : groups.data.filter(g => !!g.archivedAt === archived).length === 0 ? <EmptyState>{archived ? "No archived groups." : "Create a group for a trip, your flat, or anything you share."}</EmptyState> : <div className="divide-y divide-border rounded-xl border border-border bg-card">{groups.data.filter(g => !!g.archivedAt === archived).map(group => <Link className="block p-4 hover:bg-muted focus-visible:outline-ring" key={group.id} href={"/groups/" + group.id}>{group.name}<p className="text-sm text-muted-foreground">{group.type}</p></Link>)}</div>}
  </div>;
}
