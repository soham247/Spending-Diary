"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateGroup } from "@/hooks/use-groups";
import {
  createGroupSchema,
  type CreateGroupInput,
} from "@/lib/validation/group";
import {
  useDrawerFormState,
  useFormDrawer,
} from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateGroupForm() {
  const create = useCreateGroup();
  const drawer = useFormDrawer();
  const [key] = useState(() => crypto.randomUUID());
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<
    CreateGroupInput,
    unknown,
    ReturnType<typeof createGroupSchema.parse>
  >({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      type: "OTHER",
      currency: "INR",
      simplifyDebts: true,
    },
  });
  useDrawerFormState(isDirty, create.isPending);
  async function save(input: CreateGroupInput) {
    try {
      await create.mutateAsync({ input, key });
      toast.success("Group created");
      drawer?.complete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    }
  }
  return (
    <form onSubmit={handleSubmit(save)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          placeholder="Goa trip, our flat…"
          autoComplete="off"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        <p role="status" className="text-sm text-destructive">
          {errors.name?.message}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="group-type">Group type</Label>
        <Select
          defaultValue="OTHER"
          onValueChange={(value) =>
            setValue("type", createGroupSchema.shape.type.parse(value), {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger id="group-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["TRIP", "HOME", "COUPLE", "OTHER"] as const).map((type) => (
              <SelectItem key={type} value={type}>
                {
                  {
                    TRIP: "Trip",
                    HOME: "Home",
                    COUPLE: "Couple",
                    OTHER: "Other",
                  }[type]
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">Currency: INR</p>
      <div className="form-drawer-actions">
        <Button className="w-full" type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create group"}
        </Button>
      </div>
    </form>
  );
}
