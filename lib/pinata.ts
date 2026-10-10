import { PinataSDK } from "pinata";

let client: PinataSDK | null = null;

/**
 * Server-only Pinata client. Never import this from a "use client" file —
 * PINATA_JWT must never reach the browser.
 */
export function getPinata(): PinataSDK {
  if (client) return client;

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error(
      "PINATA_JWT is missing. Add it to .env.local (see .env.local.example)."
    );
  }

  client = new PinataSDK({
    pinataJwt: jwt,
    pinataGateway: process.env.PINATA_GATEWAY ?? "gateway.pinata.cloud",
  });

  return client;
}

export function getGatewayUrl(cid: string): string {
  const gateway =
    process.env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud";
  return `${gateway.replace(/\/+$/, "")}/ipfs/${cid}`;
}
