"use client";
import type { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  updateProfileSchema,
  type Profile,
  type UpdateProfileInput,
} from "@/lib/validation/profile";

export function ProfileForm({
  profile,
  destination,
}: {
  profile: Profile;
  destination?: string;
}) {
  const update = useUpdateProfile();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof updateProfileSchema>, unknown, UpdateProfileInput>(
    {
      resolver: zodResolver(updateProfileSchema),
      mode: "onBlur",
      reValidateMode: "onChange",
      defaultValues: {
        name: profile.name,
        phone: profile.phone,
        upiId: profile.upiId,
      },
    },
  );
  useUnsavedChanges(isDirty);
  async function save(input: UpdateProfileInput) {
    try {
      const saved = await update.mutateAsync({
        ...input,
        ...(destination ? { completeOnboarding: true } : {}),
      });
      reset({ name: saved.name, phone: saved.phone, upiId: saved.upiId });
      toast.success("Profile saved");
      if (destination) router.replace(destination);
    } catch {
      toast.error("Couldn't save. Check your connection and try again.");
    }
  }
  return (
    <form
      onSubmit={handleSubmit(save)}
      className={destination ? "max-w-md space-y-5" : "space-y-6"}
      aria-label="Profile"
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={profile.image ?? undefined} alt={profile.name} />
          <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <p className="break-words text-sm font-medium">{profile.name}</p>
          <p className="break-all text-sm text-muted-foreground">
            {profile.email}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          autoComplete="name"
          {...register("name")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={update.isPending}
        />
        {errors.name && (
          <p id="name-error" role="status" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className={destination ? "space-y-5" : "grid gap-6 sm:grid-cols-2"}>
        <div className="space-y-2">
          <Label htmlFor="upiId">UPI ID (optional)</Label>
          <Input
            id="upiId"
            placeholder="name@bank"
            {...register("upiId", {
              setValueAs: (value) =>
                typeof value === "string" && !value.trim() ? null : value,
            })}
            aria-invalid={!!errors.upiId}
            aria-describedby={errors.upiId ? "upiId-error" : undefined}
            disabled={update.isPending}
          />
          {errors.upiId && (
            <p
              id="upiId-error"
              role="status"
              className="text-sm text-destructive"
            >
              {errors.upiId.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional, unverified)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            {...register("phone", {
              setValueAs: (value) =>
                typeof value === "string" && !value.trim() ? null : value,
            })}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            disabled={update.isPending}
          />
          {errors.phone && (
            <p
              id="phone-error"
              role="status"
              className="text-sm text-destructive"
            >
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>
      {update.isError && (
        <p role="alert">
          Couldn&apos;t save. Check your connection and try again.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={update.isPending || (!destination && !isDirty)}
        >
          {update.isPending
            ? "Saving…"
            : destination
              ? "Continue"
              : "Save profile"}
        </Button>
        {!destination && update.isSuccess && !isDirty && (
          <p role="status" className="text-sm text-muted-foreground">
            Profile saved
          </p>
        )}
      </div>
    </form>
  );
}
