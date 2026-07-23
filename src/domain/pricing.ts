export type PaymentMethod = "Nakit" | "Kredi Kartı" | "Senet";
export type PricingModel = "COURSE" | "HOURLY" | "FIXED";

export type CardStep = { count: number; enabled: boolean; rate: number; bonus: number };
export type FinanceDraft = {
  steps?: CardStep[];
  noteInstallment?: number;
  noteMode?: "CASH" | "TOTAL_RATE" | "MONTHLY_SIMPLE" | "MONTHLY_COMPOUND" | "FIXED";
  noteRate?: number;
  fixedTotal?: number;
  minimumDownPayment?: number;
  interestBase?: "FULL" | "AFTER_DOWNPAYMENT";
  firstInstallmentTiming?: "REGISTRATION" | "AFTER_30_DAYS" | "CUSTOM_DATE";
  firstInstallmentDate?: string;
};
export type PricingCampaign = {
  pricingModel?: PricingModel;
  cash: number;
  card: number;
  note: number;
  defaultHours?: number;
  hours?: number;
  maxCardInstallment?: number;
  minimumDownPayment?: number;
  cardRules?: boolean;
  noteRules?: boolean;
  consultantLimit?: number;
  managerLimit?: number;
};
export type PricingRule = { name?: string; detail?: string; draft?: FinanceDraft };
export type PricingResult = {
  payment: PaymentMethod;
  baseTotal: number;
  total: number;
  installmentText: string;
  financeRule?: string;
  financeSnapshot?: {
    method: string;
    installments: number;
    rate: number;
    downPayment: number;
    principal: number;
    financeDifference: number;
    total: number;
    firstInstallmentTiming: string;
    firstInstallmentDate?: string;
    installmentAmounts: number[];
  };
  discountRate: number;
  discountAuthority: "Standart" | "Danışman İndirimi" | "Müdür İnisiyatifi" | "Kurucu Onayı";
};

const positiveInt = (value: unknown, fallback = 1) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};
const rateFrom = (detail = "") => Number((detail.match(/%(\d+(?:[,.]\d+)?)/)?.[1] || "0").replace(",", "."));

export function calculateOfferPrice(input: {
  campaign: PricingCampaign;
  payment: PaymentMethod;
  rule?: PricingRule;
  installmentCount?: number;
  discountRate?: number;
}): PricingResult {
  const { campaign, payment, rule } = input;
  const discountRate = Math.max(0, Math.min(100, Number(input.discountRate) || 0));
  const discountAuthority: PricingResult["discountAuthority"] = discountRate <= 0
    ? "Standart"
    : discountRate <= Number(campaign.consultantLimit || 0)
      ? "Danışman İndirimi"
      : discountRate <= Number(campaign.managerLimit || 0)
        ? "Müdür İnisiyatifi"
        : "Kurucu Onayı";
  const discounted = (gross: number) => Math.round(gross * (1 - discountRate / 100));
  if (payment === "Kredi Kartı" && campaign.cardRules === false) throw new Error("CARD_DISABLED");
  if (payment === "Senet" && campaign.noteRules === false) throw new Error("NOTE_DISABLED");
  if (payment !== "Nakit" && !rule) throw new Error("FINANCE_RULE_REQUIRED");

  const unitBase = payment === "Nakit" ? campaign.cash : payment === "Kredi Kartı" ? campaign.card : campaign.note;
  if (!Number.isFinite(unitBase) || unitBase < 0) throw new Error("INVALID_BASE_PRICE");
  const multiplier = campaign.pricingModel === "HOURLY" ? positiveInt(campaign.defaultHours || campaign.hours) : 1;
  const baseTotal = Math.round(unitBase * multiplier);
  if (payment === "Nakit") return { payment, baseTotal, total: discounted(baseTotal), installmentText: "Peşin", discountRate, discountAuthority };

  if (payment === "Kredi Kartı") {
    const legacy = rule?.detail?.match(/(\d+)(?:\+(\d+))?\s*taksit.*?%(\d+(?:[,.]\d+)?)/i);
    const step = input.installmentCount
      ? rule?.draft?.steps?.find((item) => item.enabled && item.count === input.installmentCount && item.count <= (campaign.maxCardInstallment || 12))
      : rule?.draft?.steps?.filter((item) => item.enabled && item.count <= (campaign.maxCardInstallment || 12)).sort((a, b) => b.count - a.count)[0];
    const rate = step?.rate ?? Number((legacy?.[3] || "0").replace(",", "."));
    const installments = positiveInt(step?.count ?? input.installmentCount ?? legacy?.[1]);
    const bonus = Math.max(0, Number(step?.bonus ?? legacy?.[2] ?? 0));
    const total = Math.round(baseTotal * (1 + rate / 100));
    return {
      payment, baseTotal, total: discounted(total), financeRule: rule?.name,
      installmentText: `${installments}${bonus ? `+${bonus}` : ""} taksit`,
      discountRate, discountAuthority,
    };
  }

  const draft = rule?.draft;
  const installments = positiveInt(input.installmentCount ?? draft?.noteInstallment ?? rule?.detail?.match(/(\d+)\s*taksit/i)?.[1]);
  const rate = draft?.noteRate ?? rateFrom(rule?.detail);
  const downPayment = Math.min(baseTotal, Math.max(0, campaign.minimumDownPayment || 0, draft?.minimumDownPayment || 0));
  const principal = Math.max(0, baseTotal - downPayment);
  const interestBase = draft?.interestBase === "FULL" ? baseTotal : principal;
  const mode = draft?.noteMode || (rule?.detail?.includes("Peşin") ? "CASH" : "TOTAL_RATE");
  const interest = mode === "TOTAL_RATE" ? interestBase * rate / 100
    : mode === "MONTHLY_SIMPLE" ? interestBase * rate / 100 * installments
    : mode === "MONTHLY_COMPOUND" ? interestBase * (Math.pow(1 + rate / 100, installments) - 1) : 0;
  const total = mode === "FIXED" && draft ? Math.round(draft.fixedTotal || 0) : Math.round(downPayment + principal + interest);
  if (total < downPayment) throw new Error("INVALID_FIXED_TOTAL");
  const financed = total - downPayment;
  const regular = Math.floor(financed / installments);
  const amounts = Array.from({ length: installments }, (_, index) =>
    index === installments - 1 ? financed - regular * (installments - 1) : regular);
  const timing = draft?.firstInstallmentTiming || "AFTER_30_DAYS";
  if (timing === "CUSTOM_DATE" && !draft?.firstInstallmentDate) throw new Error("FIRST_INSTALLMENT_DATE_REQUIRED");
  const timingLabel = timing === "REGISTRATION" ? "kayıt tarihinde" : timing === "CUSTOM_DATE" ? draft?.firstInstallmentDate : "30 gün sonra";
  return {
    payment, baseTotal, total: discounted(total), financeRule: rule?.name,
    installmentText: `${installments} taksit${downPayment ? ` · ${downPayment.toLocaleString("tr-TR")} ₺ peşinat` : ""} · ilk taksit ${timingLabel}`,
    financeSnapshot: {
      method: mode, installments, rate, downPayment, principal,
      financeDifference: total - baseTotal, total,
      firstInstallmentTiming: timing, firstInstallmentDate: draft?.firstInstallmentDate,
      installmentAmounts: amounts,
    },
    discountRate, discountAuthority,
  };
}

export function priceMatches(expected: PricingResult, offeredTotal: unknown): boolean {
  return Number.isFinite(Number(offeredTotal)) && Math.abs(expected.total - Number(offeredTotal)) < 0.01;
}
