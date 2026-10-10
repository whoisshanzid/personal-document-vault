export function ipfsUrl(cid: string): string {
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud";
  return `${gateway.replace(/\/+$/, "")}/ipfs/${cid}`;
}
