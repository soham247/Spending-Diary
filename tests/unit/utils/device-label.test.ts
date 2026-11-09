import { describe, expect, it } from "vitest";
import { deviceLabel } from "@/lib/utils/device-label";

describe("deviceLabel", () => {
  it.each([
    [
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
      "Chrome on Android",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36 Edg/130.0",
      "Edge on Windows",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari on iPhone",
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) FxiOS/130.0 Mobile/15E148 Safari/605.1.15",
      "Firefox on iPad",
    ],
    [
      "Mozilla/5.0 (iPhone) CriOS/130.0 Mobile/15E148 Safari/604.1",
      "Chrome on iPhone",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/130.0",
      "Firefox on Linux",
    ],
    [null, "Browser session"],
    [undefined, "Browser session"],
    ["", "Browser session"],
    ["Unrecognized private browser", "Browser session"],
    ["Private browser on Android", "Browser on Android"],
  ])(
    "describes %s without exposing a raw user-agent",
    (userAgent, expected) => {
      expect(deviceLabel(userAgent)).toBe(expected);
    },
  );
});
