"use client";
import Link from "next/link";
import { ConsentAudit } from "@/components/privacy/ConsentAudit";
import { PrivacyPolicyManager } from "@/components/privacy/PrivacyPolicyManager";
import { PrivacyRequestManager } from "@/components/privacy/PrivacyRequestManager";

export default function KvkkAuditPage() {
  return <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6"><Link href="/" className="text-brand underline">Ana sayfaya dön</Link><h1 className="text-2xl font-semibold">KVKK yönetimi</h1><PrivacyPolicyManager /><PrivacyRequestManager /><ConsentAudit /></div>;
}
