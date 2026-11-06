import "server-only";
import { lookup } from "node:dns";
import { Agent } from "node:https";
import { isIP, type LookupFunction } from "node:net";
export function isPublicAddress(address: string) {
  if (isIP(address) === 6) { const prefix = parseInt(address.split(":")[0]!,16); return prefix >= 0x2000 && prefix <= 0x3fff && !address.toLowerCase().startsWith("2001:db8:"); }
  if (isIP(address) !== 4) return false;
  const [a,b] = address.split(".").map(Number) as [number,number];
  return a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && (b === 168 || b === 0)) && !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && (b === 18 || b === 19));
}
const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) { callback(error, []); return; }
    if (!addresses.length || addresses.some(row => !isPublicAddress(row.address))) { callback(new Error("Push endpoint must resolve to public addresses"), []); return; }
    const candidates = options.family ? addresses.filter(row => row.family === options.family) : addresses;
    if (!candidates.length) { callback(new Error("No public address for requested family"), []); return; }
    callback(null, options.all ? candidates : candidates[0]!.address, candidates[0]!.family);
  });
};
export const pushAgent = new Agent({ lookup: publicLookup });
