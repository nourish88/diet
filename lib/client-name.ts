export interface ClientNameParts { name?: string | null; surname?: string | null; fullName?: string | null }

function usableName(value: unknown): string {
  if (typeof value !== "string") return "";
  const name = value.trim().replace(/\s+/g, " ");
  return /^(isimsiz danışan|undefined|null)$/iu.test(name.toLocaleLowerCase("tr-TR")) ? "" : name;
}

export function resolveClientName(client?: ClientNameParts | null, ...fallbacks: unknown[]): string {
  const parts = [client?.name, client?.surname].map(usableName).filter(Boolean).join(" ");
  return usableName(client?.fullName) || parts || fallbacks.map(usableName).find(Boolean) || "";
}

export function requireClientName(name: string): string {
  const resolved = usableName(name);
  if (!resolved) throw new Error("Danışan adı yüklenemedi. PDF indirmeden önce danışan bilgilerini yeniden yükleyin.");
  return resolved;
}
