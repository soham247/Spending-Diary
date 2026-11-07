"use client";
import { useDrawerFormState } from "@/components/common/FormDrawer";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreatePlaceholder } from "@/hooks/use-friends";
import {
  placeholderSchema,
  type PlaceholderInput,
} from "@/lib/validation/invite";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function AddPersonForm({ groupId }: { groupId?: string }) {
  const create = useCreatePlaceholder();
  const [id, setId] = useState<string | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PlaceholderInput>({
    resolver: zodResolver(placeholderSchema),
    defaultValues: { name: "", groupId },
  });
  useDrawerFormState(isDirty, create.isPending);
  async function save(input: PlaceholderInput) {
    try {
      const result = await create.mutateAsync({ input, key });
      setId(result.id);
      reset({ name: "", groupId });
      toast.success("Person added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add person");
    }
  }
  return id ? (
    <div className="space-y-3">
      <InvitePanel input={{ type: "DIRECT", placeholderId: id, groupId }} />
      <Button
        variant="outline"
        onClick={() => {
          setId(null);
          setKey(crypto.randomUUID());
        }}
      >
        Add another person
      </Button>
    </div>
  ) : (
    <form onSubmit={handleSubmit(save)} className="space-y-3">
      <Label htmlFor="person-name">Add someone by name</Label>
      <Input id="person-name" {...register("name")} />
      <p className="text-sm text-destructive" role="status">
        {errors.name?.message}
      </p>
      <Label htmlFor="person-phone">Phone (optional, unverified)</Label>
      <Input id="person-phone" type="tel" {...register("phone")} />
      <div className="form-drawer-actions">
        <Button className="w-full" type="submit" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add person"}
        </Button>
      </div>
    </form>
  );
}
