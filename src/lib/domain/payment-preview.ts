export function paymentPreview(net: number, amount: number, viewerPays: boolean) {
  if (!Number.isSafeInteger(net) || !Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid payment amount");
  const after = net + (viewerPays ? amount : -amount);
  if (!Number.isSafeInteger(after)) throw new Error("Balance is too large");
  const needsConfirmation = net === 0 || Math.abs(after) > Math.abs(net) || (after !== 0 && Math.sign(after) !== Math.sign(net));
  const repaysDebt = (viewerPays ? net < 0 : net > 0) && amount <= Math.abs(net);
  return { after, needsConfirmation, repaysDebt };
}
