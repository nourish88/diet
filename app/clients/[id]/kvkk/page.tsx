"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ConsentAudit } from "@/components/privacy/ConsentAudit";

export default function ClientKvkkAuditPage() {
  const params = useParams();
  const clientId = Number(params?.id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) return <p>Geçersiz danışan kimliği.</p>;
  return <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6"><Link href={`/clients/${clientId}`} className="text-brand underline">Danışana dön</Link><ConsentAudit clientId={clientId} /></div>;
}
