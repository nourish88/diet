import { HttpError } from "@/lib/api/handler";

export function reportFilters(sp: URLSearchParams) {
  const search = (sp.get("search") ?? "").trim();
  if (search.length > 200) throw new HttpError("bad_request", "Arama en fazla 200 karakter olabilir.");
  const from = dateParameter(sp.get("from"));
  const to = dateParameter(sp.get("to"));
  if (from && to && from > to) throw new HttpError("bad_request", "Başlangıç tarihi bitişten sonra olamaz.");
  const format = sp.get("format");
  if (format && !["csv", "json"].includes(format)) throw new HttpError("bad_request", "Rapor biçimi csv veya json olmalıdır.");
  const page = positiveInteger(sp.get("page"), 1, 100000);
  const pageSize = positiveInteger(sp.get("pageSize"), 50, 100);
  return { search, from, to, format, page, pageSize };
}

function dateParameter(value: string | null): Date | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) || !Number.isFinite(new Date(value).getTime())) throw new HttpError("bad_request", "Tarih filtresi UTC ISO tarih olmalıdır.");
  return new Date(value);
}

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  if (!value) return fallback;
  if (!/^[1-9][0-9]*$/.test(value) || Number(value) > maximum) throw new HttpError("bad_request", "Geçersiz sayfalama değeri.");
  return Number(value);
}
