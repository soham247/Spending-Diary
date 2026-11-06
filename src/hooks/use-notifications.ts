"use client";
import { useMutation } from "@tanstack/react-query";
import { apiEnablePush } from "@/lib/api/push";
export function useEnablePush() { return useMutation({ mutationFn: apiEnablePush }); }
