type EmailKind = "verification" | "password-reset";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function accountEmail(kind: EmailKind, url: string) {
  const link = new URL(url);
  if (link.protocol !== "https:" && link.protocol !== "http:") {
    throw new Error("Account emails require an HTTP or HTTPS link");
  }

  const verification = kind === "verification";
  const title = verification ? "Verify your email" : "Reset your password";
  const introduction = verification
    ? "You received this email because a Spending Diary account was created with this address."
    : "You received this email because a password reset was requested for your Spending Diary account.";
  const expiry = verification
    ? "This link expires in 1 hour."
    : "This link expires in 1 hour and can only be used once.";
  const reassurance = verification
    ? "If you did not create this account, you can ignore this email."
    : "If you did not request this, you can ignore this email. Your password will stay the same.";

  return {
    subject: `${title} - Spending Diary`,
    text: [
      "Spending Diary",
      title,
      introduction,
      `${title}: ${url}`,
      expiry,
      reassurance,
    ].join("\n\n"),
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;">
<main style="max-width:560px;margin:0 auto;">
<p>Spending Diary</p>
<h1 style="font-size:24px;line-height:1.3;">${title}</h1>
<p>${introduction}</p>
<p><a href="${escapeHtml(url)}">${title}</a></p>
<p>${expiry}</p>
<p>${reassurance}</p>
</main>
</body>
</html>`,
  };
}
