import { after } from "next/server";
import { dispatchPush } from "./dispatch";
export function schedulePush() { after(async () => { try { await dispatchPush(); } catch { console.error("[push] Delivery deferred to maintenance"); } }); }
