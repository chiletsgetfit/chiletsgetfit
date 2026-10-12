// amanda.chiletsgetfit.com opens straight onto the studio board (/studio).
// Also matches amanda.localhost for local testing.
export function isStudioHost(host: string | null | undefined): boolean {
  return (host ?? "").split(":")[0].toLowerCase().startsWith("amanda.");
}
