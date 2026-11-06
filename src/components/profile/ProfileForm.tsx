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
import { updateProfileSchema, type Profile, type UpdateProfileInput } from "@/lib/validation/profile";

export function ProfileForm({ profile, destination }: { profile: Profile; destination?: string }) {
  const update = useUpdateProfile();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof updateProfileSchema>, unknown, UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema), mode: "onBlur", reValidateMode: "onChange",
    defaultValues: { name: profile.name, phone: profile.phone, upiId: profile.upiId },
  });
  async function save(input: UpdateProfileInput) {
    try {
      await update.mutateAsync({ ...input, ...(destination ? { completeOnboarding: true } : {}) });
      toast.success("Profile saved");
      if (destination) router.replace(destination);
    } catch { toast.error("Couldn't save. Check your connection and try again."); }
  }
  return <form onSubmit={handleSubmit(save)} className="max-w-md space-y-5">
    <div className="flex items-center gap-3"><Avatar><AvatarImage src={profile.image ?? undefined} alt={profile.name} /><AvatarFallback>{profile.name.slice(0,1)}</AvatarFallback></Avatar><p className="min-w-0 break-all text-muted-foreground">{profile.email}</p></div>
    <div className="space-y-2"><Label htmlFor="name">Display name</Label><Input id="name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} /><p role="status" className="text-sm text-destructive">{errors.name?.message}</p></div>
    <div className="space-y-2"><Label htmlFor="upiId">UPI ID (optional)</Label><Input id="upiId" placeholder="name@bank" {...register("upiId", { setValueAs: value => typeof value === "string" && !value.trim() ? null : value })} aria-invalid={!!errors.upiId} /><p role="status" className="text-sm text-destructive">{errors.upiId?.message}</p></div>
    <div className="space-y-2"><Label htmlFor="phone">Phone (optional, unverified)</Label><Input id="phone" type="tel" autoComplete="tel" {...register("phone", { setValueAs: value => typeof value === "string" && !value.trim() ? null : value })} aria-invalid={!!errors.phone} /><p role="status" className="text-sm text-destructive">{errors.phone?.message}</p></div>
    {update.isError && <p role="alert">Couldn&apos;t save. Check your connection and try again.</p>}
    <Button type="submit" size="lg" disabled={update.isPending}>{update.isPending ? "Saving…" : destination ? "Continue" : "Save"}</Button>
  </form>;
}
