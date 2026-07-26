// X-Hub-Signature-256 verification — Guide §10.2, §19 E18.
//
// Note this differs from the snippet in the guide in one important way: the
// guide feeds the raw header straight into `timingSafeEqual`, which *throws*
// when the lengths differ (a truncated or missing header — exactly the attack
// case). We normalise the length first, then compare in constant time.
import crypto from "node:crypto";

export function verifySignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  // Constant-time compare requires equal lengths; hash the two sides so a
  // wrong-length header can't short-circuit and leak that fact via timing.
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}
