import { normalizeTrPhone, type VersionedOffer } from "./offers";

export type IntegrityCandidate = { id: number; name: string; phone?: string };
export type IntegrityOffer = VersionedOffer & {
  candidateId?: number;
  candidate: string;
  phone?: string;
  recordType?: "Misafir teklif" | "Kayıtlı aday";
};

export type IntegrityIssue = {
  severity: "error" | "warning";
  code: string;
  recordId: string;
  message: string;
};

export function inspectDataIntegrity(
  candidates: readonly IntegrityCandidate[],
  offers: readonly IntegrityOffer[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const offerIds = new Set(offers.map((offer) => offer.id));
  const phoneOwners = new Map<string, number[]>();

  for (const candidate of candidates) {
    const phone = normalizeTrPhone(candidate.phone);
    if (!phone) continue;
    phoneOwners.set(phone, [...(phoneOwners.get(phone) || []), candidate.id]);
  }
  for (const [phone, ids] of phoneOwners) {
    if (ids.length > 1) {
      issues.push({ severity: "error", code: "DUPLICATE_CANDIDATE_PHONE", recordId: ids.join(","), message: `${phone} telefonu birden fazla adaya bağlı.` });
    }
  }

  for (const offer of offers) {
    if (offer.candidateId && !candidateIds.has(offer.candidateId)) {
      issues.push({ severity: "error", code: "MISSING_CANDIDATE", recordId: offer.id, message: "Teklifin candidateId değeri mevcut bir adaya bağlı değil." });
    }
    if (offer.recordType === "Kayıtlı aday" && !offer.candidateId) {
      issues.push({ severity: "error", code: "REGISTERED_WITHOUT_ID", recordId: offer.id, message: "Kayıtlı aday teklifi candidateId içermiyor." });
    }
    if (!offer.recordType && !offer.candidateId) {
      issues.push({ severity: "warning", code: "LEGACY_UNLINKED_OFFER", recordId: offer.id, message: "Eski teklifin aday bağlantısı belirsiz; otomatik eşleştirme yapılmadı." });
    }
    if (offer.recordType === "Misafir teklif" && !normalizeTrPhone(offer.phone)) {
      issues.push({ severity: "warning", code: "GUEST_WITHOUT_PHONE", recordId: offer.id, message: "Misafir teklifin telefon snapshot'ı eksik." });
    }
    if (offer.parentOfferId && !offerIds.has(offer.parentOfferId)) {
      issues.push({ severity: "error", code: "MISSING_PARENT_OFFER", recordId: offer.id, message: "Revizyonun kaynak teklifi bulunamadı." });
    }
    if (offer.parentOfferId && (!offer.version || offer.version < 2)) {
      issues.push({ severity: "error", code: "INVALID_REVISION_VERSION", recordId: offer.id, message: "Revizyon sürümü 2 veya daha büyük olmalı." });
    }
  }
  return issues;
}

