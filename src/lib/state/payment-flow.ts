export type PaymentAction = "record" | "upi";
type UpiState = "AWAY" | "RETURNED";
export type PaymentFlow =
  | { status: "EDITING" }
  | { status: "CONFIRMING"; action: PaymentAction }
  | { status: "AWAITING_UPI"; visibility: UpiState }
  | { status: "RECORDING"; retry: "EDITING" | UpiState }
  | { status: "COMPLETE" };

export type PaymentEvent =
  | { type: "CHANGE" }
  | { type: "CONFIRM"; action: PaymentAction }
  | { type: "CANCEL_CONFIRMATION" }
  | { type: "CANCEL_UPI" }
  | { type: "RESET" }
  | { type: "LAUNCH_UPI" }
  | { type: "RETURN" }
  | { type: "RECORD" }
  | { type: "FAIL" }
  | { type: "COMPLETE" };

export function paymentFlow(
  state: PaymentFlow,
  event: PaymentEvent,
): PaymentFlow {
  switch (event.type) {
    case "CHANGE":
    case "CANCEL_CONFIRMATION":
      return state.status === "EDITING" || state.status === "CONFIRMING"
        ? { status: "EDITING" }
        : state;
    case "CANCEL_UPI":
      return state.status === "AWAITING_UPI" ? { status: "EDITING" } : state;
    case "RESET":
      return state.status === "COMPLETE" ? { status: "EDITING" } : state;
    case "CONFIRM":
      return state.status === "EDITING"
        ? { status: "CONFIRMING", action: event.action }
        : state;
    case "LAUNCH_UPI":
      return state.status === "EDITING" ||
        (state.status === "CONFIRMING" && state.action === "upi")
        ? { status: "AWAITING_UPI", visibility: "AWAY" }
        : state;
    case "RETURN":
      if (state.status === "RECORDING" && state.retry !== "EDITING")
        return { ...state, retry: "RETURNED" };
      return state.status === "AWAITING_UPI"
        ? { ...state, visibility: "RETURNED" }
        : state;
    case "RECORD":
      if (state.status === "AWAITING_UPI")
        return { status: "RECORDING", retry: state.visibility };
      return state.status === "EDITING" ||
        (state.status === "CONFIRMING" && state.action === "record")
        ? { status: "RECORDING", retry: "EDITING" }
        : state;
    case "FAIL":
      return state.status === "RECORDING"
        ? state.retry === "EDITING"
          ? { status: "EDITING" }
          : { status: "AWAITING_UPI", visibility: state.retry }
        : state;
    case "COMPLETE":
      return state.status === "RECORDING" ? { status: "COMPLETE" } : state;
  }
}

export function awaitingUpi(state: PaymentFlow) {
  return (
    state.status === "AWAITING_UPI" ||
    (state.status === "RECORDING" && state.retry !== "EDITING")
  );
}
