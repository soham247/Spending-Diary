"use client";
import { useProfile } from "@/hooks/use-profile";
import { ProfileForm } from "./ProfileForm";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
export function ProfileSettings({ destination }: { destination?: string }) {
  const profile = useProfile();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState retry={() => void profile.refetch()} />;
  return <ProfileForm profile={profile.data} destination={destination} />;
}
