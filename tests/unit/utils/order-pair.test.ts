import { describe, it, expect } from "vitest";
import { orderPair } from "@/lib/utils/order-pair";

describe("orderPair", () => {
  it("orders alphabetically when a < b", () => {
    expect(orderPair("abc", "xyz")).toEqual(["abc", "xyz"]);
  });

  it("swaps when a > b", () => {
    expect(orderPair("xyz", "abc")).toEqual(["abc", "xyz"]);
  });

  it("handles equal values", () => {
    expect(orderPair("same", "same")).toEqual(["same", "same"]);
  });

  it("handles cuid2-like values", () => {
    const [low, high] = orderPair("clz1abc", "cla1xyz");
    expect(low).toBe("cla1xyz");
    expect(high).toBe("clz1abc");
  });
});
