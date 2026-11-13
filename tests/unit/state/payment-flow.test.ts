import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  awaitingUpi,
  paymentFlow,
  type PaymentEvent,
  type PaymentFlow,
} from "@/lib/state/payment-flow";

const editing: PaymentFlow = { status: "EDITING" };

describe("payment workflow", () => {
  it("does not record a UPI payment until the user confirms it", () => {
    const confirming = paymentFlow(editing, { type: "CONFIRM", action: "upi" });
    expect(paymentFlow(confirming, { type: "RECORD" })).toEqual(confirming);
    const away = paymentFlow(confirming, { type: "LAUNCH_UPI" });
    expect(away).toEqual({ status: "AWAITING_UPI", visibility: "AWAY" });
    const returned = paymentFlow(away, { type: "RETURN" });
    expect(returned.status).toBe("AWAITING_UPI");
    expect(paymentFlow(returned, { type: "COMPLETE" })).toEqual(returned);
    expect(paymentFlow(returned, { type: "CANCEL_UPI" })).toEqual(editing);
  });

  it("ignores the confirmation dialog closing after UPI is launched", () => {
    const confirming = paymentFlow(editing, { type: "CONFIRM", action: "upi" });
    const launched = paymentFlow(confirming, { type: "LAUNCH_UPI" });
    expect(paymentFlow(launched, { type: "CANCEL_CONFIRMATION" })).toEqual(
      launched,
    );
  });

  it.each(["AWAY", "RETURNED"] as const)(
    "preserves UPI confirmation on a failed recording (%s)",
    (visibility) => {
      const awaiting: PaymentFlow = { status: "AWAITING_UPI", visibility };
      const recording = paymentFlow(awaiting, { type: "RECORD" });
      expect(awaitingUpi(recording)).toBe(true);
      expect(paymentFlow(recording, { type: "FAIL" })).toEqual(awaiting);
    },
  );

  it("returns a failed cash recording to the editable draft", () => {
    const confirming = paymentFlow(editing, {
      type: "CONFIRM",
      action: "record",
    });
    const recording = paymentFlow(confirming, { type: "RECORD" });
    expect(paymentFlow(recording, { type: "FAIL" })).toEqual(editing);
    expect(paymentFlow(confirming, { type: "CANCEL_CONFIRMATION" })).toEqual(
      editing,
    );
  });

  it("blocks navigation and cancellation while recording, then permits a new inline payment", () => {
    const recording = paymentFlow(editing, { type: "RECORD" });
    for (const event of [
      { type: "CHANGE" },
      { type: "CANCEL_UPI" },
      { type: "CANCEL_CONFIRMATION" },
      { type: "LAUNCH_UPI" },
      { type: "CONFIRM", action: "record" },
    ] satisfies PaymentEvent[]) {
      expect(paymentFlow(recording, event)).toEqual(recording);
    }
    const complete = paymentFlow(recording, { type: "COMPLETE" });
    expect(paymentFlow(complete, { type: "RECORD" })).toEqual(complete);
    expect(paymentFlow(complete, { type: "RESET" })).toEqual(editing);
  });

  it("only enters recording on RECORD and completion on a successful recording", () => {
    const event = fc.constantFrom<PaymentEvent>(
      { type: "CHANGE" },
      { type: "CONFIRM", action: "record" },
      { type: "CONFIRM", action: "upi" },
      { type: "LAUNCH_UPI" },
      { type: "RETURN" },
      { type: "CANCEL_CONFIRMATION" },
      { type: "CANCEL_UPI" },
      { type: "RECORD" },
      { type: "FAIL" },
      { type: "COMPLETE" },
      { type: "RESET" },
    );
    fc.assert(
      fc.property(fc.array(event, { maxLength: 100 }), (events) => {
        let state: PaymentFlow = editing;
        for (const input of events) {
          const next = paymentFlow(state, input);
          if (next.status === "RECORDING" && state.status !== "RECORDING")
            expect(input.type).toBe("RECORD");
          if (next.status === "COMPLETE" && state.status !== "COMPLETE") {
            expect(state.status).toBe("RECORDING");
            expect(input.type).toBe("COMPLETE");
          }
          state = next;
        }
      }),
    );
  });
});
