export function deviceLabel(userAgent: string | null | undefined) {
  if (!userAgent) return "Browser session";
  const browser = /Edg(?:A|iOS)?\//.test(userAgent)
    ? "Edge"
    : /(?:Firefox|FxiOS)\//.test(userAgent)
      ? "Firefox"
      : /(?:Chrome|CriOS)\//.test(userAgent)
        ? "Chrome"
        : /Version\/.+Safari\//.test(userAgent)
          ? "Safari"
          : null;
  const device = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(userAgent)
            ? "Mac"
            : /Linux/.test(userAgent)
              ? "Linux"
              : null;
  if (browser && device) return `${browser} on ${device}`;
  return browser ?? (device ? `Browser on ${device}` : "Browser session");
}
