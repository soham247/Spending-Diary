import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import {
  drawerFlow,
  type DrawerEvent,
  type DrawerFlow,
} from "@/lib/state/drawer-flow";

const closed: DrawerFlow = { status: "CLOSED" };

describe("form drawer workflow", () => {
  it("keeps the dirty draft when discard is cancelled", () => {
    const open = drawerFlow(closed, { type: "OPEN" });
    const dirty = drawerFlow(open, { type: "DIRTY", value: true });
    const action = vi.fn();
    const confirming = drawerFlow(dirty, { type: "CONFIRM_DISCARD", action });
    expect(confirming.status).toBe("CONFIRMING_DISCARD");
    expect(drawerFlow(confirming, { type: "KEEP_EDITING" })).toEqual(dirty);
    expect(action).not.toHaveBeenCalled();
  });

  it("blocks discard requests while busy without running their callbacks", () => {
    const action = vi.fn();
    const busy: DrawerFlow = { status: "OPEN", dirty: true, busy: true };
    expect(drawerFlow(busy, { type: "CONFIRM_DISCARD", action })).toEqual(busy);
    expect(action).not.toHaveBeenCalled();
  });

  it("forgets the old draft and discard callback after completion", () => {
    const confirming: DrawerFlow = {
      status: "CONFIRMING_DISCARD",
      dirty: true,
      busy: false,
      action: vi.fn(),
    };
    const complete = drawerFlow(confirming, { type: "COMPLETE" });
    expect(complete).toEqual(closed);
    expect(drawerFlow(complete, { type: "KEEP_EDITING" })).toEqual(closed);
    expect(drawerFlow(complete, { type: "DIRTY", value: true })).toEqual(
      closed,
    );
    expect(drawerFlow(complete, { type: "BUSY", value: true })).toEqual(closed);
    expect(drawerFlow(complete, { type: "OPEN" })).toEqual({
      status: "OPEN",
      dirty: false,
      busy: false,
    });
  });

  it("only closes on completion and only opens discard confirmation for a dirty, idle draft", () => {
    const action = vi.fn();
    const event = fc.constantFrom<DrawerEvent>(
      { type: "OPEN" },
      { type: "COMPLETE" },
      { type: "KEEP_EDITING" },
      { type: "DIRTY", value: true },
      { type: "DIRTY", value: false },
      { type: "BUSY", value: true },
      { type: "BUSY", value: false },
      { type: "CONFIRM_DISCARD", action },
    );
    fc.assert(
      fc.property(fc.array(event, { maxLength: 100 }), (events) => {
        let state: DrawerFlow = closed;
        for (const input of events) {
          const next = drawerFlow(state, input);
          if (next.status === "CLOSED" && state.status !== "CLOSED")
            expect(input.type).toBe("COMPLETE");
          if (
            next.status === "CONFIRMING_DISCARD" &&
            state.status !== "CONFIRMING_DISCARD"
          ) {
            expect(state).toMatchObject({
              status: "OPEN",
              dirty: true,
              busy: false,
            });
            expect(input.type).toBe("CONFIRM_DISCARD");
          }
          state = next;
        }
        expect(action).not.toHaveBeenCalled();
      }),
    );
  });
});
