"use client";
import { SegmentError } from "@/components/errors/SegmentError";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentError {...props} scope="clients" homeHref="/clients" />;
}
