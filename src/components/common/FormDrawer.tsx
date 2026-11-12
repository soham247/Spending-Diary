"use client";

import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useIsMobile } from "@/hooks/use-mobile";

interface DrawerFormContext {
  setDirty: (dirty: boolean) => void;
  setBusy: (busy: boolean) => void;
  complete: (afterClose?: () => void) => void;
  confirmDiscard: (action: () => void) => void;
}

const FormDrawerContext = createContext<DrawerFormContext | null>(null);

export function useFormDrawer() {
  return use(FormDrawerContext);
}

export function useDrawerFormState(dirty: boolean, busy: boolean) {
  useUnsavedChanges(dirty);
  const context = useFormDrawer();
  const setDirty = context?.setDirty;
  const setBusy = context?.setBusy;
  useEffect(() => {
    setDirty?.(dirty);
    return () => setDirty?.(false);
  }, [dirty, setDirty]);
  useEffect(() => {
    setBusy?.(busy);
    return () => setBusy?.(false);
  }, [busy, setBusy]);
}

export function FormDrawer({
  title,
  description,
  trigger,
  defaultOpen = false,
  onDismiss,
  children,
}: {
  title: string;
  description: string;
  trigger?: ReactElement;
  defaultOpen?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stopWaitingForInput = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);
  const historyId = useId();
  const historyGeneration = useRef({ generation: 0 });
  const afterClose = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stopWaitingForInput.current?.(), [open]);
  function complete(action?: () => void) {
    afterClose.current = action;
    setOpen(false);
  }
  function dismiss() {
    complete(onDismiss);
  }
  function confirmDiscard(action: () => void) {
    if (busy) return;
    if (dirty) setDiscardAction(() => action);
    else action();
  }
  const back = useEffectEvent(() => {
    if (dirty || busy)
      window.history.pushState(
        { ...window.history.state, formDrawer: historyId },
        "",
      );
    confirmDiscard(dismiss);
  });
  useEffect(() => {
    if (!open) return;
    const history = historyGeneration.current;
    const generation = ++history.generation;
    const url = window.location.href;
    if (window.history.state?.formDrawer !== historyId)
      window.history.pushState(
        { ...window.history.state, formDrawer: historyId },
        "",
      );
    const pop = () => {
      if (window.history.state?.formDrawer !== historyId) back();
    };
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      queueMicrotask(() => {
        if (history.generation !== generation) return;
        const action = afterClose.current;
        afterClose.current = undefined;
        if (
          window.location.href === url &&
          window.history.state?.formDrawer === historyId
        ) {
          if (action)
            window.addEventListener("popstate", () => queueMicrotask(action), {
              once: true,
            });
          window.history.back();
        } else action?.();
      });
    };
  }, [open, historyId]);
  return (
    <FormDrawerContext value={{ setDirty, setBusy, complete, confirmDiscard }}>
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else confirmDiscard(dismiss);
        }}
        direction={isMobile ? "bottom" : "right"}
        dismissible={!busy && !dirty}
        handleOnly
        autoFocus
      >
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent
          ref={contentRef}
          className="form-drawer-content w-full data-[vaul-drawer-direction=bottom]:mx-auto data-[vaul-drawer-direction=bottom]:sm:max-w-2xl data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-2xl"
          onOpenAutoFocus={(event) => {
            stopWaitingForInput.current?.();
            const content = contentRef.current;
            const title = titleRef.current;
            if (!content || !title) return;
            event.preventDefault();
            title.focus({ preventScroll: true });
            if (window.matchMedia("(max-width: 767px)").matches) return;
            const firstInput = () =>
              content.querySelector<HTMLInputElement>(
                'input:not([type="hidden"]):not(:disabled)',
              );
            const input = firstInput();
            if (input) {
              input.focus({ preventScroll: true });
              return;
            }
            const stop = () => {
              observer.disconnect();
              content.removeEventListener("focusin", stop);
              content.removeEventListener("pointerdown", stop);
              content.removeEventListener("keydown", stop);
              stopWaitingForInput.current = null;
            };
            const observer = new MutationObserver(() => {
              const ready = firstInput();
              if (!ready) return;
              stop();
              if (document.activeElement === title)
                ready.focus({ preventScroll: true });
            });
            observer.observe(content, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ["disabled"],
            });
            content.addEventListener("focusin", stop);
            content.addEventListener("pointerdown", stop);
            content.addEventListener("keydown", stop);
            stopWaitingForInput.current = stop;
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            confirmDiscard(dismiss);
          }}
          onPointerDownOutside={(event) => {
            event.preventDefault();
            confirmDiscard(dismiss);
          }}
        >
          {isMobile && (
            <DrawerPrimitive.Handle
              preventCycle
              className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-muted"
            />
          )}
          <DrawerHeader className="relative shrink-0 border-b border-border pr-16 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle ref={titleRef} tabIndex={-1} className="break-words">
              {title}
            </DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close form"
              disabled={busy}
              className="absolute right-3 top-3"
              onClick={() => confirmDiscard(dismiss)}
            >
              <X aria-hidden="true" strokeWidth={1.75} />
            </Button>
          </DrawerHeader>
          <div className="form-drawer-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-6">
            {open && children}
          </div>
        </DrawerContent>
      </Drawer>
      <AlertDialog
        open={discardAction !== null}
        onOpenChange={(next) => {
          if (!next) setDiscardAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                discardAction?.();
                setDiscardAction(null);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormDrawerContext>
  );
}
