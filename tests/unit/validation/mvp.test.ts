import { describe, it, expect } from "vitest";
import { isPublicAddress } from "@/lib/push/public-agent";
import { subscriptionSchema } from "@/lib/validation/notifications";
import { toMinor } from "@/lib/money/to-minor";
describe("push endpoint safety", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fc00::1",
  ])("rejects private address %s", (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );
  it("accepts public addresses and rejects literal IP subscriptions", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    expect(
      subscriptionSchema.safeParse({
        endpoint: "https://127.0.0.1/push",
        keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
      }).success,
    ).toBe(false);
  });
});
describe("amount grouping", () => {
  it.each(["1,200.50", "1,20,000.50"])("accepts grouped amount %s", (value) =>
    expect(toMinor(value)).toBe(toMinor(value.replaceAll(",", ""))),
  );
  it.each(["1,,200", "12,00", "1,23.50"])(
    "rejects malformed grouping %s",
    (value) => expect(() => toMinor(value)).toThrow(),
  );
});
