import { describe, expect, it } from "vitest";
import { canTransitionOffer, getOfferVersionChain, isValidTrMobile, normalizeTrPhone, validateOfferCollectionTransitions, validateOfferTransition } from "./offers";

describe("offer lifecycle", () => {
  it("allows only approved status transitions", () => {
    expect(canTransitionOffer("Taslak", "Gönderildi")).toBe(true);
    expect(canTransitionOffer("Taslak", "Kazanıldı")).toBe(false);
    expect(canTransitionOffer("Kazanıldı", "Gönderildi")).toBe(false);
  });

  it("normalizes supported Turkish mobile formats", () => {
    expect(normalizeTrPhone("+90 532 123 45 67")).toBe("05321234567");
    expect(normalizeTrPhone("5321234567")).toBe("05321234567");
    expect(isValidTrMobile("0532 123 45 67")).toBe(true);
  });

  it("returns a sorted revision chain without unrelated copies", () => {
    const root = { id: "TKF-1", version: 1 };
    const revision = { id: "TKF-2", parentOfferId: "TKF-1", rootOfferId: "TKF-1", version: 2 };
    const copy = { id: "TKF-3", version: 1 };
    expect(getOfferVersionChain(revision, [revision, copy, root]).map((offer) => offer.id)).toEqual(["TKF-1", "TKF-2"]);
  });
});

describe("offer status decision engine", () => {
  it("enforces role, archive and required-field rules", () => {
    expect(validateOfferTransition({ from: "Onay bekliyor", to: "Taslak", role: "Satış Danışmanı" }).ok).toBe(false);
    expect(validateOfferTransition({ from: "Taslak", to: "Gönderildi", role: "Kurucu", archivedAt: "2026-01-01", total: 1, phone: "05321234567" }).ok).toBe(false);
    expect(validateOfferTransition({ from: "Taslak", to: "Gönderildi", role: "Kurucu", total: 50000, phone: "05321234567" }).ok).toBe(true);
    expect(validateOfferTransition({ from: "Gönderildi", to: "Kazanıldı", role: "Kurucu", total: 50000, hasCandidate: false }).ok).toBe(false);
  });
  it("validates server-side collection transitions and linked supersede", () => {
    const previous = [{ id: "TKF-1", status: "Taslak" }];
    expect(validateOfferCollectionTransitions(previous, [{ id: "TKF-1", status: "Kazanıldı" }])).toContain("Invalid status transition");
    expect(validateOfferCollectionTransitions(previous, [
      { id: "TKF-1", status: "Revize edildi" },
      { id: "TKF-2", status: "Taslak", parentOfferId: "TKF-1", rootOfferId: "TKF-1" },
    ])).toBeNull();
  });
});
