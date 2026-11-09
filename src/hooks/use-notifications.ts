"use client";
import { useMutation } from "@tanstack/react-query";
import { apiEnablePush } from "@/lib/api/push";
import { useSyncExternalStore } from "react";

function subscribeToBrowserStatus(listener: () => void) {
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

function browserStatus() {
  if (
    !window.isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return "unsupported";
  return Notification.permission;
}

function serverStatus() {
  return "loading" as const;
}

export function useBrowserPushStatus() {
  return useSyncExternalStore(
    subscribeToBrowserStatus,
    browserStatus,
    serverStatus,
  );
}

export function useEnablePush() {
  return useMutation({ mutationFn: apiEnablePush });
}
