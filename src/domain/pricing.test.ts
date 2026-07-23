import { describe, expect, it } from "vitest";
import { calculateOfferPrice, priceMatches } from "./pricing";

const campaign = { pricingModel: "COURSE" as const, cash: 50000, card: 50000, note: 50000, maxCardInstallment: 6, minimumDownPayment: 10000 };

describe("central pricing engine", () => {
  it("calculates cash and card totals deterministically", () => {
    expect(calculateOfferPrice({ campaign, payment: "Nakit" }).total).toBe(50000);
    const card = calculateOfferPrice({ campaign, payment: "Kredi Kartı", rule: { name: "6 taksit", draft: { steps: [{ count: 6, enabled: true, rate: 12.8, bonus: 0 }] } } });
    expect(card.total).toBe(56400);
    expect(card.installmentText).toBe("6 taksit");
  });

  it("calculates note interest after down payment and balances last installment", () => {
    const note = calculateOfferPrice({ campaign, payment: "Senet", rule: { draft: { noteInstallment: 3, noteMode: "TOTAL_RATE", noteRate: 10, minimumDownPayment: 10000 } } });
    expect(note.total).toBe(54000);
    expect(note.financeSnapshot?.installmentAmounts).toEqual([14666, 14666, 14668]);
  });

  it("rejects disabled or incomplete finance choices and detects tampering", () => {
    expect(() => calculateOfferPrice({ campaign: { ...campaign, cardRules: false }, payment: "Kredi Kartı", rule: {} })).toThrow("CARD_DISABLED");
    expect(() => calculateOfferPrice({ campaign, payment: "Senet" })).toThrow("FINANCE_RULE_REQUIRED");
    expect(priceMatches(calculateOfferPrice({ campaign, payment: "Nakit" }), 49999)).toBe(false);
  });

  it("preserves the selected installment and applies discount after financing", () => {
    const result = calculateOfferPrice({
      campaign: {...campaign, consultantLimit: 5, managerLimit: 10},
      payment: "Kredi Kartı",
      installmentCount: 3,
      discountRate: 7.5,
      rule: {draft: {steps: [
        {count: 3, enabled: true, rate: 7.12, bonus: 0},
        {count: 6, enabled: true, rate: 12.46, bonus: 0},
      ]}},
    });
    expect(result.installmentText).toBe("3 taksit");
    expect(result.total).toBe(Math.round(Math.round(50000 * 1.0712) * 0.925));
    expect(result.discountAuthority).toBe("Müdür İnisiyatifi");
  });

  it("uses the same campaign discount for cash, card and note alternatives", () => {
    const discountedCampaign = {...campaign, consultantLimit: 5, managerLimit: 10};
    const cash = calculateOfferPrice({campaign: discountedCampaign, payment: "Nakit", discountRate: 5});
    const card = calculateOfferPrice({campaign: discountedCampaign, payment: "Kredi Kartı", installmentCount: 3, discountRate: 5, rule: {name: "Kart", draft: {steps: [{count: 3, enabled: true, rate: 10, bonus: 0}]}}});
    const note = calculateOfferPrice({campaign: discountedCampaign, payment: "Senet", installmentCount: 3, discountRate: 5, rule: {name: "Senet", draft: {noteInstallment: 3, noteMode: "TOTAL_RATE", noteRate: 10, minimumDownPayment: 10000}}});
    expect([cash.total, card.total, note.total]).toEqual([47500, 52250, 51300]);
    expect([cash.discountAuthority, card.discountAuthority, note.discountAuthority]).toEqual(["Danışman İndirimi", "Danışman İndirimi", "Danışman İndirimi"]);
  });

  it("routes a discount above the manager limit to founder approval without changing the total formula", () => {
    const result = calculateOfferPrice({
      campaign: {...campaign, consultantLimit: 5, managerLimit: 10},
      payment: "Nakit",
      discountRate: 12,
    });
    expect(result.total).toBe(44000);
    expect(result.discountAuthority).toBe("Kurucu Onayı");
  });
});
