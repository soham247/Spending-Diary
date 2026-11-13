export type DrawerFlow =
  | { status: "CLOSED" }
  | { status: "OPEN"; dirty: boolean; busy: boolean }
  | {
      status: "CONFIRMING_DISCARD";
      dirty: boolean;
      busy: boolean;
      action: () => void;
    };

export type DrawerEvent =
  | { type: "OPEN" }
  | { type: "DIRTY"; value: boolean }
  | { type: "BUSY"; value: boolean }
  | { type: "CONFIRM_DISCARD"; action: () => void }
  | { type: "KEEP_EDITING" }
  | { type: "COMPLETE" };

export function drawerFlow(state: DrawerFlow, event: DrawerEvent): DrawerFlow {
  switch (event.type) {
    case "OPEN":
      return state.status === "CLOSED"
        ? { status: "OPEN", dirty: false, busy: false }
        : state;
    case "COMPLETE":
      return { status: "CLOSED" };
    case "DIRTY":
      return state.status === "CLOSED"
        ? state
        : { ...state, dirty: event.value };
    case "BUSY":
      return state.status === "CLOSED"
        ? state
        : { ...state, busy: event.value };
    case "CONFIRM_DISCARD":
      return state.status !== "CLOSED" && !state.busy && state.dirty
        ? { ...state, status: "CONFIRMING_DISCARD", action: event.action }
        : state;
    case "KEEP_EDITING":
      return state.status === "CONFIRMING_DISCARD"
        ? { status: "OPEN", dirty: state.dirty, busy: state.busy }
        : state;
  }
}
