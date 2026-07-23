export type OfferStatus =
  | "Taslak"
  | "Onay bekliyor"
  | "Gönderildi"
  | "Görüntülendi"
  | "Kazanıldı"
  | "Kaybedildi"
  | "Revize edildi";

const transitions: Record<OfferStatus, readonly OfferStatus[]> = {
  Taslak: ["Gönderildi"],
  "Onay bekliyor": ["Taslak", "Gönderildi"],
  Gönderildi: ["Görüntülendi", "Kazanıldı", "Kaybedildi"],
  Görüntülendi: ["Kazanıldı", "Kaybedildi"],
  Kazanıldı: [],
  Kaybedildi: [],
  "Revize edildi": [],
};

export const terminalOfferStatuses: readonly OfferStatus[] = [
  "Kazanıldı",
  "Kaybedildi",
  "Revize edildi",
];

export function canTransitionOffer(from: string, to: string): boolean {
  return (transitions[from as OfferStatus] || []).includes(to as OfferStatus);
}

export type OfferActorRole = "Kurucu" | "Şube Müdürü" | "Müdür" | "Satış Danışmanı" | "Danışman";
export function validateOfferTransition(input: {
  from: string; to: string; role: OfferActorRole; archivedAt?: string; total?: number;
  phone?: string; hasCandidate?: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (input.archivedAt) return { ok: false, reason: "Arşivlenmiş teklifin durumu değiştirilemez" };
  if (!canTransitionOffer(input.from, input.to)) return { ok: false, reason: `${input.from} durumundan ${input.to} durumuna geçilemez` };
  if (input.to === "Taslak" && !["Kurucu", "Şube Müdürü", "Müdür"].includes(input.role)) return { ok: false, reason: "Teklifi onaylama yetkiniz bulunmuyor" };
  if (["Gönderildi", "Görüntülendi", "Kazanıldı"].includes(input.to) && (!input.total || input.total <= 0)) return { ok: false, reason: "Geçerli teklif tutarı zorunludur" };
  if (input.to === "Gönderildi" && !isValidTrMobile(input.phone)) return { ok: false, reason: "Paylaşım için geçerli telefon zorunludur" };
  if (input.to === "Kazanıldı" && !input.hasCandidate) return { ok: false, reason: "Misafir teklif kazanılmadan önce adaya bağlanmalıdır" };
  return { ok: true };
}

export type StoredOfferTransition = { id?: string; status?: string; archivedAt?: string; parentOfferId?: string; rootOfferId?: string };
export function validateOfferCollectionTransitions(previous: readonly StoredOfferTransition[], next: readonly StoredOfferTransition[]): string | null {
  const beforeById = new Map(previous.map((offer) => [String(offer.id || ""), offer]));
  for (const offer of next) {
    const before = beforeById.get(String(offer.id || ""));
    if (!before) {
      if (!["Taslak", "Onay bekliyor"].includes(String(offer.status))) return `Invalid initial status for offer ${offer.id}`;
      continue;
    }
    if (before.status === offer.status) continue;
    if (before.archivedAt) return `Archived offer status cannot change for ${offer.id}`;
    const validSupersede = offer.status === "Revize edildi" && next.some((revision) =>
      revision.parentOfferId === offer.id && (revision.rootOfferId || revision.parentOfferId) === (before.rootOfferId || before.id));
    if (!validSupersede && !canTransitionOffer(String(before.status), String(offer.status))) return `Invalid status transition for offer ${offer.id}`;
  }
  return null;
}

export function normalizeTrPhone(value = ""): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("5")) digits = `0${digits}`;
  return digits;
}

export function isValidTrMobile(value = ""): boolean {
  return /^05\d{9}$/.test(normalizeTrPhone(value));
}

export type VersionedOffer = {
  id: string;
  parentOfferId?: string;
  rootOfferId?: string;
  version?: number;
};

export function getOfferVersionChain<T extends VersionedOffer>(
  source: T,
  offers: readonly T[],
): T[] {
  const rootId = source.rootOfferId || source.id;
  return offers
    .filter((offer) => (offer.rootOfferId || offer.id) === rootId)
    .sort((a, b) => (a.version || 1) - (b.version || 1));
}

