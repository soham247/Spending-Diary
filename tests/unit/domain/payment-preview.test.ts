import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { paymentPreview } from "@/lib/domain/payment-preview";
import { paymentFormDraft } from "@/lib/validation/settlement-draft";

describe("payment preview", () => {
  it.each([
    [-10000, 10000, true, 0, false],
    [-10000, 4000, true, -6000, false],
    [-10000, 15000, true, 5000, true],
    [0, 20000, true, 20000, true],
    [10000, 5000, true, 15000, true],
    [10000, 4000, false, 6000, false],
    [10000, 15000, false, -5000, true],
    [0, 20000, false, -20000, true],
  ])("projects %s with payment %s, viewerPays=%s", (before, amount, viewerPays, after, needsConfirmation) => {
    expect(paymentPreview(before, amount, viewerPays)).toMatchObject({ after, needsConfirmation });
  });
  it("preserves zero-sum nets and reverses exactly", () => {
    fc.assert(fc.property(fc.integer({ min: -2147483647, max: 2147483647 }), fc.integer({ min: 1, max: 2147483647 }), fc.boolean(), (net, amount, pays) => {
      const result = paymentPreview(net, amount, pays);
      expect(result.after + paymentPreview(-net, amount, !pays).after).toBe(0);
      expect(paymentPreview(result.after, amount, !pays).after).toBe(net);
      if (!result.needsConfirmation) expect(result.repaysDebt).toBe(true);
    }));
  });
  it.each([0, -50, 0.5, Number.NaN])("rejects invalid amount %s", amount => {
    expect(() => paymentPreview(0, amount, true)).toThrow();
  });
  it("validates optional notes, date and restricted repayments at the form edge", () => {
    const person = { id: "friend", name: "Friend", upiId: null, net: -10000, restricted: true };
    const scope = { id: "group", name: "Trip", currency: "INR", people: [person] };
    const values = { amount: "40", viewerPays: true, date: "2026-11-06", note: "  Part repayment  ", method: "OTHER" as const };
    expect(paymentFormDraft("viewer", scope, person, values).input).toMatchObject({ amount: 4000, groupId: "group", note: "Part repayment", method: "OTHER" });
    expect(paymentFormDraft("viewer", scope, person, { ...values, note: "" }).input.note).toBeNull();
    expect(() => paymentFormDraft("viewer", scope, person, { ...values, amount: "150" })).toThrow("existing debt");
    expect(() => paymentFormDraft("viewer", scope, person, { ...values, viewerPays: false })).toThrow("existing debt");
    expect(() => paymentFormDraft("viewer", scope, person, { ...values, note: "a".repeat(2001) })).toThrow();
    expect(() => paymentFormDraft("viewer", scope, person, { ...values, date: "2026-02-30" })).toThrow();
  });
});
