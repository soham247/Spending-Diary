"use client";
import {
  useDrawerFormState,
  useFormDrawer,
} from "@/components/common/FormDrawer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useUpdateFriend } from "@/hooks/use-friends";
import {
  friendUpdateSchema,
  type FriendUpdateInput,
} from "@/lib/validation/invite";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export function NicknameForm({ id, name }: { id: string; name: string }) {
  const drawer = useFormDrawer();
  const update = useUpdateFriend();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FriendUpdateInput>({
    resolver: zodResolver(friendUpdateSchema),
    defaultValues: { nickname: name },
  });
  useDrawerFormState(isDirty, update.isPending);
  async function save(input: FriendUpdateInput) {
    try {
      await update.mutateAsync({ id, input });
      toast.success("Nickname saved");
      drawer?.complete();
    } catch {
      toast.error("Couldn't save nickname");
    }
  }
  return (
    <form onSubmit={handleSubmit(save)} className="space-y-3">
      <Label htmlFor="nickname">Nickname (only you see this)</Label>
      <Input id="nickname" autoComplete="off" {...register("nickname")} />
      <p role="status" className="text-sm text-destructive">
        {errors.nickname?.message}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={update.isPending}>
          Save nickname
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={update.isPending}
          onClick={() => void save({ nickname: null })}
        >
          Use their name
        </Button>
      </div>
    </form>
  );
}
