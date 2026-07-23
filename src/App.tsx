import { useEffect, useState, type ReactNode } from "react";
import { api, auth, type AuthUser } from "@appdeploy/client";
import {
  BarChart3,
  Archive,
  Bell,
  Check,
  Download,
  FileText,
  Info,
  ChevronDown,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  LogIn,
  LogOut,
  Users,
  Trash2,
  Target,
  X,
} from "lucide-react";
import PricingManagement from "./PricingManagement";
import UserManagement from "./UserManagement";
import TargetManagement, { type TargetPlan } from "./TargetManagement";
import { downloadLocalRecovery, downloadUmayData, UMAY_AUTH_CHANGED_EVENT, UMAY_DATA_ERROR_EVENT, useUmayCollection } from "./services/umayData";
import {
  canTransitionOffer,
  getOfferVersionChain,
  isValidTrMobile,
  normalizeTrPhone,
  terminalOfferStatuses,
} from "./domain/offers";
import { isValidMembership, uiRole, type UmayMembership } from "./domain/membership";
import { archiveRecord, restoreRecord } from "./domain/archive";
import { calculateOfferPrice } from "./domain/pricing";
type Role = "Kurucu" | "Şube Müdürü" | "Satış Danışmanı";
type Page = "dashboard" | "candidates" | "offers" | "campaigns" | "analytics" | "targets";
type Tab = "Genel" | "Timeline" | "Görevler" | "Teklifler" | "Aile" | "Notlar";
type Candidate = {
  id: number;
  name: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  first: string;
  firstMeetingAt?: string;
  program: string;
  level?: string;
  course: number;
  campaign?: string;
  source: string;
  branch: string;
  owner: string;
  arrival: string;
  appointment: string;
  status: string;
  offer: string;
  agreement: string;
  collection: string;
  prob: number;
  last: string;
  next: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone1?: string;
  guardianPhone2?: string;
  district?: string;
  createdAt?: string;
  createdBy?: string;
  ownerId?: string;
  archivedAt?: string;
  archivedBy?: string;
};
type NewCandidateForm = {
  firstName: string;
  lastName: string;
  phone: string;
  phone2: string;
  email?: string;
  address?: string;
  program: string;
  level: string;
  campaign: string;
  source: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone1: string;
  guardianPhone2: string;
  district: string;
};
type Campaign = {
  id: number;
  name: string;
  program: string;
  branch: string;
  list: number;
  cash: number;
  card: number;
  note: number;
  buy: number;
  gift: number;
  hours: number;
  bookGift: boolean;
  validity: number;
  status: "Aktif" | "Taslak";
  start?: string;
  end?: string;
  cardRules?: boolean;
  noteRules?: boolean;
  maxCardInstallment?: number;
  maxNoteInstallment?: number;
  minimumDownPayment?: number;
  consultantLimit?: number;
  managerLimit?: number;
  internalNote?: string;
  archived?: boolean;
  pricingModel?: "COURSE" | "HOURLY" | "FIXED";
  defaultHours?: number;
};
type Education = {
  id: number;
  name: string;
  category: string;
  courseHours: number;
  levels: string;
  active: boolean;
  pricingModel: "COURSE" | "HOURLY" | "FIXED";
};
type CardStep = {
  count: number;
  enabled: boolean;
  rate: number;
  bonus: number;
};
type FinanceDraft = {
  start: string;
  end: string;
  steps: CardStep[];
  noteInstallment: number;
  noteMode:
    "CASH" | "TOTAL_RATE" | "MONTHLY_SIMPLE" | "MONTHLY_COMPOUND" | "FIXED";
  noteRate: number;
  fixedTotal: number;
  minimumDownPayment: number;
  interestBase: "FULL" | "AFTER_DOWNPAYMENT";
  firstInstallmentTiming?: "REGISTRATION" | "AFTER_30_DAYS" | "CUSTOM_DATE";
  firstInstallmentDate?: string;
};
type FinanceRule = {
  id: number;
  name: string;
  branch: string;
  period: string;
  detail: string;
  active: boolean;
  draft?: FinanceDraft;
};
type PaymentMethod = "Nakit" | "Kredi Kartı" | "Senet";
type OfferAlternative = {
  payment: PaymentMethod;
  total: number;
  financeRule?: string;
  installmentText: string;
  installments?: number;
};
type OfferAlternativeDraft = {
  payment: PaymentMethod;
  financeRuleId?: number;
  installmentCount?: number;
};
type FinanceSnapshot = {
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
type Offer = {
  id: string;
  candidate: string;
  candidateId?: number;
  phone?: string;
  source?: string;
  recordType?: "Misafir teklif" | "Kayıtlı aday";
  owner: string;
  ownerId?: string;
  branch: string;
  program: string;
  campaign: string;
  total: number;
  status: string;
  date: string;
  createdAt?: string;
  originalCreatedAt?: string;
  revisedAt?: string;
  sentAt?: string;
  expiry: string;
  payment: string;
  financeRule?: string;
  installmentText?: string;
  financeSnapshot?: FinanceSnapshot;
  guest?: boolean;
  alternatives?: OfferAlternative[];
  bookGift?: boolean;
  parentOfferId?: string;
  rootOfferId?: string;
  version?: number;
  registrationComplete?: boolean;
  registeredAt?: string;
  paidCourses?: number;
  giftCourses?: number;
  discountRate?: number;
  discountAuthority?: "Standart" | "Danışman İndirimi" | "Müdür İnisiyatifi" | "Kurucu Onayı";
  archivedAt?: string;
  archivedBy?: string;
};
type OfferShare = {
  id: string;
  offerId: string;
  offerVersion: number;
  channel: "WhatsApp";
  recipient: string;
  sharedAt: string;
  sharedBy: string;
  result: "Başlatıldı";
};
const money = (n: number) => new Intl.NumberFormat("tr-TR").format(n) + " TL";
const normalizePhone = normalizeTrPhone;
const validTrPhone = isValidTrMobile;
const formatPhone = (value = "") => {
  const d = normalizePhone(value);
  return d.length === 11
    ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
    : value;
};
const formatDateTime = (value?: string) => {
  const date = parseStoredDate(value);
  return date ? date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
};
const sourceOptions = [
  "WhatsApp",
  "Google",
  "Instagram",
  "Sosyal Medya",
  "Telefon",
  "Referans",
  "Şubeye Geldi",
  "Kurumsal",
  "Diğer",
];
const parseStoredDate = (value?: string) => {
  if (!value || value === "—") return undefined;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const match = value.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/,
  );
  if (!match) return undefined;
  return new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4] || 0),
    Number(match[5] || 0),
  );
};
const inPeriod = (value: string | undefined, period: string) => {
  if (period === "Tüm Tarihler") return true;
  const date = parseStoredDate(value);
  if (!date) return false;
  const now = new Date(),
    startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end = new Date(startOfToday);
  if (period === "Bugün") {
    end.setDate(end.getDate() + 1);
    return date >= startOfToday && date < end;
  }
  if (period === "Bu Hafta") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  }
  if (period === "Bu Ay") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1),
      finish = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return date >= start && date < finish;
  }
  if (period === "Geçen Ay") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1),
      finish = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start && date < finish;
  }
  const quarter = Math.floor(now.getMonth() / 3) * 3,
    start = new Date(now.getFullYear(), quarter, 1),
    finish = new Date(now.getFullYear(), quarter + 3, 1);
  return date >= start && date < finish;
};
const people = [
  {
    name: "Ayşenur Kaya",
    branch: "İzmit",
    collection: 2840000,
    revenue: 3210000,
    sales: 38,
    courses: 91,
    rate: 84,
  },
  {
    name: "Mert Yılmaz",
    branch: "İzmit",
    collection: 2615000,
    revenue: 2970000,
    sales: 35,
    courses: 82,
    rate: 79,
  },
  {
    name: "Ece Arslan",
    branch: "Körfez",
    collection: 2380000,
    revenue: 2740000,
    sales: 31,
    courses: 74,
    rate: 76,
  },
  {
    name: "Selin Koç",
    branch: "Körfez",
    collection: 1970000,
    revenue: 2280000,
    sales: 27,
    courses: 63,
    rate: 69,
  },
];
const names = [
  "Elif Yıldız",
  "Kerem Aksoy",
  "Zeynep Kara",
  "Berk Aydın",
  "Mina Çelik",
  "Arda Demir",
  "Ece Koç",
  "Doruk Şen",
  "İrem Aktaş",
  "Can Özdemir",
  "Yağmur Eren",
  "Emir Kaya",
  "Duru Aslan",
  "Mert Çetin",
  "Azra Yılmaz",
  "Efe Arslan",
  "Nehir Acar",
  "Kaan Polat",
  "Ada Güneş",
  "Bora Kılıç",
  "Lina Kurt",
  "Deniz Uçar",
  "Sude Ergin",
  "Ozan Tekin",
];
const candidateSeed: Candidate[] = names.map((name, i) => {
  const owners = ["Ayşenur Kaya", "Mert Yılmaz", "Ece Arslan", "Selin Koç"];
  const branches = ["İzmit", "İzmit", "Körfez", "Körfez"];
  const programs = ["Junior", "Genel İngilizce", "Teenage", "Almanca"];
  const sources = ["WhatsApp", "Google", "Sosyal Medya", "Telefon"];
  const statuses = [
    "Karar bekleniyor",
    "Teklif gönderildi",
    "Randevu planlandı",
    "Yeni aday",
  ];
  return {
    id: i + 1,
    name,
    phone:
      "05" +
      (32 + (i % 6)) +
      " 555 " +
      String(1000 + i).slice(0, 2) +
      " " +
      String(1000 + i).slice(2),
    first: 19 - (i % 15) + ".07.2026",
    program: programs[i % 4],
    course: (i % 4) + 1,
    source: sources[i % 4],
    branch: branches[i % 4],
    owner: owners[i % 4],
    arrival: i % 3 === 0 ? "19.07.2026" : "—",
    appointment: i % 4 === 0 ? "Bugün 18:30" : "—",
    status: statuses[i % 4],
    offer: i % 3 === 0 ? money(54000 + i * 1100) : "—",
    agreement: i % 7 === 0 ? "Onaylandı" : "—",
    collection: i % 7 === 0 ? money(15000 + i * 500) : "0 TL",
    prob: 48 + ((i * 7) % 45),
    last: i % 2 === 0 ? "2 saat önce" : "Dün",
    next: i % 3 === 0 ? "Bugün ara" : "Takip planla",
  };
});
const campaignSeed: Campaign[] = [
  {
    id: 1,
    name: "2+1 TEMMUZ KAMPANYASI",
    program: "Genel İngilizce",
    branch: "Tüm Şubeler",
    list: 93000,
    cash: 54219,
    card: 65063,
    note: 54219,
    buy: 2,
    gift: 1,
    hours: 360,
    bookGift: true,
    validity: 2,
    status: "Aktif",
  },
  {
    id: 2,
    name: "JUNIOR YENİ DÖNEM",
    program: "Junior",
    branch: "İzmit",
    list: 79900,
    cash: 55900,
    card: 61900,
    note: 57900,
    buy: 2,
    gift: 2,
    hours: 240,
    bookGift: true,
    validity: 3,
    status: "Aktif",
  },
  {
    id: 3,
    name: "TEENAGE ERKEN KAYIT",
    program: "Teenage",
    branch: "Tüm Şubeler",
    list: 84900,
    cash: 59900,
    card: 65900,
    note: 61900,
    buy: 2,
    gift: 1,
    hours: 240,
    bookGift: true,
    validity: 2,
    status: "Aktif",
  },
];
const educationSeed: Education[] = [
  {
    id: 1,
    name: "Genel İngilizce",
    category: "Yetişkin",
    courseHours: 120,
    levels: "A1–C2",
    active: true,
    pricingModel: "COURSE",
  },
  {
    id: 2,
    name: "Junior",
    category: "Çocuk",
    courseHours: 120,
    levels: "Junior 1–4",
    active: true,
    pricingModel: "COURSE",
  },
  {
    id: 3,
    name: "Teenage",
    category: "Çocuk",
    courseHours: 120,
    levels: "Teenage 1–4",
    active: true,
    pricingModel: "COURSE",
  },
  {
    id: 4,
    name: "Almanca",
    category: "Yetişkin",
    courseHours: 120,
    levels: "A1–C2",
    active: true,
    pricingModel: "COURSE",
  },
  {
    id: 5,
    name: "YDT / YKS-DİL",
    category: "Sınav",
    courseHours: 300,
    levels: "Tek program",
    active: true,
    pricingModel: "COURSE",
  },
];
const cardRuleSeed: FinanceRule[] = [
  {
    id: 1,
    name: "Garanti BBVA · Bonus",
    branch: "Tüm Şubeler",
    period: "Temmuz 2026",
    detail: "2+5 taksit · %4,2",
    active: true,
  },
  {
    id: 2,
    name: "Yapı Kredi · World",
    branch: "İzmit",
    period: "Temmuz 2026",
    detail: "3+3 taksit · %6,1",
    active: true,
  },
  {
    id: 3,
    name: "Akbank · Axess",
    branch: "Körfez",
    period: "Temmuz 2026",
    detail: "6 taksit · %12,8",
    active: true,
  },
];
const noteRuleSeed: FinanceRule[] = [
  {
    id: 11,
    name: "Peşin Fiyatına 2 Taksit",
    branch: "Tüm Şubeler",
    period: "01–31 Temmuz",
    detail: "2 taksit · Peşin fiyat",
    active: true,
  },
  {
    id: 12,
    name: "Haftaya Özel Peşin Fiyatına 4 Taksit",
    branch: "İzmit",
    period: "20–27 Temmuz",
    detail: "4 taksit · Peşin fiyat",
    active: true,
  },
  {
    id: 13,
    name: "8 Taksit Standart Senet",
    branch: "Körfez",
    period: "01–31 Temmuz",
    detail: "8 taksit · %14",
    active: true,
  },
];
const offerSeed: Offer[] = [
  {
    id: "TKF-260719-101",
    candidate: "Kerem Aksoy",
    owner: "Mert Yılmaz",
    branch: "İzmit",
    program: "Genel İngilizce",
    campaign: "2+1 TEMMUZ KAMPANYASI",
    total: 101063,
    status: "Görüntülendi",
    date: "19.07.2026",
    expiry: "21.07.2026 18:00",
    payment: "Kredi Kartı",
  },
  {
    id: "TKF-260719-102",
    candidate: "Elif Yıldız",
    owner: "Ayşenur Kaya",
    branch: "İzmit",
    program: "Junior",
    campaign: "JUNIOR YENİ DÖNEM",
    total: 61900,
    status: "Onay bekliyor",
    date: "19.07.2026",
    expiry: "22.07.2026 18:00",
    payment: "Kredi Kartı",
  },
  {
    id: "TKF-260718-098",
    candidate: "Zeynep Kara",
    owner: "Ece Arslan",
    branch: "Körfez",
    program: "Teenage",
    campaign: "TEENAGE ERKEN KAYIT",
    total: 65900,
    status: "Kazanıldı",
    date: "18.07.2026",
    expiry: "20.07.2026 18:00",
    payment: "Kredi Kartı",
  },
  {
    id: "TKF-260717-091",
    candidate: "Mina Çelik",
    owner: "Ayşenur Kaya",
    branch: "İzmit",
    program: "Genel İngilizce",
    campaign: "2+1 TEMMUZ KAMPANYASI",
    total: 54219,
    status: "Revize edildi",
    date: "17.07.2026",
    expiry: "19.07.2026 18:00",
    payment: "Nakit",
  },
];
const Kpi = ({
  title,
  value,
  dark = false,
  onClick,
}: {
  title: string;
  value: string;
  dark?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 ${dark ? "bg-[#17191c] text-white" : "bg-white"}`}
  >
    <p
      className={`text-[9px] uppercase tracking-[.12em] ${dark ? "text-white/40" : "text-black/35"}`}
    >
      {title}
    </p>
    <p className="mt-2 text-[23px] font-semibold">{value}</p>
  </button>
);
const emptyCandidate: NewCandidateForm = {
  firstName: "",
  lastName: "",
  phone: "",
  phone2: "",
  program: "",
  level: "",
  campaign: "",
  source: "",
  guardianName: "",
  guardianRelation: "",
  guardianPhone1: "",
  guardianPhone2: "",
  district: "",
};
function App() {
  const [role, setRole] = useState<Role>("Kurucu"),
    [, setAuthUser] = useState<AuthUser | null>(null),
    [membership, setMembership] = useState<UmayMembership | null>(null),
    [authBusy, setAuthBusy] = useState(false),
    [authResolved, setAuthResolved] = useState(false),
    [authMessage, setAuthMessage] = useState(""),
    [manageUsers, setManageUsers] = useState(false),
    [page, setPage] = useState<Page>("dashboard"),
    [candidateList, setCandidateList] = useUmayCollection(
      "candidates",
      "umayv2.candidates",
      candidateSeed,
    ),
    [newCandidate, setNewCandidate] = useState(false),
    [candidateForm, setCandidateForm] =
      useState<NewCandidateForm>(emptyCandidate),
    [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null),
    [mobile, setMobile] = useState(false),
    [selected, setSelected] = useState<Candidate | null>(null),
    [tab, setTab] = useState<Tab>("Genel"),
    [query, setQuery] = useState(""),
    [campaigns, setCampaigns] = useUmayCollection(
      "campaigns",
      "umayv2.campaigns",
      campaignSeed,
    ),
    [education] = useUmayCollection(
      "education",
      "umayv2.education",
      educationSeed,
    ),
    [cardRules] = useUmayCollection(
      "cardRules",
      "umayv2.cardRules",
      cardRuleSeed,
    ),
    [noteRules] = useUmayCollection(
      "noteRules",
      "umayv2.noteRules",
      noteRuleSeed,
    ),
    [offers, setOffers] = useUmayCollection(
      "offers",
      "umayv2.offers",
      offerSeed,
    ),
    [targetPlans] = useUmayCollection<TargetPlan[]>(
      "targetPlans",
      "umayv2.targetPlans",
      [],
    ),
    [offerShares, setOfferShares] = useUmayCollection<OfferShare[]>(
      "offerShares",
      "umayv2.offerShares",
      [],
    ),
    [completedTasks, setCompletedTasks] = useUmayCollection<string[]>(
      "completedTasks",
      "umayv2.completedTasks",
      [],
    ),
    [candidateNotes, setCandidateNotes] = useUmayCollection<
      Record<string, string>
    >("candidateNotes", "umayv2.candidateNotes", {}),
    [noteDraft, setNoteDraft] = useState(""),
    [wizard, setWizard] = useState(false),
    [revisionSource, setRevisionSource] = useState<Offer | null>(null),
    [detailOffer, setDetailOffer] = useState<Offer | null>(null),
    [registrationOffer, setRegistrationOffer] = useState<Offer | null>(null),
    [registrationCandidate, setRegistrationCandidate] = useState<Candidate | null>(null),
    [registrationDate, setRegistrationDate] = useState(''),
    [registrationPaidCourses, setRegistrationPaidCourses] = useState(0),
    [registrationGiftCourses, setRegistrationGiftCourses] = useState(0),
    [registrationDownPayment, setRegistrationDownPayment] = useState(0),
    [registrationSource, setRegistrationSource] = useState(''),
    [pendingDelete, setPendingDelete] = useState<{kind: "candidate"; item: Candidate} | {kind: "offer"; item: Offer} | null>(null),
    [archiveOpen, setArchiveOpen] = useState(false),
    [rowActionMenu, setRowActionMenu] = useState<({kind: 'candidate'; item: Candidate} | {kind: 'offer'; item: Offer}) & {left: number; top: number} | null>(null),
    [wc, setWc] = useState<Candidate | undefined>(),
    [program, setProgram] = useState(""),
    [campaignId, setCampaignId] = useState<number | undefined>(),
    [financeRuleId, setFinanceRuleId] = useState<number | undefined>(),
    [installmentCount, setInstallmentCount] = useState<number | undefined>(),
    [payment, setPayment] = useState<PaymentMethod>("Nakit"),
    [guestName, setGuestName] = useState(""),
    [guestPhone, setGuestPhone] = useState(""),
    [guestSource, setGuestSource] = useState(""),
    [conversionOffer, setConversionOffer] = useState<Offer | null>(null),
    [conversionPhone, setConversionPhone] = useState(""),
    [conversionSource, setConversionSource] = useState(""),
    [alternatives, setAlternatives] = useState<OfferAlternativeDraft[]>([]),
    [validity, setValidity] = useState(2),
    [bookGift, setBookGift] = useState(true),
    [extraDiscountRate, setExtraDiscountRate] = useState(0),
    [newCampaign, setNewCampaign] = useState(false),
    [toast, setToast] = useState(""),
    [period, setPeriod] = useState("Bu Ay"),
    [offerPeriod, setOfferPeriod] = useState("Bu Ay"),
    [branchF, setBranchF] = useState("Tüm Şubeler"),
    [offerBranchF, setOfferBranchF] = useState("Tüm Şubeler"),
    [ownerF, setOwnerF] = useState("Tüm Danışmanlar"),
    [offerOwnerF, setOfferOwnerF] = useState("Tüm Danışmanlar"),
    [programF, setProgramF] = useState("Tüm Programlar"),
    [offerProgramF, setOfferProgramF] = useState("Tüm Programlar"),
    [statusF, setStatusF] = useState("Tüm Durumlar"),
    [offerStatusF, setOfferStatusF] = useState("Tüm Durumlar"),
    [offerQuery, setOfferQuery] = useState(""),
    [sourceF, setSourceF] = useState("Tüm Kaynaklar"),
    [offerSourceF, setOfferSourceF] = useState("Tüm Kaynaklar"),
    [offerRecordTypeF, setOfferRecordTypeF] = useState("Tüm Kayıt Tipleri"),
    [paymentF, setPaymentF] = useState("Tüm Ödemeler"),
    [campaignF, setCampaignF] = useState("Tüm Kampanyalar"),
    [campaignStatusF, setCampaignStatusF] = useState("Tüm Durumlar"),
    [expandedFilters, setExpandedFilters] = useState<string | null>(null),
    [openKpiInfo, setOpenKpiInfo] = useState<string | null>(null);
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 5000);
  };
  const loadMembership = async (user: AuthUser) => {
    setAuthUser(user);
    try {
      const response = await api.get("/api/auth/me");
      const value = {...response.data, active: true};
      if (!isValidMembership(value)) throw new Error("invalid-membership");
      setMembership(value);
      setRole(uiRole(value.role));
      window.dispatchEvent(new Event(UMAY_AUTH_CHANGED_EVENT));
      setAuthMessage("");
      return value;
    } catch {
      setMembership(null);
      setAuthMessage(user.email === "turkozerdem@gmail.com"
        ? "Kurucu hesabınız doğrulandı. Aktivasyonu tamamlayabilirsiniz."
        : "Bu Google hesabı için aktif UMAY yetkisi bulunmuyor.");
      return null;
    }
  };
  useEffect(() => {
    if (!auth.isSignedIn()) { setAuthResolved(true); return; }
    void auth.getUser().then(async (user) => { if (user) await loadMembership(user); }).catch(() => {
      setAuthMessage("Oturum bilgisi doğrulanamadı. Yeniden giriş yapabilirsiniz.");
    }).finally(() => setAuthResolved(true));
  }, []);
  const signInFounder = async () => {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const {user} = await auth.signIn({scope:"openid email profile offline_access"});
      if (user.email === "turkozerdem@gmail.com") await api.post("/api/auth/bootstrap-founder", {});
      const linked=await loadMembership(user);
      setAuthResolved(true);
      notify(linked ? "Google hesabı doğrulandı" : "Bu hesap için aktif UMAY yetkisi bulunmuyor");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as {code?:unknown}).code) : "";
      setAuthMessage(code === "popup_blocked"
        ? "Giriş penceresi engellendi. Tarayıcınızda açılır pencerelere izin verin."
        : code === "popup_closed"
          ? "Google giriş işlemi tamamlanmadı."
          : "Kurucu hesabı doğrulanamadı. Lütfen yeniden deneyin.");
    } finally {
      setAuthBusy(false);
    }
  };
  const signOut = async () => {
    await auth.signOut();
    setAuthUser(null);
    setMembership(null);
    setAuthResolved(true);
    setAuthMessage("");
    notify("Oturum kapatıldı");
  };
  useEffect(() => {
    const handleDataError = (event: Event) => {
      const operation=(event as CustomEvent<{operation?:string}>).detail?.operation;
      notify(operation==='conflict-or-save'
        ? "Merkezi kayıt tamamlanamadı veya başka bir kullanıcının değişikliğiyle çakıştı. Çalışmanız bu cihazda kurtarma kopyası olarak korundu; sayfayı yenilemeden önce yöneticinize bildirin."
        : "Merkezi veri bağlantısı başarısız. Değişiklik bu cihazda korundu; bağlantıyı kontrol edip tekrar deneyin.");
    };
    window.addEventListener(UMAY_DATA_ERROR_EVENT, handleDataError);
    return () => window.removeEventListener(UMAY_DATA_ERROR_EVENT, handleDataError);
  }, []);
  const currentUserName = membership?.name || "";
  const currentUserId = membership?.userId || "";
  const currentBranch = membership?.branch === "Tüm Şubeler" ? "İzmit" : (membership?.branch || "İzmit");
  const scopeCandidates =
    role === "Kurucu"
      ? candidateList.filter((c) => !c.archivedAt)
      : role === "Şube Müdürü"
        ? candidateList.filter((c) => !c.archivedAt && c.branch === currentBranch)
        : candidateList.filter((c) => !c.archivedAt && (c.ownerId === currentUserId || (!c.ownerId && c.owner === currentUserName)));
  const effectiveBranch = role === "Kurucu" ? branchF : currentBranch;
  const effectiveOfferBranch = role === "Kurucu" ? offerBranchF : currentBranch;
  const visible = scopeCandidates.filter(
    (c) =>
      inPeriod(c.firstMeetingAt || (c.first && c.first !== "—" ? c.first : undefined) || c.createdAt, period) &&
      (effectiveBranch === "Tüm Şubeler" || c.branch === effectiveBranch) &&
      (ownerF === "Tüm Danışmanlar" || c.owner === ownerF) &&
      (programF === "Tüm Programlar" || c.program === programF) &&
      (statusF === "Tüm Durumlar" || c.status === statusF) &&
      (sourceF === "Tüm Kaynaklar" || c.source === sourceF) &&
      (c.name + " " + c.phone)
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  const scopeOffers =
    role === "Kurucu"
      ? offers.filter((o) => !o.archivedAt)
      : role === "Şube Müdürü"
        ? offers.filter((o) => !o.archivedAt && o.branch === currentBranch)
        : offers.filter((o) => !o.archivedAt && (o.ownerId === currentUserId || (!o.ownerId && o.owner === currentUserName)));
  const archivedCandidates = candidateList.filter((candidate) => candidate.archivedAt && (role === "Kurucu" || candidate.branch === currentBranch));
  const archivedOffers = offers.filter((offer) => offer.archivedAt && (role === "Kurucu" || offer.branch === currentBranch));
  const visibleOffers = scopeOffers.filter(
    (o) =>
      inPeriod(o.sentAt || o.createdAt || o.date, offerPeriod) &&
      (effectiveOfferBranch === "Tüm Şubeler" || o.branch === effectiveOfferBranch) &&
      (offerOwnerF === "Tüm Danışmanlar" || o.owner === offerOwnerF) &&
      (offerProgramF === "Tüm Programlar" || o.program === offerProgramF) &&
      (offerStatusF === "Tüm Durumlar" || (offerStatusF === "Aktif Teklifler" ? !o.registrationComplete && !["Kazanıldı", "Kaybedildi", "Revize edildi"].includes(o.status) : o.status === offerStatusF)) &&
      (paymentF === "Tüm Ödemeler" || o.payment === paymentF) &&
      (campaignF === "Tüm Kampanyalar" || o.campaign === campaignF) &&
      (offerSourceF === "Tüm Kaynaklar" || o.source === offerSourceF) &&
      (offerRecordTypeF === "Tüm Kayıt Tipleri" ||
        o.recordType === offerRecordTypeF) &&
      (!offerQuery ||
        (o.candidate + " " + o.id + " " + (o.phone || "") + " " + normalizePhone(o.phone || ""))
          .toLocaleLowerCase("tr")
          .includes(offerQuery.toLocaleLowerCase("tr").replace(/\s/g, "")) ||
        (o.candidate + " " + o.id + " " + (o.phone || ""))
          .toLocaleLowerCase("tr")
          .includes(offerQuery.toLocaleLowerCase("tr"))),
  );
  const latestVisibleOffers = visibleOffers.filter((offer) => !scopeOffers.some((next) => next.parentOfferId === offer.id));
  const activeVisibleOffers = latestVisibleOffers.filter((offer) => !offer.registrationComplete && !["Kazanıldı", "Kaybedildi", "Revize edildi"].includes(offer.status));
  const registeredVisibleOffers = latestVisibleOffers.filter((offer) => offer.registrationComplete);
  const offerCandidateCount = new Set(latestVisibleOffers.map((offer) => offer.candidateId ? `candidate:${offer.candidateId}` : `guest:${normalizePhone(offer.phone || "") || offer.candidate.toLocaleLowerCase("tr-TR")}`)).size;
  const offerTotalValue = latestVisibleOffers.reduce((sum, offer) => sum + Number(offer.total || 0), 0);
  const registrationRevenue = registeredVisibleOffers.reduce((sum, offer) => sum + Number(offer.total || 0), 0);
  const offerConversionRate = latestVisibleOffers.length ? Math.round(registeredVisibleOffers.length / latestVisibleOffers.length * 1000) / 10 : 0;
  const programBreakdown = Array.from(new Set(latestVisibleOffers.map((offer) => offer.program))).map((program) => ({program, count: latestVisibleOffers.filter((offer) => offer.program === program).length})).sort((a, b) => b.count - a.count);
  const topProgram = programBreakdown[0];
  const discountCounts = latestVisibleOffers.reduce((counts, offer) => ({...counts, [offer.discountAuthority || "Standart"]: (counts[offer.discountAuthority || "Standart"] || 0) + 1}), {} as Record<string, number>);
  const dashboardNow = new Date();
  const dashboardDate = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dashboardNow);
  const dashboardDateLabel = dashboardDate.replace(
    /\p{L}+/gu,
    (word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1),
  );
  const todayExpiryPrefix = new Intl.DateTimeFormat("tr-TR").format(dashboardNow);
  const followUpOffers = visibleOffers.filter(
    (o) => !["Kazanıldı", "Taslak", "Revize edildi"].includes(o.status),
  );
  const expiringTodayCount = followUpOffers.filter(
    (o) => Boolean(o.expiry?.startsWith(todayExpiryPrefix)),
  ).length;
  const pendingApprovalCount = visibleOffers.filter(
    (o) => o.status === "Onay bekliyor",
  ).length;
  const sharedOfferCount = visibleOffers.filter(
    (o) =>
      Boolean(o.sentAt) ||
      ["Gönderildi", "Görüntülendi", "Revize edildi", "Kazanıldı"].includes(
        o.status,
      ),
  ).length;
  const viewedOfferCount = visibleOffers.filter((o) =>
    ["Görüntülendi", "Revize edildi", "Kazanıldı"].includes(o.status),
  ).length;
  const revisedOfferCount = visibleOffers.filter(
    (o) => Boolean(o.parentOfferId) || o.status === "Revize edildi",
  ).length;
  const wonOfferCount = visibleOffers.filter(
    (o) => o.status === "Kazanıldı",
  ).length;
  const offerFunnel: [string, number, number][] = [
    ["Oluşturuldu", visibleOffers.length, visibleOffers.length ? 100 : 0],
    [
      "Paylaşıldı",
      sharedOfferCount,
      visibleOffers.length
        ? Math.round((sharedOfferCount / visibleOffers.length) * 100)
        : 0,
    ],
    [
      "Görüntülendi",
      viewedOfferCount,
      visibleOffers.length
        ? Math.round((viewedOfferCount / visibleOffers.length) * 100)
        : 0,
    ],
    [
      "Revize",
      revisedOfferCount,
      visibleOffers.length
        ? Math.round((revisedOfferCount / visibleOffers.length) * 100)
        : 0,
    ],
    [
      "Kazanıldı",
      wonOfferCount,
      visibleOffers.length
        ? Math.round((wonOfferCount / visibleOffers.length) * 100)
        : 0,
    ],
  ];
  const visibleCampaigns = campaigns.filter(
    (c) =>
      (role === "Kurucu" ||
        c.branch === "Tüm Şubeler" ||
        c.branch === currentBranch) &&
      (effectiveBranch === "Tüm Şubeler" ||
        c.branch === "Tüm Şubeler" ||
        c.branch === effectiveBranch) &&
      (programF === "Tüm Programlar" || c.program === programF) &&
      (campaignStatusF === "Tüm Durumlar" || c.status === campaignStatusF) &&
      (!query ||
        c.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))),
  );
  const today = new Date().toISOString().slice(0, 10),
    offerName = wc?.name || guestName.trim(),
    offerBranch =
      wc?.branch ||
      (role === "Kurucu" && branchF !== "Tüm Şubeler" ? branchF : currentBranch);
  const active = campaigns.filter(
    (c) =>
      ((c.status === "Aktif" &&
        !c.archived &&
        (!c.start || c.start <= today) &&
        (!c.end || c.end >= today)) ||
        (revisionSource?.campaign === c.name && revisionSource.program === c.program)) &&
      (!program || c.program === program) &&
      (c.branch === "Tüm Şubeler" || c.branch === offerBranch),
  );
  const campaign = active.find((c) => c.id === campaignId),
    ruleEligible = (r: FinanceRule) =>
      r.active &&
      (r.branch === "Tüm Şubeler" || r.branch === offerBranch) &&
      (!r.draft?.start || r.draft.start <= today) &&
      (!r.draft?.end || r.draft.end >= today),
    availableCardRules = cardRules.filter(ruleEligible),
    availableNoteRules = noteRules.filter(ruleEligible),
    selectedRule =
      payment === "Nakit"
        ? undefined
        : (payment === "Kredi Kartı" ? availableCardRules : availableNoteRules)
            .find((r) => r.id === financeRuleId),
    cardInstallmentOptions = selectedRule?.draft?.steps
      .filter((s) => s.enabled && s.count <= (campaign?.maxCardInstallment || 12))
      .sort((a, b) => a.count - b.count) || [],
    noteInstallmentMaximum = Math.min(
      campaign?.maxNoteInstallment || 12,
      selectedRule?.draft?.noteInstallment ||
        Number(selectedRule?.detail.match(/(\d+)\s*taksit/i)?.[1] || 12),
    ),
    noteInstallmentOptions = Array.from({length: noteInstallmentMaximum}, (_, index) => index + 1);
  const unitBase = campaign
      ? payment === "Nakit"
        ? campaign.cash
        : payment === "Kredi Kartı"
          ? campaign.card
          : campaign.note
      : 0,
    baseTotal =
      campaign?.pricingModel === "HOURLY"
        ? unitBase * (campaign.defaultHours || campaign.hours || 1)
        : unitBase,
    legacyNumbers = selectedRule?.detail.match(
      /(\d+)(?:\+(\d+))?\s*taksit.*?%(\d+(?:[,.]\d+)?)/i,
    ),
    cardStep = selectedRule?.draft?.steps.find(
      (s) => s.enabled && s.count === installmentCount,
    ),
    cardRate =
      cardStep?.rate ?? Number((legacyNumbers?.[3] || "0").replace(",", ".")),
    cardCount = cardStep?.count ?? installmentCount ?? Number(legacyNumbers?.[1] || 1),
    cardBonus = cardStep?.bonus ?? Number(legacyNumbers?.[2] || 0),
    cardTotal = Math.round(baseTotal * (1 + cardRate / 100));
  const financeDraft = selectedRule?.draft,
    noteCount = installmentCount || 1,
    noteRate =
      financeDraft?.noteRate ??
      Number(
        (selectedRule?.detail.match(/%(\d+(?:[,.]\d+)?)/)?.[1] || "0").replace(
          ",",
          ".",
        ),
      ),
    downPayment = Math.min(
      baseTotal,
      Math.max(
        campaign?.minimumDownPayment || 0,
        financeDraft?.minimumDownPayment || 0,
      ),
    ),
    principal = Math.max(0, baseTotal - downPayment),
    interestBase =
      financeDraft?.interestBase === "FULL" ? baseTotal : principal,
    noteMode =
      financeDraft?.noteMode ||
      (selectedRule?.detail.includes("Peşin") ? "CASH" : "TOTAL_RATE"),
    noteInterest =
      noteMode === "TOTAL_RATE"
        ? (interestBase * noteRate) / 100
        : noteMode === "MONTHLY_SIMPLE"
          ? ((interestBase * noteRate) / 100) * noteCount
          : noteMode === "MONTHLY_COMPOUND"
            ? interestBase * (Math.pow(1 + noteRate / 100, noteCount) - 1)
            : 0,
    noteTotal =
      noteMode === "FIXED" && financeDraft
        ? financeDraft.fixedTotal
        : Math.round(downPayment + principal + noteInterest),
    financedTotal = Math.max(0, noteTotal - downPayment),
    regularNoteInstallment = Math.floor(financedTotal / noteCount),
    lastNoteInstallment = Math.round(
      financedTotal - regularNoteInstallment * (noteCount - 1),
    ),
    firstInstallmentTiming =
      financeDraft?.firstInstallmentTiming || "AFTER_30_DAYS",
    firstInstallmentLabel =
      firstInstallmentTiming === "REGISTRATION"
        ? "kayıt tarihinde"
        : firstInstallmentTiming === "CUSTOM_DATE"
          ? financeDraft?.firstInstallmentDate || "özel tarih seçilmedi"
          : "30 gün sonra",
    noteInstallmentAmounts = Array.from({ length: noteCount }, (_, index) =>
      index === noteCount - 1 ? lastNoteInstallment : regularNoteInstallment,
    ),
    paymentSelectionComplete = payment === "Nakit" || Boolean(selectedRule && installmentCount),
    grossTotal =
      !paymentSelectionComplete
        ? 0
        : payment === "Kredi Kartı"
          ? cardTotal
          : payment === "Senet"
            ? noteTotal
            : baseTotal,
    normalizedDiscountRate = Math.max(0, Math.min(100, Number(extraDiscountRate) || 0)),
    discountAuthority: NonNullable<Offer["discountAuthority"]> = normalizedDiscountRate <= 0
      ? "Standart"
      : normalizedDiscountRate <= Number(campaign?.consultantLimit || 0)
        ? "Danışman İndirimi"
        : normalizedDiscountRate <= Number(campaign?.managerLimit || 0)
          ? "Müdür İnisiyatifi"
          : "Kurucu Onayı",
    total = Math.round(grossTotal * (1 - normalizedDiscountRate / 100)),
    installmentText =
      !paymentSelectionComplete
        ? "Taksit sayısı seçilmedi"
        : payment === "Kredi Kartı"
          ? cardCount + (cardBonus ? "+" + cardBonus : "") + " taksit"
          : payment === "Senet"
            ? noteCount +
              " taksit" +
              (downPayment ? " · " + money(downPayment) + " peşinat" : "") +
              " · ilk taksit " +
              firstInstallmentLabel
            : "Peşin";
  const alternativeSnapshot = (draft: OfferAlternativeDraft): OfferAlternative => {
    const method = draft.payment;
    const rule = method === "Kredi Kartı"
      ? availableCardRules.find((item) => item.id === draft.financeRuleId)
      : method === "Senet"
        ? availableNoteRules.find((item) => item.id === draft.financeRuleId)
        : undefined;
    if (!campaign || (method !== "Nakit" && (!rule || !draft.installmentCount))) {
      return {payment: method, total: 0, financeRule: rule?.name, installmentText: "Taksit seçilmedi", installments: draft.installmentCount};
    }
    try {
      const result = calculateOfferPrice({campaign, payment: method, rule, installmentCount: draft.installmentCount, discountRate: normalizedDiscountRate});
      return {payment: method, total: result.total, financeRule: result.financeRule, installmentText: result.installmentText, installments: result.financeSnapshot?.installments || draft.installmentCount};
    } catch {
      return {payment: method, total: 0, financeRule: rule?.name, installmentText: "Tarife doğrulanamadı", installments: draft.installmentCount};
    }
  };
  const wonOffers = scopeOffers.filter((o) => o.status === "Kazanıldı"),
    wonOffersWithCourse = wonOffers.filter((o) => { const c = scopeCandidates.find(x => x.id === o.candidateId); return Number(c?.course) > 0; }),
    missingCourseRegistrations = wonOffers.length - wonOffersWithCourse.length,
    todayIso = new Date().toLocaleDateString("sv-SE"),
    activeTargets = targetPlans.filter((p) => p.start <= todayIso && p.end >= todayIso && (!p.status || p.status === "Aktif")),
    activeTarget = membership ? (activeTargets.find((p) => p.scope === "Danışman" && p.assigneeId === membership.userId) || activeTargets.find((p) => p.scope === "Şube" && (membership.branch === "Tüm Şubeler" || p.branch === membership.branch))) : undefined,
    targetCourses = Number(activeTarget?.totalCourseTarget) || (activeTarget?.lines || []).reduce((sum, line) => sum + line.courseTarget, 0),
    legacyTargetRevenue = (activeTarget?.lines || []).reduce((sum, line) => sum + line.courseTarget * line.averageCoursePrice, 0),
    targetCoursePrice = Number(activeTarget?.targetCoursePrice) || (targetCourses ? legacyTargetRevenue / targetCourses : 0),
    targetRevenue = Math.round(targetCourses * targetCoursePrice),
    targetCollection = Math.round(targetRevenue * (activeTarget?.collectionRate || 0) / 100),
    sales = {
      collection: wonOffers.reduce((sum, o) => sum + o.total, 0),
      revenue: wonOffersWithCourse.reduce((sum, o) => sum + o.total, 0),
      sales: wonOffers.length,
      courses: wonOffersWithCourse.reduce((sum, o) => { const c = scopeCandidates.find(x => x.id === o.candidateId); return sum + Number(c?.course); }, 0),
      target: targetCollection,
    };
  const openWizard = (c?: Candidate) => {
    setRevisionSource(null);
    setWc(c);
    setGuestName(c?.name || "");
    setGuestPhone(c?.phone && c.phone !== "—" ? c.phone : "");
    setGuestSource(c?.source || "");
    setProgram(c?.program || "");
    setCampaignId(undefined);
    setFinanceRuleId(undefined);
    setInstallmentCount(undefined);
    setAlternatives([]);
    setPayment("Nakit");
    setExtraDiscountRate(0);
    setWizard(true);
  };

  const openRevisionWizard = (offer: Offer) => {
    const candidate = offer.candidateId
      ? candidateList.find((c) => c.id === offer.candidateId)
      : undefined;
    const matchedCampaign = campaigns.find(
      (c) => c.name === offer.campaign && c.program === offer.program,
    );
    const rules = offer.payment === "Kredi Kartı" ? cardRules : noteRules;
    const matchedRule = rules.find((r) => r.name === offer.financeRule);

    setRevisionSource(offer);
    setWc(candidate);
    setGuestName(offer.candidate);
    setGuestPhone(offer.phone || candidate?.phone || "");
    setGuestSource(offer.source || candidate?.source || "");
    setProgram(offer.program);
    setCampaignId(matchedCampaign?.id);
    setPayment(offer.payment as PaymentMethod);
    setFinanceRuleId(matchedRule?.id);
    setInstallmentCount(
      offer.financeSnapshot?.installments ||
      Number(offer.installmentText?.match(/(\d+)/)?.[1]) ||
      undefined,
    );
    setAlternatives((offer.alternatives || []).map((a) => ({
      payment: a.payment,
      financeRuleId: (a.payment === "Kredi Kartı" ? cardRules : noteRules).find((r) => r.name === a.financeRule)?.id,
      installmentCount: a.installments || Number(a.installmentText.match(/(\d+)/)?.[1]) || undefined,
    })));
    setBookGift(offer.bookGift ?? matchedCampaign?.bookGift ?? true);
    setExtraDiscountRate(Number(offer.discountRate || 0));
    const expiryDate = parseStoredDate(offer.expiry);
    const createdDate = parseStoredDate(offer.createdAt || offer.date);
    setValidity(
      expiryDate && createdDate
        ? Math.max(1, Math.round((expiryDate.getTime() - createdDate.getTime()) / 86400000))
        : matchedCampaign?.validity || 2,
    );
    setWizard(true);
  };
  const copyOffer = (offer: Offer) => {
    openRevisionWizard(offer);
    setRevisionSource(null);
    notify("Teklif bağımsız bir kopya olarak düzenlemeye açıldı");
  };
  const setCandidateField = (key: keyof NewCandidateForm, value: string) =>
    setCandidateForm((v) => ({ ...v, [key]: value }));
  const openNewCandidate = () => {
    setEditingCandidate(null);
    setCandidateForm(emptyCandidate);
    setNewCandidate(true);
  };
  const openCandidateEditor = (candidate: Candidate) => {
    const parts = candidate.name.trim().split(/\s+/);
    setEditingCandidate(candidate);
    setCandidateForm({
      ...emptyCandidate,
      firstName: parts.shift() || "",
      lastName: parts.join(" "),
      phone: candidate.phone === "—" ? "" : candidate.phone,
      phone2: candidate.phone2 || "",
      email: candidate.email || "",
      address: candidate.address || "",
      program: candidate.program,
      level: candidate.level || "Başlangıç",
      campaign: candidate.campaign || `${candidate.course} Kur`,
      source: candidate.source === "Misafir teklif" ? "" : candidate.source,
      guardianName: candidate.guardianName || "",
      guardianRelation: candidate.guardianRelation || "",
      guardianPhone1: candidate.guardianPhone1 || "",
      guardianPhone2: candidate.guardianPhone2 || "",
      district: candidate.district || "",
    });
    setNewCandidate(true);
  };
  const duplicateMessage = (phone: string, excludeId?: number, excludeOfferId?: string) => {
    const normalized = normalizePhone(phone),
      candidate = candidateList.find(
        (c) => c.id !== excludeId && normalizePhone(c.phone) === normalized,
      ),
      offer = offers.find(
        (o) =>
          o.id !== excludeOfferId &&
          o.candidateId !== excludeId &&
          normalizePhone(o.phone || "") === normalized,
      );
    if (candidate) {
      const prior = offers.find((o) => o.candidateId === candidate.id);
      return `Bu telefon ${candidate.name} adına kayıtlı. ${prior ? `${prior.date} tarihinde ${prior.owner} teklif oluşturmuş.` : `${candidate.createdAt || candidate.first || "önceki bir tarihte"} tarihinde ${candidate.owner} tarafından aday olarak eklenmiş.`}`;
    }
    if (offer)
      return `Bu telefonla ${offer.date} tarihinde ${offer.owner}, ${offer.candidate} adına teklif oluşturmuş.`;
    return "";
  };
  const createCandidate = () => {
    const f = candidateForm;
    if (
      !f.firstName.trim() ||
      !f.lastName.trim() ||
      !f.phone.trim() ||
      !f.program ||
      !f.level ||
      !f.campaign ||
      !f.source
    ) {
      notify("Zorunlu alanları doldurmalısınız");
      return;
    }
    if (!validTrPhone(f.phone)) {
      notify("Geçerli bir telefon girin: 05XX XXX XX XX");
      return;
    }
    const duplicate = duplicateMessage(f.phone, editingCandidate?.id);
    if (duplicate) {
      notify(duplicate);
      return;
    }
    if (editingCandidate) {
      const updated: Candidate = {
        ...editingCandidate,
        name: (f.firstName + " " + f.lastName).trim(),
        phone: formatPhone(f.phone),
        phone2: f.phone2,
        email: f.email,
        address: f.address,
        program: f.program,
        level: f.level,
        course: Number(
          f.campaign.match(/\d+/)?.[0] || editingCandidate.course || 1,
        ),
        campaign: f.campaign,
        source: f.source,
        guardianName: f.guardianName,
        guardianRelation: f.guardianRelation,
        guardianPhone1: f.guardianPhone1,
        guardianPhone2: f.guardianPhone2,
        district: f.district,
      };
      setCandidateList((v) =>
        v.map((c) => (c.id === updated.id ? updated : c)),
      );
      setOffers((v) =>
        v.map((o) =>
          o.candidateId === updated.id
            ? {
                ...o,
                candidate: updated.name,
                phone: updated.phone,
                source: updated.source,
              }
            : o,
        ),
      );
      setSelected(updated);
      setEditingCandidate(null);
      setNewCandidate(false);
      notify("Aday bilgileri güncellendi");
      return;
    }
    const branch =
      role === "Kurucu" && branchF !== "Tüm Şubeler" ? branchF : "İzmit";
    const owner = currentUserName || "Erdem Türköz";
    const now = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());
    const item: Candidate = {
      id: Date.now(),
      name: (f.firstName + " " + f.lastName).trim(),
      phone: formatPhone(f.phone),
      phone2: f.phone2,
      email: f.email,
      address: f.address,
      first: "—",
      program: f.program,
      level: f.level,
      course: Number(f.campaign.match(/\d+/)?.[0] || 1),
      campaign: f.campaign,
      source: f.source,
      branch,
      owner,
      arrival: "—",
      appointment: "—",
      status: "Yeni aday",
      offer: "—",
      agreement: "—",
      collection: "0 TL",
      prob: 5,
      last: "Henüz görüşme yok",
      next: "İlk görüşmeyi planla",
      guardianName: f.guardianName,
      guardianRelation: f.guardianRelation,
      guardianPhone1: f.guardianPhone1,
      guardianPhone2: f.guardianPhone2,
      district: f.district,
      createdAt: now,
      createdBy: owner,
      ownerId: currentUserId,
    };
    setCandidateList((v) => [item, ...v]);
    setNewCandidate(false);
    setSelected(item);
    setTab("Genel");
    notify("Yeni aday oluşturuldu");
  };
  const createOffer = () => {
    if (!offerName || !campaign) {
      notify("Teklif sahibi adı ve geçerli bir kampanya seçmelisiniz");
      return;
    }
    const contactPhone = wc?.phone || guestPhone,
      contactSource = wc?.source || guestSource;
    if (!validTrPhone(contactPhone)) {
      notify("Teklif için geçerli telefon zorunludur: 05XX XXX XX XX");
      return;
    }
    if (!contactSource) {
      notify("Teklif için başvuru kaynağı zorunludur");
      return;
    }
    if (!wc) {
      const duplicate = duplicateMessage(contactPhone);
      if (duplicate) {
        notify(duplicate);
        return;
      }
    }
    if (payment === "Kredi Kartı" && campaign.cardRules === false) {
      notify("Bu kampanyada kredi kartı ile satış kapalıdır");
      return;
    }
    if (payment === "Senet" && campaign.noteRules === false) {
      notify("Bu kampanyada senetli satış kapalıdır");
      return;
    }
    if (payment !== "Nakit" && !selectedRule) {
      notify(payment === "Kredi Kartı" ? "Kredi kartı tarifesi seçmelisiniz" : "Senet planı seçmelisiniz");
      return;
    }
    if (payment !== "Nakit" && !installmentCount) {
      notify("Taksit sayısını açıkça seçmelisiniz");
      return;
    }
    if (alternatives.some((alternative) => alternative.payment !== "Nakit" && (!alternative.financeRuleId || !alternative.installmentCount))) {
      notify("Alternatif tekliflerin tarife ve taksit sayısı seçimlerini tamamlamalısınız");
      return;
    }
    if (
      payment === "Senet" &&
      firstInstallmentTiming === "CUSTOM_DATE" &&
      !financeDraft?.firstInstallmentDate
    ) {
      notify("İlk taksit için özel tarih seçilmelidir");
      return;
    }
    const created = new Date(),
      createdAt = created.toISOString(),
      displayDate = created.toLocaleString("tr-TR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      expiry = new Date(created.getTime() + validity * 86400000),
      alternativeRecords = alternatives.map(alternativeSnapshot),
      financeSnapshot: FinanceSnapshot | undefined =
        payment === "Senet"
          ? {
              method: noteMode,
              installments: noteCount,
              rate: noteRate,
              downPayment,
              principal,
              financeDifference: Math.round(noteTotal - baseTotal),
              total: noteTotal,
              firstInstallmentTiming,
              firstInstallmentDate: financeDraft?.firstInstallmentDate,
              installmentAmounts: noteInstallmentAmounts,
            }
          : undefined;
    const newOffer: Offer = {
      id: "TKF-" + Date.now().toString().slice(-8),
      candidate: offerName,
      candidateId: wc?.id,
      phone: formatPhone(contactPhone),
      source: contactSource,
      recordType: wc ? "Kayıtlı aday" : "Misafir teklif",
      owner: wc?.owner || currentUserName || "Erdem Türköz",
      ownerId: wc?.ownerId || currentUserId,
      branch: offerBranch,
      program: campaign.program,
      campaign: campaign.name,
      total,
      status: discountAuthority === "Kurucu Onayı" ? "Onay bekliyor" : "Taslak",
      date: displayDate,
      createdAt,
      originalCreatedAt: revisionSource?.originalCreatedAt || revisionSource?.createdAt || createdAt,
      revisedAt: revisionSource ? createdAt : undefined,
      expiry: expiry.toLocaleString("tr-TR"),
      payment,
      financeRule: selectedRule?.name,
      installmentText,
      financeSnapshot,
      guest: !wc,
      alternatives: alternativeRecords,
      bookGift,
      parentOfferId: revisionSource?.id,
      rootOfferId: revisionSource?.rootOfferId || revisionSource?.id,
      version: (revisionSource?.version || 1) + (revisionSource ? 1 : 0),
      discountRate: normalizedDiscountRate,
      discountAuthority,
    };
    setOffers((v) => [newOffer, ...v]);
    if (wc) {
      setCandidateList((v) =>
        v.map((c) =>
          c.id === wc.id
            ? {
                ...c,
                firstMeetingAt: c.firstMeetingAt || createdAt,
                first: c.first && c.first !== "—" ? c.first : displayDate,
                status: "Teklif hazırlandı",
                offer: money(total),
                last: revisionSource ? "Teklif revizyonu taslak kaydedildi" : "Teklif taslak kaydedildi",
                next: "Teklifi paylaş",
              }
            : c,
        ),
      );
    }
    setWizard(false);
    setPage("offers");
    notify(discountAuthority === "Kurucu Onayı" ? "Teklif müdür indirim sınırını aştığı için kurucu onayına gönderildi" : revisionSource ? "Revizyon yeni sürüm olarak kaydedildi; önceki teklif korundu" : wc ? `${discountAuthority === "Müdür İnisiyatifi" ? "Müdür inisiyatifli" : discountAuthority === "Danışman İndirimi" ? "Danışman indirimli" : "Standart"} teklif kaydedildi ve adaya bağlandı` : "Misafir teklif taslak olarak kaydedildi");
  };
  const linkedCandidate = (o: Offer) => {
    if (o.candidateId) return candidateList.find((c) => c.id === o.candidateId);
    const exact = candidateList.filter((c) => c.name.trim().toLocaleLowerCase('tr-TR') === o.candidate.trim().toLocaleLowerCase('tr-TR'));
    return exact.length === 1 ? exact[0] : undefined;
  };
  const requestCandidateDelete = (candidate: Candidate) => {
    const linked = offers.filter((offer) => !offer.archivedAt && (offer.candidateId === candidate.id || (!offer.candidateId && offer.candidate === candidate.name)));
    if (linked.length) {
      notify(`${candidate.name} silinemedi: adaya bağlı ${linked.length} teklif bulunuyor. Önce teklifleri silin.`);
      return;
    }
    setPendingDelete({kind: "candidate", item: candidate});
  };
  const requestOfferDelete = (offer: Offer) => {
    const revisions = offers.filter((item) => !item.archivedAt && item.parentOfferId === offer.id);
    if (revisions.length) {
      notify(`${offer.id} silinemedi: bu teklife bağlı sonraki bir revizyon bulunuyor. Önce en yeni sürümü silin.`);
      return;
    }
    setPendingDelete({kind: "offer", item: offer});
  };
  const confirmRecordDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "candidate") {
      const id = pendingDelete.item.id;
      setCandidateList((items) => items.map((item) => item.id === id ? archiveRecord(item, currentUserName || membership?.role || "Sistem") : item));
      setSelected(null);
      notify(`${pendingDelete.item.name} arşivlendi`);
    } else {
      const id = pendingDelete.item.id;
      setOffers((items) => items.map((item) => item.id === id ? archiveRecord(item, currentUserName || membership?.role || "Sistem") : item));
      setDetailOffer(null);
      notify(`${id} numaralı teklif arşivlendi`);
    }
    setPendingDelete(null);
  };
  const restoreArchivedRecord = (kind: "candidate" | "offer", id: number | string) => {
    if (membership?.role === "Danışman") return;
    if (kind === "candidate") {
      setCandidateList((items) => items.map((item) => item.id === id ? restoreRecord(item) : item));
      notify("Aday aktif listeye geri yüklendi");
    } else {
      setOffers((items) => items.map((item) => item.id === id ? restoreRecord(item) : item));
      notify("Teklif aktif listeye geri yüklendi");
    }
  };
  const openOffer = (o: Offer) => {
    setDetailOffer(o);
  };
  const reviseOffer = (o: Offer) => {
    openRevisionWizard(o);
    notify("Teklif tüm kayıtlı bilgileriyle revizyona açıldı");
  };
  const offerVersionChain = (o: Offer) => {
    return getOfferVersionChain(o, offers);
  };
  const candidateOfferLabel = (candidate: Candidate) => {
    const linked = scopeOffers.filter((offer) => offer.candidateId === candidate.id || (!offer.candidateId && offer.candidate === candidate.name));
    const latest = linked.filter((offer) => !linked.some((next) => next.parentOfferId === offer.id)).sort((a, b) => (parseStoredDate(b.createdAt || b.date)?.getTime() || 0) - (parseStoredDate(a.createdAt || a.date)?.getTime() || 0))[0];
    if (!latest) return candidate.offer;
    return `${money(latest.total)}${latest.alternatives?.length ? ` +${latest.alternatives.length} alternatif` : ''}`;
  };
  const registrationForCandidate = (candidate: Candidate) => scopeOffers
    .filter((offer) => offer.candidateId === candidate.id || (!offer.candidateId && offer.candidate.trim().toLocaleLowerCase('tr-TR') === candidate.name.trim().toLocaleLowerCase('tr-TR')))
    .filter((offer) => !scopeOffers.some((next) => next.parentOfferId === offer.id))
    .sort((a, b) => (parseStoredDate(b.createdAt || b.date)?.getTime() || 0) - (parseStoredDate(a.createdAt || a.date)?.getTime() || 0))[0];
  const isLatestOfferVersion = (offer: Offer) => !scopeOffers.some((next) => next.parentOfferId === offer.id);
  const canStartRegistration = (offer: Offer) => !offer.guest && isLatestOfferVersion(offer) && ['Onay bekliyor', 'Gönderildi', 'Görüntülendi', 'Revize edildi', 'Kazanıldı'].includes(offer.status);
  const openRegistration = (offer: Offer, candidate?: Candidate) => {
    const linked = candidate || linkedCandidate(offer);
    if (!linked) { notify('Kesin kayıt için teklifin benzersiz bir adayla eşleştirilmesi gerekir'); return; }
    setRegistrationOffer(offer);
    setRegistrationCandidate(linked);
    setRegistrationDate(offer.registeredAt?.slice(0, 10) || new Date().toLocaleDateString('sv-SE'));
    setRegistrationPaidCourses(Number(offer.paidCourses || linked.course || 0));
    setRegistrationGiftCourses(Number(offer.giftCourses || 0));
    setRegistrationDownPayment(Number(offer.financeSnapshot?.downPayment || 0));
    setRegistrationSource(linked.source || offer.source || '');
    setDetailOffer(null);
  };
  const openCandidateRegistration = (candidate: Candidate) => {
    const offer = registrationForCandidate(candidate);
    if (!offer) { notify('Kesin kayıt oluşturmak için bu adaya bağlı bir teklif bulunmalıdır'); return; }
    openRegistration(offer, candidate);
  };
  const completeRegistration = async () => {
    if (!registrationOffer || !registrationCandidate) return;
    if (!registrationDate || registrationPaidCourses < 1 || !registrationSource) { notify('Kayıt tarihi, en az 1 ücretli kur ve kaynak zorunludur'); return; }
    const candidateName = registrationCandidate.name;
    try {
      await api.post('/api/registrations/complete', {offerId: registrationOffer.id, candidateId: registrationCandidate.id, source: registrationSource, registrationDate, paidCourses: registrationPaidCourses, giftCourses: registrationGiftCourses, downPayment: registrationDownPayment, expectedOffer: registrationOffer, expectedCandidate: registrationCandidate});
      window.dispatchEvent(new Event(UMAY_AUTH_CHANGED_EVENT));
      setRegistrationOffer(null); setRegistrationCandidate(null);
      notify(`${candidateName} kesin kayda dönüştürüldü`);
    } catch {
      notify('Kesin kayıt kaydedilemedi. Aday veya teklif başka bir kullanıcı tarafından değiştirilmiş olabilir; veriler yenilendi.');
      window.dispatchEvent(new Event(UMAY_AUTH_CHANGED_EVENT));
    }
  };
  const transitionOffer = (offer: Offer, nextStatus: string) => {
    if (!canTransitionOffer(offer.status, nextStatus)) {
      notify(`${offer.status} durumundan ${nextStatus} durumuna geçilemez`);
      return;
    }
    const updated = { ...offer, status: nextStatus };
    setOffers((items) =>
      items.map((item) => (item.id === offer.id ? updated : item)),
    );
    setDetailOffer(updated);
    notify(`Teklif durumu ${nextStatus} olarak güncellendi`);
  };
  const shareOffer = (o: Offer) => {
    if (terminalOfferStatuses.includes(o.status as never)) {
      notify("Kapanmış veya geçersiz kalan teklif yeniden paylaşılamaz");
      return;
    }
    const candidate = linkedCandidate(o),
      phone = candidate?.phone || o.phone;
    if (!validTrPhone(phone)) {
      notify("Paylaşım için geçerli telefon bilgisi gereklidir");
      return;
    }
    window.open(
      "https://wa.me/90" +
        normalizePhone(phone).slice(1) +
        "?text=" +
        encodeURIComponent(
          "Merhaba " +
            o.candidate +
            ", " +
            o.campaign +
            " teklifiniz: " +
            money(o.total) +
            (o.financeRule ? " · " + o.financeRule : ""),
        ),
      "_blank",
      "noopener,noreferrer",
    );
    const sharedAt = new Date().toISOString();
    const updatedOffer = { ...o, status: "Gönderildi", sentAt: sharedAt };
    setOffers((items) =>
      items.map((item) => {
        if (item.id === o.id) return updatedOffer;
        if (o.parentOfferId && item.id === o.parentOfferId)
          return { ...item, status: "Revize edildi" };
        return item;
      }),
    );
    setOfferShares((items) => [
      {
        id: crypto.randomUUID(),
        offerId: o.id,
        offerVersion: o.version || 1,
        channel: "WhatsApp",
        recipient: formatPhone(phone),
        sharedAt,
        sharedBy: currentUserName || role,
        result: "Başlatıldı",
      },
      ...items,
    ]);
    if (detailOffer?.id === o.id) setDetailOffer(updatedOffer);
    if (candidate) {
      setCandidateList((items) =>
        items.map((item) =>
          item.id === candidate.id
            ? { ...item, status: "Teklif gönderildi", last: "Teklif WhatsApp ile paylaşıldı", next: "Teklif takibi" }
            : item,
        ),
      );
    }
    notify("WhatsApp paylaşımı açıldı ve işlem geçmişe kaydedildi");
  };
  const convertGuestOffer = (o: Offer) => {
    setConversionOffer(o);
    setConversionPhone(o.phone || "");
    setConversionSource(o.source || "");
  };
  const confirmGuestConversion = () => {
    const o = conversionOffer;
    if (!o) return;
    if (!validTrPhone(conversionPhone)) {
      notify("Geçerli telefon zorunludur");
      return;
    }
    if (!conversionSource) {
      notify("Başvuru kaynağı zorunludur");
      return;
    }
    const duplicate = duplicateMessage(conversionPhone, undefined, o.id);
    if (duplicate) {
      notify(duplicate);
      return;
    }
    const id = Date.now(),
      meetingAt =
        o.sentAt || o.createdAt || parseStoredDate(o.date)?.toISOString(),
      meetingDisplay =
        parseStoredDate(meetingAt || o.date)?.toLocaleString("tr-TR", {
          dateStyle: "short",
          timeStyle: "short",
        }) || o.date,
      item: Candidate = {
        id,
        name: o.candidate,
        phone: formatPhone(conversionPhone),
        first: meetingDisplay,
        firstMeetingAt: meetingAt,
        program: o.program,
        course: 1,
        campaign: o.campaign,
        source: conversionSource,
        branch: o.branch,
        owner: o.owner,
        arrival: "—",
        appointment: "—",
        status: "Teklif gönderildi",
        offer: money(o.total),
        agreement: "—",
        collection: "0 TL",
        prob: 10,
        last: "Tekliften adaya dönüştürüldü",
        next: "Teklif takibi",
        createdAt: new Date().toISOString(),
        createdBy: o.owner,
      };
    setCandidateList((v) => [item, ...v]);
    setOffers((v) =>
      v.map((x) =>
        x.id === o.id
          ? {
              ...x,
              phone: item.phone,
              source: item.source,
              recordType: "Kayıtlı aday",
              guest: false,
              candidateId: id,
            }
          : x,
      ),
    );
    setConversionOffer(null);
    notify("Misafir teklif aday kaydına dönüştürüldü");
  };
  const resetFilters = (kind: "dashboard" | "candidates" | "offers" | "campaigns" | "analytics") => {
    if (kind === "offers") {
      setOfferPeriod("Bu Ay");
      setOfferBranchF("Tüm Şubeler");
      setOfferOwnerF("Tüm Danışmanlar");
      setOfferProgramF("Tüm Programlar");
      setOfferStatusF("Tüm Durumlar");
      setOfferSourceF("Tüm Kaynaklar");
      setOfferRecordTypeF("Tüm Kayıt Tipleri");
      setPaymentF("Tüm Ödemeler");
      setCampaignF("Tüm Kampanyalar");
      setOfferQuery("");
      return;
    }
    setPeriod("Bu Ay");
    setBranchF("Tüm Şubeler");
    setOwnerF("Tüm Danışmanlar");
    setProgramF("Tüm Programlar");
    setStatusF("Tüm Durumlar");
    setSourceF("Tüm Kaynaklar");
    setCampaignStatusF("Tüm Durumlar");
    setQuery("");
  };
  const FilterBar = ({
    kind,
  }: {
    kind: "dashboard" | "candidates" | "offers" | "campaigns" | "analytics";
  }) => (
    <section className={`umay-filter mt-4 rounded-[20px] border border-white/5 bg-[#17191c] p-3 shadow-[0_10px_30px_rgba(0,0,0,.08)] ${expandedFilters === kind ? "is-expanded" : ""}`} aria-label="Liste filtreleri"><div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[190px] flex-1">
        <span className="mb-1 block text-[8px] font-bold uppercase tracking-[.1em] text-black/30">
          Arama
        </span>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5 text-black/35" />
          <input
            value={kind === "offers" ? offerQuery : query}
            onChange={(e) => kind === "offers" ? setOfferQuery(e.target.value) : setQuery(e.target.value)}
            placeholder={
              kind === "campaigns"
                ? "Kampanya ara..."
                : kind === "offers"
                  ? "Aday veya teklif no ara..."
                  : "Aday veya telefon ara..."
            }
            className="w-full rounded-xl border bg-[#fafafa] py-2 pl-8 pr-3 text-[10px]"
          />
        </div>
      </label>
      <label>
        <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
          Tarih
        </span>
        <select
          value={kind === "offers" ? offerPeriod : period}
          onChange={(e) => kind === "offers" ? setOfferPeriod(e.target.value) : setPeriod(e.target.value)}
          className="rounded-xl border px-3 py-2 text-[10px]"
        >
          <option>Bugün</option>
          <option>Bu Hafta</option>
          <option>Bu Ay</option>
          <option>Geçen Ay</option>
          <option>Bu Çeyrek</option>
          <option>Tüm Tarihler</option>
        </select>
      </label>
      {role === "Kurucu" && (
        <label>
          <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
            Şube
          </span>
          <select
            value={kind === "offers" ? offerBranchF : branchF}
            onChange={(e) => kind === "offers" ? setOfferBranchF(e.target.value) : setBranchF(e.target.value)}
            className="rounded-xl border px-3 py-2 text-[10px]"
          >
            <option>Tüm Şubeler</option>
            <option>İzmit</option>
            <option>Körfez</option>
          </select>
        </label>
      )}
      {role !== "Satış Danışmanı" && kind !== "campaigns" && (
        <label>
          <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
            Danışman
          </span>
          <select
            value={kind === "offers" ? offerOwnerF : ownerF}
            onChange={(e) => kind === "offers" ? setOfferOwnerF(e.target.value) : setOwnerF(e.target.value)}
            className="rounded-xl border px-3 py-2 text-[10px]"
          >
            <option>Tüm Danışmanlar</option>
            {people
              .filter((p) => role === "Kurucu" || p.branch === "İzmit")
              .map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
          </select>
        </label>
      )}
      <label>
        <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
          Program
        </span>
        <select
          value={kind === "offers" ? offerProgramF : programF}
          onChange={(e) => kind === "offers" ? setOfferProgramF(e.target.value) : setProgramF(e.target.value)}
          className="rounded-xl border px-3 py-2 text-[10px]"
        >
          <option>Tüm Programlar</option>
          {education
            .filter((e) => e.active)
            .map((e) => (
              <option key={e.id}>{e.name}</option>
            ))}
        </select>
      </label>
      {kind === "candidates" && (
        <>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
              Durum
            </span>
            <select
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
              className="rounded-xl border px-3 py-2 text-[10px]"
            >
              <option>Tüm Durumlar</option>
              <option>Yeni aday</option>
              <option>Randevu planlandı</option>
              <option>Teklif gönderildi</option>
              <option>Karar bekleniyor</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
              Kaynak
            </span>
            <select
              value={sourceF}
              onChange={(e) => setSourceF(e.target.value)}
              className="rounded-xl border px-3 py-2 text-[10px]"
            >
              <option>Tüm Kaynaklar</option>
              {sourceOptions.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
        </>
      )}
      {kind === "offers" && (
        <>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">Kaynak</span>
            <select value={offerSourceF} onChange={(e) => setOfferSourceF(e.target.value)} className="rounded-xl border px-3 py-2 text-[10px]">
              <option>Tüm Kaynaklar</option>
              {sourceOptions.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">Kayıt Tipi</span>
            <select value={offerRecordTypeF} onChange={(e) => setOfferRecordTypeF(e.target.value)} className="rounded-xl border px-3 py-2 text-[10px]">
              <option>Tüm Kayıt Tipleri</option>
              <option>Kayıtlı aday</option>
              <option>Misafir teklif</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
              Durum
            </span>
            <select
              value={offerStatusF}
              onChange={(e) => setOfferStatusF(e.target.value)}
              className="rounded-xl border px-3 py-2 text-[10px]"
            >
              <option>Tüm Durumlar</option>
              <option>Aktif Teklifler</option>
              <option>Taslak</option>
              <option>Onay bekliyor</option>
              <option>Görüntülendi</option>
              <option>Revize edildi</option>
              <option>Kazanıldı</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
              Ödeme
            </span>
            <select
              value={paymentF}
              onChange={(e) => setPaymentF(e.target.value)}
              className="rounded-xl border px-3 py-2 text-[10px]"
            >
              <option>Tüm Ödemeler</option>
              <option>Nakit</option>
              <option>Kredi Kartı</option>
              <option>Senet</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
              Kampanya
            </span>
            <select
              value={campaignF}
              onChange={(e) => setCampaignF(e.target.value)}
              className="max-w-[190px] rounded-xl border px-3 py-2 text-[10px]"
            >
              <option>Tüm Kampanyalar</option>
              {campaigns
                .filter((c) => !c.archived)
                .map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
            </select>
          </label>
        </>
      )}
      {kind === "campaigns" && (
        <label>
          <span className="mb-1 block text-[8px] font-bold uppercase text-black/30">
            Durum
          </span>
          <select
            value={campaignStatusF}
            onChange={(e) => setCampaignStatusF(e.target.value)}
            className="rounded-xl border px-3 py-2 text-[10px]"
          >
            <option>Tüm Durumlar</option>
            <option>Aktif</option>
            <option>Taslak</option>
          </select>        </label>
      )}
      <button onClick={() => setExpandedFilters(expandedFilters === kind ? null : kind)} aria-expanded={expandedFilters === kind} className="umay-filter-more flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-[10px] font-semibold text-white"><span>Tüm Filtreler</span><ChevronDown size={13} className={`transition ${expandedFilters === kind ? "rotate-180" : ""}`}/></button><button
        onClick={() => resetFilters(kind)}
        className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-[10px] text-white/60"
      >
        <RotateCcw size={13} />
        Sıfırla
      </button>
    </div></section>
  );
  const menu: [Page, string, ReactNode][] = [
    [
      "dashboard",
      role === "Satış Danışmanı" ? "Bugünün Merkezi" : "Yönetici Merkezi",
      <LayoutDashboard size={17} />,
    ],
    ["candidates", "Adaylar", <Users size={17} />],
    ["offers", "Teklifler", <FileText size={17} />],
    ["analytics", "Teklif Analitikleri", <BarChart3 size={17} />],
    ["targets", "Hedef Planlama", <Target size={17} />],
    ["campaigns", "Kampanyalar ve Fiyatlar", <Settings2 size={17} />],
  ];
  const Sidebar = () => (
    <aside
      className={`${mobile ? "fixed flex" : "hidden"} inset-y-0 left-0 z-50 w-[270px] flex-col bg-[#15181b] p-4 text-white lg:fixed lg:flex`}
    >
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff200] font-black text-black">
          U
        </div>
        <div>
          <b>UMAYv2</b>
          <p className="text-[10px] text-white/45">{role}</p>
        </div>
        <button onClick={() => setMobile(false)} className="ml-auto lg:hidden">
          <X />
        </button>
      </div>
      <nav className="mt-5 space-y-1">
        {menu.map(([p, l, i]) => {
          const disabled = p === "campaigns" && role === "Satış Danışmanı";
          return (
            <button
              key={p}
              disabled={disabled}
              onClick={() => {
                setPage(p);
                setMobile(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] ${page === p ? "bg-white text-black" : disabled ? "text-white/20" : "text-white/60 hover:bg-white/5"}`}
            >
              {i}
              {l}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 p-3 text-[10px] text-white/45">
        <ShieldCheck size={14} className="mb-2 text-[#fff200]" />
        Rol bazlı veri erişimi aktif
      </div>
    </aside>
  );
  const Detail = () =>
    selected ? (
      <>
        <button
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-[70] bg-black/20"
        />
        <aside className="fixed inset-y-0 right-0 z-[80] w-full max-w-[560px] bg-[#f7f8fa] shadow-2xl">
          <div className="border-b bg-white">
            <div className="flex justify-between p-5">
              <div>
                <p className="text-[9px] uppercase tracking-[.14em] text-black/35">
                  Aday çalışma paneli
                </p>
                <h2 className="text-[21px] font-semibold">{selected.name}</h2>
                <p className="text-[10px] text-black/40">
                  {selected.phone} · {selected.program} · {selected.branch}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openCandidateEditor(selected)}
                  className="rounded-xl border px-3 py-2 text-[10px] font-semibold"
                >
                  Bilgileri Düzenle
                </button>
                <button onClick={() => setSelected(null)}>
                  <X />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 pb-4">
              <div className="rounded-xl bg-black/5 p-3 text-[9px]">
                <span className="text-black/35">Durum</span>
                <b className="block">{selected.status}</b>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-[9px] text-emerald-700">
                <span>Olasılık</span>
                <b className="block text-[12px]">%{selected.prob}</b>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-[9px] text-amber-700">
                <span>Sonraki görev</span>
                <b className="block">{selected.next}</b>
              </div>
            </div>
            <div className="flex overflow-x-auto border-t px-3">
              {(
                [
                  "Genel",
                  "Timeline",
                  "Görevler",
                  "Teklifler",
                  "Aile",
                  "Notlar",
                ] as Tab[]
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-semibold ${tab === t ? "border-black" : "border-transparent text-black/40"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[calc(100vh-185px)] overflow-y-auto p-4">
            {tab === "Genel" && (
              <div className="space-y-3">
                {[
                  [
                    "İletişim",
                    [
                      ["Telefon", selected.phone],
                      ["E-posta", selected.email || "Eklenmedi"],
                      ["Adres", selected.address || selected.district || "Eklenmedi"],
                    ],
                  ],
                  [
                    "Eğitim",
                    [
                      ["Program", selected.program],
                      ["Kur", String(selected.course)],
                      ["Kaynak", selected.source],
                    ],
                  ],
                  [
                    "Satış",
                    [
                      ["Danışman", selected.owner],
                      ["İlk görüşme", selected.first],
                      ["Son görüşme", selected.last],
                      ["Teklif", selected.offer],
                    ],
                  ],
                ].map(([title, rows]) => (
                  <section
                    key={String(title)}
                    className="rounded-[18px] border bg-white p-4"
                  >
                    <div className="flex justify-between">
                      <h3 className="text-[12px] font-semibold">
                        {String(title)}
                      </h3>
                      <MoreHorizontal size={14} />
                    </div>
                    {(rows as string[][]).map(([a, b]) => (
                      <div
                        key={a}
                        className="flex justify-between border-t py-2 text-[10px]"
                      >
                        <span className="text-black/40">{a}</span>
                        <b>{b}</b>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {tab === "Timeline" && (
              <div className="space-y-3">
                {selected.createdAt && (
                  <div className="rounded-[16px] border border-l-4 border-l-emerald-500 bg-white p-4">
                    <b className="text-[11px]">Aday oluşturuldu</b>
                    <p className="mt-2 text-[9px] text-black/45">
                      Şube: {selected.branch} · Oluşturan: {selected.createdBy}{" "}
                      · {selected.createdAt}
                    </p>
                  </div>
                )}
                {[
                  "Bugün telefon görüşmesi yapıldı",
                  "Teklif WhatsApp ile paylaşıldı",
                  "Randevu oluşturuldu",
                  "Not eklendi",
                ].map((x) => (
                  <div
                    key={x}
                    className="rounded-[16px] border border-l-4 border-l-blue-500 bg-white p-4 text-[11px] font-semibold"
                  >
                    {x}
                  </div>
                ))}
              </div>
            )}
            {tab === "Görevler" && (
              <div className="space-y-3">
                {["Bugün ara", "WhatsApp gönder", "Teklif takibi"].map((x) => (
                  <div
                    key={x}
                    className="flex items-center gap-3 rounded-[16px] border bg-white p-4"
                  >
                    <button
                      onClick={() =>
                        setCompletedTasks((v) =>
                          v.includes(selected.id + ":" + x)
                            ? v.filter((k) => k !== selected.id + ":" + x)
                            : [...v, selected.id + ":" + x],
                        )
                      }
                      className={`grid h-6 w-6 place-items-center rounded-full border ${completedTasks.includes(selected.id + ":" + x) ? "bg-emerald-600 text-white" : ""}`}
                      aria-label={x + " görev durumunu değiştir"}
                    >
                      <Check size={12} />
                    </button>
                    <b
                      className={`text-[11px] ${completedTasks.includes(selected.id + ":" + x) ? "line-through text-black/35" : ""}`}
                    >
                      {x}
                    </b>
                  </div>
                ))}
              </div>
            )}
            {tab === "Teklifler" && (
              <div className="space-y-3">
                <button
                  onClick={() => openWizard(selected)}
                  className="w-full rounded-xl bg-black py-3 text-[11px] text-white"
                >
                  <Plus size={14} className="mr-2 inline" />
                  Yeni Teklif Oluştur
                </button>
                {(() => {
                  const linked = scopeOffers.filter((offer) => offer.candidateId === selected.id || (!offer.candidateId && offer.candidate === selected.name));
                  const latestVersions = linked.filter((offer) => !linked.some((next) => next.parentOfferId === offer.id));
                  if (!latestVersions.length) return <div className="rounded-[18px] border border-dashed bg-white p-5 text-center"><p className="text-[11px] font-semibold">Henüz teklif bulunmuyor</p><p className="mt-1 text-[9px] text-black/40">İlk teklifi oluşturduğunuzda ana ve alternatif seçenekler burada birlikte görünecek.</p></div>;
                  return latestVersions.map((offer) => {
                    const chain = offerVersionChain(offer);
                    const first = [...chain].sort((a, b) => (a.version || 1) - (b.version || 1))[0] || offer;
                    const chainIds = new Set(chain.map((item) => item.id));
                    const lastShare = offerShares.filter((share) => chainIds.has(share.offerId)).sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime())[0];
                    return <section key={offer.rootOfferId || offer.id} className="overflow-hidden rounded-[20px] border bg-white shadow-sm">
                      <div className="border-b bg-[#f7f8fa] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-black/35">Teklif grubu</p><b className="mt-1 block text-[12px]">{offer.rootOfferId || first.id}</b></div><span className="rounded-full bg-white px-3 py-1 text-[9px] font-semibold ring-1 ring-black/10">{1 + (offer.alternatives?.length || 0)} seçenek · {offer.status}</span></div>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-[9px] sm:grid-cols-3"><div><span className="block text-black/35">İlk teklif</span><b>{formatDateTime(first.originalCreatedAt || first.createdAt || first.date)}</b></div><div><span className="block text-black/35">Paylaşılma</span><b>{lastShare ? formatDateTime(lastShare.sharedAt) : 'Henüz paylaşılmadı'}</b></div><div><span className="block text-black/35">Son revizyon</span><b>{(offer.version || 1) > 1 ? `${formatDateTime(offer.revisedAt || offer.createdAt)} · Revizyon ${(offer.version || 1) - 1}` : 'Henüz revize edilmedi'}</b></div></div>
                      </div>
                      <div className="space-y-2 p-4"><div className="rounded-[16px] bg-[#17191c] p-4 text-white"><div className="flex items-center justify-between gap-3"><div><span className="text-[8px] font-bold uppercase tracking-wider text-white/45">Ana teklif</span><p className="mt-1 text-[20px] font-semibold">{money(offer.total)}</p></div><span className="text-right text-[9px] text-white/65">{offer.payment}<br/>{offer.installmentText || offer.financeRule || 'Peşin'}</span></div></div>{offer.alternatives?.map((alternative, index) => <div key={index} className="rounded-[16px] border bg-white p-4"><div className="flex items-center justify-between gap-3"><div><span className="text-[8px] font-bold uppercase tracking-wider text-black/35">Alternatif {index + 1}</span><p className="mt-1 text-[18px] font-semibold">{money(alternative.total)}</p></div><span className="text-right text-[9px] text-black/50">{alternative.payment}<br/>{alternative.installmentText}{alternative.financeRule ? ` · ${alternative.financeRule}` : ''}</span></div></div>)}</div>
                      <div className="flex flex-wrap gap-2 border-t p-3"><button onClick={() => setDetailOffer(offer)} className="rounded-xl border px-3 py-2 text-[9px] font-semibold">Aç</button>{!terminalOfferStatuses.includes(offer.status as never) && <button onClick={() => reviseOffer(offer)} className="rounded-xl border px-3 py-2 text-[9px] font-semibold">Revize Et</button>}{!terminalOfferStatuses.includes(offer.status as never) && <button onClick={() => shareOffer(offer)} className="rounded-xl bg-black px-3 py-2 text-[9px] font-semibold text-white">WhatsApp ile Paylaş</button>}{chain.length > 1 && <button onClick={() => setDetailOffer(offer)} className="ml-auto rounded-xl bg-amber-50 px-3 py-2 text-[9px] font-semibold text-amber-900">Geçmiş · {chain.length} sürüm</button>}</div>
                    </section>;
                  });
                })()}
              </div>
            )}
            {tab === "Aile" && (
              <div className="space-y-3">
                {[
                  "Anne · Zeynep Yıldız",
                  "Baba · Murat Yıldız",
                  "Kardeş · Can Yıldız",
                ].map((x) => (
                  <div
                    key={x}
                    className="rounded-[16px] border bg-white p-4 text-[11px] font-semibold"
                  >
                    {x}
                  </div>
                ))}
              </div>
            )}
            {tab === "Notlar" && (
              <>
                {candidateNotes[String(selected.id)] && (
                  <div className="mb-3 rounded-[16px] border bg-white p-4 text-[10px]">
                    {candidateNotes[String(selected.id)]}
                  </div>
                )}
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="min-h-[100px] w-full rounded-[16px] border bg-white p-4 text-[10px]"
                  placeholder="Yeni not yaz..."
                />
                <button
                  onClick={() => {
                    if (!noteDraft.trim()) {
                      notify("Kaydedilecek notu yazmalısınız");
                      return;
                    }
                    setCandidateNotes((v) => ({
                      ...v,
                      [String(selected.id)]: noteDraft.trim(),
                    }));
                    setNoteDraft("");
                    notify("Not merkezi olarak kaydedildi");
                  }}
                  className="mt-3 rounded-xl bg-black px-4 py-3 text-[10px] text-white"
                >
                  Notu Kaydet
                </button>
              </>
            )}
          </div>
        </aside>
      </>
    ) : null;
  if (!authResolved) return <div className="grid min-h-screen place-items-center bg-[#f4f5f7] text-[12px] text-black/45">Güvenli oturum kontrol ediliyor…</div>;
  if (!membership) return <div className="grid min-h-screen place-items-center bg-[#f4f5f7] p-5 text-[#17191c]"><div className="w-full max-w-[520px] rounded-[28px] border bg-white p-7 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff200]"><ShieldCheck size={21}/></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-black/35">UMAYv2 güvenli erişim</p><h1 className="mt-2 text-[25px] font-semibold">Google hesabınızla giriş yapın</h1><p className="mt-3 text-[11px] leading-5 text-black/55">CRM verileri artık yalnızca tanımlı ve doğrulanmış kullanıcılar tarafından kullanılabilir. Giriş yapılmadan aday, teklif, kampanya veya fiyat kaydı oluşturulamaz.</p>{authMessage&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800">{authMessage}</p>}<button disabled={authBusy} onClick={()=>void signInFounder()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-[11px] font-semibold text-white disabled:opacity-50"><LogIn size={15}/>{authBusy?'Doğrulanıyor…':'Google ile Giriş'}</button><div className="mt-5 border-t pt-5"><p className="text-[10px] font-semibold">Bu bilgisayarda girişsiz oluşturulmuş eski kayıtlar varsa</p><p className="mt-1 text-[9px] leading-4 text-black/45">Giriş yapmadan önce kurtarma dosyasını indirin. Dosya merkezî veriye otomatik eklenmez.</p><button onClick={()=>{const count=downloadLocalRecovery();setAuthMessage(count?`${count} yerel veri grubu kurtarma dosyasına indirildi.`:'Bu cihazda kurtarılacak yerel UMAY verisi bulunamadı.')}} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-semibold"><Download size={14}/>Bu cihazdaki eski verileri indir</button></div></div></div>;
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#17191c]">
      <Sidebar />
      <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b bg-white/95 px-4 lg:ml-[270px] lg:px-7">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobile(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border lg:hidden"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-[13px] font-semibold">UMAYv2</p>
            <p className="text-[10px] text-black/40">{role} çalışma alanı</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-xl border bg-black/[.025] px-3 py-2 text-[10px] font-semibold text-black/55 sm:block">{role} · {membership.branch}</div>
          {role === "Kurucu" && (
            <button
              onClick={() => void downloadUmayData().then(() => notify("Canlı veri yedeği indirildi")).catch(() => notify("Veri yedeği indirilemedi"))}
              aria-label="Canlı veri yedeğini indir"
              title="Canlı veri yedeğini indir"
              className="grid h-9 w-9 place-items-center rounded-xl border"
            >
              <Download size={16} />
            </button>
          )}
          <button
            onClick={() => notify("Yeni bildirim bulunmuyor")}
            aria-label="Bildirimler"
            className="grid h-9 w-9 place-items-center rounded-xl border"
          >
            <Bell size={16} />
          </button>
        </div>
      </header>
      <main className="lg:ml-[270px]">
        <section className="px-4 pt-4 lg:px-7" aria-label="Hesap güvenliği">
          {manageUsers && <UserManagement onClose={()=>setManageUsers(false)} onNotice={notify}/>}<div className={`flex flex-col gap-3 rounded-[20px] border p-4 sm:flex-row sm:items-center sm:justify-between ${membership ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${membership ? "bg-emerald-600 text-white" : "bg-[#fff200] text-black"}`}><ShieldCheck size={18}/></span>
              <div>
                <p className="text-[12px] font-semibold">{membership ? `${membership.role} hesabı doğrulandı` : "Güvenli kullanıcı geçişi"}</p>
                <p className="mt-1 text-[10px] text-black/55">{`${membership.name} · ${membership.email} · ${membership.branch}`}</p>
              </div>
            </div>
            {membership ? <div className="flex shrink-0 flex-wrap gap-2">{membership.role!=='Danışman'&&<button onClick={()=>setArchiveOpen(true)} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-[10px] font-semibold"><Archive size={14}/>Arşiv</button>}{membership.role==='Kurucu'&&<button onClick={()=>setManageUsers(true)} className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-[10px] font-semibold text-white"><Users size={14}/>Kullanıcı Yönetimi</button>}<button onClick={()=>void signOut()} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-[10px] font-semibold"><LogOut size={14}/>Oturumu Kapat</button></div> : <button disabled={authBusy} onClick={()=>void signInFounder()} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-[10px] font-semibold text-white disabled:opacity-50"><LogIn size={14}/>{authBusy ? "Doğrulanıyor…" : "Google ile Giriş"}</button>}
          </div>
        </section>
        <div className="mx-auto max-w-[1550px] p-4 md:p-7">
          {page === "dashboard" && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/35">
                    {dashboardDateLabel}
                  </p>
                  <h1 className="text-[30px] font-semibold">
                    {role === "Satış Danışmanı"
                      ? "Bugünün Merkezi"
                      : "Yönetici Merkezi"}
                  </h1>
                </div>
                <button
                  onClick={() => openWizard(scopeCandidates[0])}
                  className="rounded-xl bg-black px-4 py-3 text-[11px] text-white"
                >
                  <Plus size={14} className="mr-2 inline" />
                  Yeni Teklif
                </button>
              </div>
              <FilterBar kind="dashboard" />
              <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <Kpi title="Tahsilat" value={money(sales.collection)} />
                <Kpi title="Ciro" value={money(sales.revenue)} />
                <Kpi title="Kayıt" value={String(sales.sales)} />
                <Kpi title="Satılan Kur" value={String(sales.courses)} />
                <Kpi
                  title="Hedef"
                  value={
                    sales.target > 0 ? "%" + Math.round((sales.collection / sales.target) * 100) : "Tanımsız"
                  }
                />
                <Kpi
                  title="Hedefe Kalan"
                  value={sales.target > 0 ? money(Math.max(0, sales.target - sales.collection)) : "Hedef belirleyin"}
                  dark
                />
              </section>
              <div className="mt-6">
                <h2 className="text-[17px] font-semibold">
                  Teklif Performansı
                </h2>
                <p className="text-[10px] text-black/40">
                  Satış sürecinin teklif katmanı
                </p>
              </div>
              <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <Kpi
                  title="Oluşturulan"
                  value={String(visibleOffers.length)}
                  onClick={() => setPage("offers")}
                />
                <Kpi
                  title="Açık"
                  value={String(
                    visibleOffers.filter((o) => o.status !== "Kazanıldı")
                      .length,
                  )}
                  onClick={() => setPage("offers")}
                />
                <Kpi
                  title="Onay Bekleyen"
                  value={String(
                    visibleOffers.filter((o) => o.status === "Onay bekliyor")
                      .length,
                  )}
                  onClick={() => setPage("offers")}
                />
                <Kpi
                  title="Kazanılan"
                  value={String(
                    visibleOffers.filter((o) => o.status === "Kazanıldı")
                      .length,
                  )}
                  onClick={() => setPage("offers")}
                />
                <Kpi
                  title="Toplam Tutar"
                  value={money(visibleOffers.reduce((a, b) => a + b.total, 0))}
                  onClick={() => setPage("offers")}
                />
                <Kpi
                  title="Dönüşüm"
                  value={
                    "%" +
                    Math.round(
                      (visibleOffers.filter((o) => o.status === "Kazanıldı")
                        .length /
                        Math.max(visibleOffers.length, 1)) *
                        100,
                    )
                  }
                  dark
                  onClick={() => setPage("analytics")}
                />
              </section>
              <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-[22px] border bg-white p-5">
                  <h2 className="text-[14px] font-semibold">
                    Danışman Performansı
                  </h2>
                  <div className="mt-4 overflow-auto">
                    <table className="w-full min-w-[650px] text-left text-[10px]">
                      <thead className="text-[9px] uppercase text-black/35">
                        <tr>
                          <th className="py-2">Danışman</th>
                          <th>Şube</th>
                          <th>Tahsilat</th>
                          <th>Kayıt</th>
                          <th>Kur</th>
                          <th>Hedef</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(role === "Satış Danışmanı"
                          ? [{name: currentUserName, branch: currentBranch, collection: sales.collection, sales: sales.sales, courses: sales.courses, rate: Math.round(sales.collection / Math.max(sales.target, 1) * 100)}]
                          : people.filter((p) => role === "Kurucu" || p.branch === currentBranch))
                          .map((p) => (
                            <tr key={p.name} className="border-t">
                              <td className="py-3 font-semibold">{p.name}</td>
                              <td>{p.branch}</td>
                              <td>{money(p.collection)}</td>
                              <td>{p.sales}</td>
                              <td>{p.courses}</td>
                              <td>%{p.rate}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-[22px] bg-[#1d2024] p-5 text-white">
                  <p className="text-[9px] uppercase tracking-[.14em] text-white/40">
                    Bugünün fırsatı
                  </p>
                  <p className="mt-2 text-[25px] font-semibold">
                    {followUpOffers.length
                      ? `${followUpOffers.length} teklif takip bekliyor`
                      : "Takip bekleyen teklif yok"}
                  </p>
                  <p className="mt-2 text-[11px] text-white/55">
                    {visibleOffers.length
                      ? `${expiringTodayCount} teklif bugün sona eriyor. ${pendingApprovalCount} teklif müdür onayında.`
                      : "Henüz size ait bir teklif bulunmuyor."}
                  </p>
                  <button
                    onClick={() => setPage("offers")}
                    className="mt-5 rounded-xl bg-[#fff200] px-4 py-2.5 text-[10px] text-black"
                  >
                    Teklifleri aç
                  </button>
                </div>
              </section>
              <section className="mt-4 rounded-[22px] border bg-white p-5">
                <div className="flex justify-between">
                  <h2 className="text-[14px] font-semibold">
                    Teklif Dönüşüm Hunisi
                  </h2>
                  <button
                    onClick={() => setPage("analytics")}
                    className="text-[10px]"
                  >
                    Detaylı analiz →
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  {offerFunnel.map(([l, v, w]) => (
                    <div key={String(l)}>
                      <div className="flex justify-between text-[9px]">
                        <span>{l}</span>
                        <b>{v}</b>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-black"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {page === "candidates" && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-[28px] font-semibold">
                    Aday Çalışma Alanı
                  </h1>
                  <p className="text-[11px] text-black/40">
                    Yoğun operasyon tablosu · satıra tıklayarak detay aç
                  </p>
                </div>
                <button
                  onClick={openNewCandidate}
                  className="rounded-xl bg-black px-4 py-3 text-[11px] text-white"
                >
                  <Plus size={14} className="mr-2 inline" />
                  Yeni Aday Ekle
                </button>
              </div>
              <FilterBar kind="candidates" />
              <section className="mt-3 overflow-hidden rounded-[20px] border bg-white">
                <div className="max-h-[calc(100vh-255px)] min-h-[540px] overflow-auto">
                  <table className="w-full min-w-[1500px] text-left">
                    <thead className="sticky top-0 z-10 bg-[#f7f8fa] text-[9px] uppercase text-black/38">
                      <tr>
                        <th className="sticky left-0 z-20 bg-[#f7f8fa] p-3">
                          Aday / Telefon
                        </th>
                        {role !== "Satış Danışmanı" && <th>Danışman</th>}
                        <th>İlk Görüşme</th>
                        <th>Program</th>
                        <th>Kur</th>
                        <th>Kaynak</th>
                        <th>Kuruma Gelme</th>
                        <th>Randevu</th>
                        <th>Durum</th>
                        <th>Teklif</th>
                        <th>Anlaşma</th>
                        <th>Tahsilat</th>
                        <th className="sticky right-0 z-20 bg-[#f7f8fa]">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => {
                            setSelected(c);
                            setTab("Genel");
                          }}
                          className="h-[44px] cursor-pointer border-t text-[10px] hover:bg-[#fff200]/10"
                        >
                          <td className="sticky left-0 z-[5] bg-white p-3">
                            <b>{c.name}</b>
                            <p className="text-[9px] text-amber-600">
                              {c.phone}
                            </p>
                          </td>
                          {role !== "Satış Danışmanı" && (
                            <td>
                              <b>{c.owner}</b>
                              <p className="text-[9px] text-black/35">
                                {c.branch}
                              </p>
                            </td>
                          )}
                          <td>{c.first}</td>
                          <td>{c.program}</td>
                          <td>{c.course}</td>
                          <td>{c.source}</td>
                          <td>{c.arrival}</td>
                          <td>{c.appointment}</td>
                          <td>{c.status === 'Kesin Kayıt' || registrationForCandidate(c)?.registrationComplete ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800"><Check size={11} /> Kesin Kayıt</span> : <span>{c.status}</span>}</td>
                          <td className="font-semibold text-amber-700">
                            {candidateOfferLabel(c)}
                          </td>
                          <td>{c.agreement}</td>
                          <td className="font-semibold">{c.collection}</td>
                          <td className="sticky right-0 z-[5] w-[190px] bg-white px-3">
                            <div className="flex items-center justify-end gap-2">
                              {c.status === 'Kesin Kayıt' || registrationForCandidate(c)?.registrationComplete ? (
                                <button onClick={(e) => { e.stopPropagation(); openCandidateRegistration(c); }} className="w-[138px] rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700">Kayıt Detayı</button>
                              ) : registrationForCandidate(c) ? (
                                <button onClick={(e) => { e.stopPropagation(); openCandidateRegistration(c); }} className="w-[138px] rounded-xl bg-orange-500 px-3 py-2 font-semibold text-white hover:bg-orange-600">Kesin Kayda Dönüştür</button>
                              ) : (
                                <button onClick={(e) => { e.stopPropagation(); openWizard(c); }} className="w-[138px] rounded-xl bg-[#fff200] px-3 py-2 font-semibold hover:bg-[#f3e600]">Teklif Hazırla</button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const menuHeight = membership?.role !== 'Danışman' && role !== 'Satış Danışmanı' ? 126 : 90; setRowActionMenu({kind: 'candidate', item: c, left: Math.max(12, Math.min(rect.right - 178, window.innerWidth - 190)), top: rect.bottom + menuHeight > window.innerHeight - 12 ? rect.top - menuHeight - 4 : rect.bottom + 4}); }} className="grid h-8 w-8 place-items-center rounded-xl border bg-white text-black/55 hover:bg-black/[.035]" aria-label={`${c.name} diğer işlemler`} aria-haspopup="menu"><MoreHorizontal size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "offers" && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-[28px] font-semibold">Teklif Merkezi</h1>
                  <p className="text-[11px] text-black/40">
                    Tüm tekliflerin operasyon ve durum takibi
                  </p>
                </div>
                <button
                  onClick={() => openWizard()}
                  className="rounded-xl bg-black px-4 py-3 text-[11px] text-white"
                >
                  <Plus size={14} className="mr-2 inline" />
                  Yeni Teklif
                </button>
              </div>
              <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Teklif özeti">
                <article onClick={() => setOfferStatusF("Tüm Durumlar")} className="relative min-h-[112px] cursor-pointer rounded-[20px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"><p className="pr-8 text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Toplam Teklif</p><b className="mt-2 block text-[24px] tabular-nums">{latestVisibleOffers.length}</b><span className="mt-1 block text-[9px] text-slate-500">{offerCandidateCount} farklı aday · {money(offerTotalValue)}</span><button onClick={(e)=>{e.stopPropagation();setOpenKpiInfo(openKpiInfo==="total"?null:"total")}} aria-label="Toplam Teklif açıklaması" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border bg-white"><Info size={13}/></button>{openKpiInfo==="total"&&<div className="absolute right-3 top-11 z-40 w-[250px] rounded-2xl bg-[#17191c] p-3 text-[10px] leading-5 text-white shadow-2xl">Şunu anlatmaya çalışıyorum: Seçili filtrelerdeki güncel teklif sayısını, farklı aday sayısını ve toplam teklif tutarını gösteriyorum. Eski revizyonları ayrıca saymıyorum.</div>}</article>
                <article onClick={() => setOfferStatusF("Aktif Teklifler")} className="relative min-h-[112px] cursor-pointer rounded-[20px] border border-orange-200 bg-orange-50/55 p-4 text-left shadow-sm transition hover:-translate-y-0.5"><p className="pr-8 text-[9px] font-bold uppercase tracking-[.12em] text-orange-700">Aktif Teklifler</p><b className="mt-2 block text-[24px] tabular-nums text-orange-950">{activeVisibleOffers.length}</b><span className="mt-1 block text-[9px] text-orange-800">{discountCounts["Danışman İndirimi"] || 0} danışman · {discountCounts["Müdür İnisiyatifi"] || 0} müdür inisiyatifi</span><button onClick={(e)=>{e.stopPropagation();setOpenKpiInfo(openKpiInfo==="active"?null:"active")}} aria-label="Aktif Teklifler açıklaması" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border bg-white"><Info size={13}/></button>{openKpiInfo==="active"&&<div className="absolute right-3 top-11 z-40 w-[250px] rounded-2xl bg-[#17191c] p-3 text-[10px] leading-5 text-white shadow-2xl">Şunu anlatmaya çalışıyorum: Henüz kesin kayda dönüşmemiş ve işlem yapılmaya devam edilen güncel teklifleri gösteriyorum.</div>}</article>
                <article onClick={() => setOfferStatusF("Kazanıldı")} className="relative min-h-[112px] cursor-pointer rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-4 text-left shadow-sm transition hover:-translate-y-0.5"><p className="pr-8 text-[9px] font-bold uppercase tracking-[.12em] text-emerald-700">Kesin Kayıt</p><b className="mt-2 block text-[24px] tabular-nums text-emerald-950">{registeredVisibleOffers.length}</b><span className="mt-1 block text-[9px] text-emerald-800">{money(registrationRevenue)} sözleşme cirosu</span><button onClick={(e)=>{e.stopPropagation();setOpenKpiInfo(openKpiInfo==="registered"?null:"registered")}} aria-label="Kesin Kayıt açıklaması" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border bg-white"><Info size={13}/></button>{openKpiInfo==="registered"&&<div className="absolute right-3 top-11 z-40 w-[250px] rounded-2xl bg-[#17191c] p-3 text-[10px] leading-5 text-white shadow-2xl">Şunu anlatmaya çalışıyorum: Kesin kayda dönüşen öğrenci sayısını ve toplam sözleşme cirosunu gösteriyorum. Bu tutar tahsilat değildir.</div>}</article>
                <article onClick={() => setOfferStatusF("Kazanıldı")} className="relative min-h-[112px] cursor-pointer rounded-[20px] border border-sky-200 bg-sky-50/55 p-4 text-left shadow-sm transition hover:-translate-y-0.5"><p className="pr-8 text-[9px] font-bold uppercase tracking-[.12em] text-sky-700">Dönüşüm Oranı</p><b className="mt-2 block text-[24px] tabular-nums text-sky-950">%{offerConversionRate.toLocaleString("tr-TR")}</b><span className="mt-1 block text-[9px] text-sky-800">Güncel teklif → kesin kayıt</span><button onClick={(e)=>{e.stopPropagation();setOpenKpiInfo(openKpiInfo==="conversion"?null:"conversion")}} aria-label="Dönüşüm Oranı açıklaması" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border bg-white"><Info size={13}/></button>{openKpiInfo==="conversion"&&<div className="absolute right-3 top-11 z-40 w-[250px] rounded-2xl bg-[#17191c] p-3 text-[10px] leading-5 text-white shadow-2xl">Şunu anlatmaya çalışıyorum: Güncel tekliflerin ne kadarının kesin kayda dönüştüğünü gösteriyorum. Örneğin 6 tekliften 3 kayıt, %50 dönüşümdür.</div>}</article>
                <article onClick={() => topProgram && setOfferProgramF(topProgram.program)} className="relative min-h-[112px] cursor-pointer rounded-[20px] border border-violet-200 bg-violet-50/55 p-4 text-left shadow-sm transition hover:-translate-y-0.5"><p className="pr-8 text-[9px] font-bold uppercase tracking-[.12em] text-violet-700">Program Dağılımı</p><b className="mt-2 block truncate text-[15px] text-violet-950">{topProgram?.program || "Veri yok"}</b><span className="mt-1 block text-[9px] text-violet-800">{topProgram ? `%${Math.round(topProgram.count / Math.max(latestVisibleOffers.length, 1) * 100)} · ${programBreakdown.slice(1, 3).map((item) => item.program + " " + item.count).join(" · ") || "Tek program"}` : "Filtrelere uygun teklif yok"}</span><button onClick={(e)=>{e.stopPropagation();setOpenKpiInfo(openKpiInfo==="program"?null:"program")}} aria-label="Program Dağılımı açıklaması" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border bg-white"><Info size={13}/></button>{openKpiInfo==="program"&&<div className="absolute right-3 top-11 z-40 w-[250px] rounded-2xl bg-[#17191c] p-3 text-[10px] leading-5 text-white shadow-2xl">Şunu anlatmaya çalışıyorum: Tekliflerde en fazla tercih edilen eğitim programını ve diğer programların dağılımını gösteriyorum.</div>}</article>
              </section>
              <FilterBar kind="offers" />
              <div className="mt-3 overflow-auto rounded-[22px] border bg-white">
                <table className="w-full min-w-[1250px] text-left text-[10px]">
                  <thead className="bg-black/[.035] text-[9px] uppercase text-black/40">
                    <tr>
                      <th className="p-4">İndirim Türü</th>
                      <th>Aday</th>
                      <th>Telefon / Kaynak</th>
                      <th>Danışman</th>
                      <th>Şube</th>
                      <th>Program</th>
                      <th>Kampanya</th>
                      <th>Ödeme</th>
                      <th>Geçerlilik</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOffers.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[9px] font-semibold ${o.discountAuthority === "Müdür İnisiyatifi" ? "bg-orange-100 text-orange-800" : o.discountAuthority === "Danışman İndirimi" ? "bg-[#fff200] text-black" : o.discountAuthority === "Kurucu Onayı" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"}`}>{o.discountAuthority || "Ek İndirim Yok"}{Number(o.discountRate) > 0 ? ` · %${o.discountRate}` : ""}</span></td>
                        <td>
                          <b>{o.candidate}</b>
                          {o.guest && (
                            <span className="ml-2 rounded-full bg-violet-50 px-2 py-1 text-[8px] text-violet-700">
                              Misafir
                            </span>
                          )}
                        </td>
                        <td>
                          <b>{o.phone || linkedCandidate(o)?.phone || "Eksik"}</b>
                          <span className="block text-[8px] text-black/40">{o.source || linkedCandidate(o)?.source || "Kaynak eklenmedi"}</span>
                        </td>
                        <td>{o.owner}</td>
                        <td>{o.branch}</td>
                        <td>{o.program}</td>
                        <td>{o.campaign}</td>
                        <td>
                          {o.payment}
                          {Boolean(o.alternatives?.length) && (
                            <span className="ml-1 text-[8px] text-black/40">
                              +{o.alternatives?.length} alternatif
                            </span>
                          )}
                        </td>
                        <td>{o.expiry}</td>
                        <td className="font-semibold">{money(o.total)}</td>
                        <td>
                          <span className={`rounded-full px-2 py-1 font-semibold ${o.registrationComplete ? 'bg-emerald-100 text-emerald-800' : o.status === 'Onay bekliyor' ? 'bg-rose-100 text-rose-800' : o.status === 'Kazanıldı' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                            {o.registrationComplete ? 'Kesin Kayıt' : o.status === 'Onay bekliyor' ? 'Kurucu onayı bekliyor' : o.status}
                          </span>
                          {o.status === 'Kazanıldı' && !o.registrationComplete && <span className="mt-1 block text-[8px] font-semibold text-red-600">Kayıt bilgisi eksik</span>}
                        </td>
                        <td className="w-[205px] px-3">
                          <div className="flex items-center justify-end gap-2">
                            {o.registrationComplete ? (
                              <button onClick={() => openRegistration(o)} className="w-[148px] rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700">Kayıt Detayı</button>
                            ) : o.guest ? (
                              <button onClick={() => convertGuestOffer(o)} className="w-[148px] rounded-xl bg-violet-600 px-3 py-2 font-semibold text-white hover:bg-violet-700">Adaya Dönüştür</button>
                            ) : canStartRegistration(o) ? (
                              <button onClick={() => openRegistration(o)} className="w-[148px] rounded-xl bg-orange-500 px-3 py-2 font-semibold text-white hover:bg-orange-600">{o.status === 'Kazanıldı' ? 'Kaydı Tamamla' : 'Kesin Kayda Dönüştür'}</button>
                            ) : (
                              <button onClick={() => openOffer(o)} className="w-[148px] rounded-xl border bg-white px-3 py-2 font-semibold hover:bg-black/[.035]">Teklifi Aç</button>
                            )}
                            <button onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const menuHeight = 198; setRowActionMenu({kind: 'offer', item: o, left: Math.max(12, Math.min(rect.right - 178, window.innerWidth - 190)), top: rect.bottom + menuHeight > window.innerHeight - 12 ? rect.top - menuHeight - 4 : rect.bottom + 4}); }} className="grid h-8 w-8 place-items-center rounded-xl border bg-white text-black/55 hover:bg-black/[.035]" aria-label={`${o.id} diğer işlemler`} aria-haspopup="menu"><MoreHorizontal size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {page === "targets" && <TargetManagement membership={membership} education={education} money={money} notify={notify} actual={{registrations:new Set(wonOffers.map(o=>o.candidateId||o.id)).size,courses:sales.courses,revenue:sales.revenue,downPayment:wonOffersWithCourse.reduce((sum,o)=>sum+(Number(o.financeSnapshot?.downPayment)||0),0),salesCollection:null,totalPeriodCollection:null,missingCourseRegistrations,records:wonOffers.map(o=>{const c=scopeCandidates.find(x=>x.id===o.candidateId)||linkedCandidate(o);return{id:o.id,student:c?.name||o.candidate||'—',date:o.registeredAt||o.date||o.createdAt||'—',education:c?.program||o.program||'—',advisor:c?.owner||o.owner||'—',source:o.source||c?.source||'Kaynak belirtilmemiş',paidCourses:Number(o.paidCourses||c?.course)||null,revenue:Number(o.total)||0,downPayment:Number(o.financeSnapshot?.downPayment)||0,branch:o.branch,status:o.registrationComplete?'Kesin Kayıt':o.status}})}} />}
          {page === "campaigns" && role !== "Satış Danışmanı" && (
            <PricingManagement
              role={role}
              campaigns={campaigns}
              setCampaigns={setCampaigns}
              money={money}
              notify={notify}
            />
          )}{" "}
          {false && page === "campaigns" && role !== "Satış Danışmanı" && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-[28px] font-semibold">
                    Kampanyalar ve Fiyatlar
                  </h1>
                  <p className="text-[11px] text-black/40">
                    Teklif sihirbazının fiyat ve avantaj motoru
                  </p>
                </div>
                <button
                  onClick={() => setNewCampaign(true)}
                  className="rounded-xl bg-black px-4 py-3 text-[11px] text-white"
                >
                  <Plus size={14} className="mr-2 inline" />
                  Kampanya Ekle
                </button>
              </div>
              <FilterBar kind="campaigns" />
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {visibleCampaigns.map((c) => (
                  <article
                    key={c.id}
                    className="rounded-[22px] border bg-white p-5"
                  >
                    <div className="flex justify-between">
                      <div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] text-emerald-700">
                          {c.status}
                        </span>
                        <h3 className="mt-3 text-[15px] font-semibold">
                          {c.name}
                        </h3>
                        <p className="text-[10px] text-black/40">
                          {c.program} · {c.branch}
                        </p>
                      </div>
                      <button
                        onClick={() => notify("Kampanya düzenleme açıldı")}
                        className="rounded-lg border px-3 py-2 text-[9px]"
                      >
                        Düzenle
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        ["Liste", money(c.list)],
                        ["Nakit", money(c.cash)],
                        ["Kart", money(c.card)],
                        ["Senet", money(c.note)],
                        ["Kur", c.buy + "+" + c.gift],
                        ["Saat", String(c.hours)],
                      ].map(([a, b]) => (
                        <div
                          key={a}
                          className="rounded-xl bg-black/[.035] p-3 text-[9px]"
                        >
                          <p className="text-black/35">{a}</p>
                          <b>{b}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "analytics" && (
            <>
              <h1 className="text-[28px] font-semibold">Teklif Analitikleri</h1>
              <p className="text-[11px] text-black/40">
                {role === "Satış Danışmanı" ? "Kendi teklif ve dönüşüm performansınız" : "Dönüşüm, kampanya ve danışman performansı"}
              </p>
              <FilterBar kind="analytics" />
              <section className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[22px] border bg-white p-5 xl:col-span-2">
                  <h2 className="text-[13px] font-semibold">
                    Kampanya Dönüşümü
                  </h2>
                  <div className="mt-5 space-y-4">
                    {(role === "Satış Danışmanı"
                      ? Array.from(new Set(scopeOffers.map((o) => o.campaign))).map((name) => {
                          const own = scopeOffers.filter((o) => o.campaign === name), won = own.filter((o) => o.status === "Kazanıldı").length;
                          return [name, own.length, won, Math.round(won / Math.max(own.length, 1) * 100)];
                        })
                      : [["2+1 Temmuz", 18, 7, 39], ["Junior Yeni Dönem", 12, 5, 42], ["Teenage Erken Kayıt", 9, 4, 44], ["Almanca Yaz", 4, 1, 25]])
                      .map(([n, t, s, r]) => (
                      <div key={String(n)}>
                        <div className="flex justify-between text-[10px]">
                          <span>{n}</span>
                          <span>
                            {t} teklif · {s} satış · <b>%{r}</b>
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-black/5">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${r}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border bg-white p-5">
                  <h2 className="text-[13px] font-semibold">
                    {role === "Satış Danışmanı" ? "Kendi Performansım" : "Danışman Sıralaması"}
                  </h2>
                  {(role === "Satış Danışmanı"
                    ? [[currentUserName, scopeOffers.length, scopeOffers.filter((o) => o.status === "Kazanıldı").length, Math.round(scopeOffers.filter((o) => o.status === "Kazanıldı").length / Math.max(scopeOffers.length, 1) * 100)]]
                    : [["Ayşenur Kaya", 14, 5, 36], ["Mert Yılmaz", 11, 2, 18], ["Ece Arslan", 9, 6, 67], ["Selin Koç", 7, 2, 29]])
                    .map(([n, t, s, r], i) => (
                    <div key={String(n)} className="mt-3 flex items-center gap-3 rounded-xl bg-black/[.035] p-3">
                      {role !== "Satış Danışmanı" && <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[10px]">{i + 1}</span>}
                      <div className="flex-1"><b className="text-[10px]">{n}</b><p className="text-[9px] text-black/40">{t} teklif · {s} satış</p></div>
                      <b>%{r}</b>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Detail />
      {newCandidate && (
        <div className="fixed inset-0 z-[90] bg-black/40 p-0 md:p-5">
          <div className="mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden bg-[#f5f6f8] md:rounded-[28px]">
            <header className="flex items-center justify-between border-b bg-white p-5">
              <div>
                <p className="text-[9px] uppercase tracking-[.14em] text-black/35">
                  Aday çalışma alanı
                </p>
                <h2 className="text-[20px] font-semibold">
                  {editingCandidate ? "Aday Bilgilerini Düzenle" : "Yeni Aday Ekle"}
                </h2>
                <p className="mt-1 text-[10px] text-black/40">
                  İlk görüşme için gerekli temel bilgileri tek ekranda girin.
                </p>
              </div>
              <button onClick={() => setNewCandidate(false)}>
                <X />
              </button>
            </header>
            <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_340px]">
              <div className="overflow-y-auto p-5">
                <section className="rounded-[22px] border bg-white p-5">
                  <h3 className="text-[13px] font-semibold">Aday Bilgileri</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-[9px] font-semibold">
                      Ad *
                      <input
                        value={candidateForm.firstName}
                        onChange={(e) =>
                          setCandidateField("firstName", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                        placeholder="Ad"
                      />
                    </label>
                    <label className="text-[9px] font-semibold">
                      Soyad *
                      <input
                        value={candidateForm.lastName}
                        onChange={(e) =>
                          setCandidateField("lastName", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                        placeholder="Soyad"
                      />
                    </label>
                    <label className="text-[9px] font-semibold">
                      Telefon *
                      <input
                        value={candidateForm.phone}
                        onChange={(e) =>
                          setCandidateField("phone", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                        placeholder="05xx xxx xx xx"
                      />
                    </label>
                    <label className="text-[9px] font-semibold">
                      2. Telefon
                      <input
                        value={candidateForm.phone2}
                        onChange={(e) =>
                          setCandidateField("phone2", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                        placeholder="İsteğe bağlı"
                      />
                    </label>
                    <label className="text-[9px] font-semibold">
                      E-posta
                      <input value={candidateForm.email || ""} onChange={(e) => setCandidateField("email", e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-[11px]" placeholder="İsteğe bağlı" />
                    </label>
                    <label className="text-[9px] font-semibold">
                      Adres
                      <input value={candidateForm.address || ""} onChange={(e) => setCandidateField("address", e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-[11px]" placeholder="İsteğe bağlı" />
                    </label>
                    <label className="text-[9px] font-semibold">
                      Program *
                      <select
                        value={candidateForm.program}
                        onChange={(e) => {
                          setCandidateField("program", e.target.value);
                          setCandidateField("level", "");
                          setCandidateField("campaign", "");
                        }}
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">Program seçin</option>
                        {education
                          .filter((e) => e.active)
                          .map((e) => (
                            <option key={e.id}>{e.name}</option>
                          ))}
                      </select>
                    </label>
                    <label className="text-[9px] font-semibold">
                      Seviye *
                      <select
                        value={candidateForm.level}
                        onChange={(e) =>
                          setCandidateField("level", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">Seviye seçin</option>
                        {(candidateForm.program === "Junior"
                          ? ["Junior 1", "Junior 2", "Junior 3", "Junior 4"]
                          : candidateForm.program === "Teenage"
                            ? [
                                "Teenage 1",
                                "Teenage 2",
                                "Teenage 3",
                                "Teenage 4",
                              ]
                            : ["Başlangıç", "A1", "A2", "B1", "B2", "C1", "C2"]
                        ).map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[9px] font-semibold">
                      Kur Sayısı / Kampanya *
                      <select
                        value={candidateForm.campaign}
                        onChange={(e) =>
                          setCandidateField("campaign", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">Kur veya kampanya seçin</option>
                        {campaigns
                          .filter(
                            (c) =>
                              c.status === "Aktif" &&
                              !c.archived &&
                              (!candidateForm.program ||
                                c.program === candidateForm.program) &&
                              (!c.start || c.start <= today) &&
                              (!c.end || c.end >= today),
                          )
                          .map((c) => (
                            <option key={c.id}>{c.name}</option>
                          ))}
                        {["1 Kur", "2 Kur", "3 Kur", "4 Kur", "6 Kur"].map(
                          (x) => (
                            <option key={x}>{x}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="text-[9px] font-semibold">
                      Kaynak *
                      <select
                        value={candidateForm.source}
                        onChange={(e) =>
                          setCandidateField("source", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">Kaynak seçin</option>
                        {sourceOptions.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
                <section className="mt-4 rounded-[22px] border bg-white p-5">
                  <div>
                    <h3 className="text-[13px] font-semibold">
                      Veli ve İkamet Bilgileri
                    </h3>
                    <p className="text-[9px] text-black/40">
                      Bu bölüm isteğe bağlıdır.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-[9px] font-semibold">
                      Veli Adı Soyadı
                      <input
                        value={candidateForm.guardianName}
                        onChange={(e) =>
                          setCandidateField("guardianName", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                      />
                    </label>
                    <label className="text-[9px] font-semibold">
                      Yakınlık
                      <select
                        value={candidateForm.guardianRelation}
                        onChange={(e) =>
                          setCandidateField("guardianRelation", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">Seçin</option>
                        <option>Anne</option>
                        <option>Baba</option>
                        <option>Vasi</option>
                        <option>Diğer</option>
                      </select>
                    </label>
                    <label className="text-[9px] font-semibold">
                      Veli Telefon 1
                      <input
                        value={candidateForm.guardianPhone1}
                        onChange={(e) =>
                          setCandidateField("guardianPhone1", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                      />
                    </label>
                    <label className="text-[9px] font-semibold">
                      Veli Telefon 2
                      <input
                        value={candidateForm.guardianPhone2}
                        onChange={(e) =>
                          setCandidateField("guardianPhone2", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border p-3 text-[11px]"
                      />
                    </label>
                    <label className="text-[9px] font-semibold sm:col-span-2">
                      İkamet İlçesi
                      <select
                        value={candidateForm.district}
                        onChange={(e) =>
                          setCandidateField("district", e.target.value)
                        }
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">İlçe seçin</option>
                        {[
                          "İzmit",
                          "Başiskele",
                          "Kartepe",
                          "Derince",
                          "Körfez",
                          "Gölcük",
                          "Karamürsel",
                          "Kandıra",
                          "Gebze",
                          "Darıca",
                          "Çayırova",
                          "Dilovası",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
              </div>
              <aside className="hidden border-l bg-white p-5 lg:block">
                <p className="text-[9px] font-bold uppercase tracking-[.14em] text-black/35">
                  Canlı Aday Özeti
                </p>
                <div className="mt-4 rounded-[22px] bg-[#17191c] p-5 text-white">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff200] text-lg font-black text-black">
                    {candidateForm.firstName?.[0] || "Y"}
                  </div>
                  <h3 className="mt-4 text-[18px] font-semibold">
                    {(
                      candidateForm.firstName +
                      " " +
                      candidateForm.lastName
                    ).trim() || "Yeni Aday"}
                  </h3>
                  <p className="text-[10px] text-white/45">
                    {candidateForm.phone || "Telefon girilmedi"}
                  </p>
                  <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[10px]">
                    {[
                      ["Program", candidateForm.program || "—"],
                      ["Seviye", candidateForm.level || "—"],
                      ["Kur / Kampanya", candidateForm.campaign || "—"],
                      ["Kaynak", candidateForm.source || "—"],
                      [
                        "Şube",
                        role === "Kurucu" && branchF !== "Tüm Şubeler"
                          ? branchF
                          : "İzmit",
                      ],
                      [
                        "Oluşturan",
                        role === "Kurucu" ? "Erdem Türköz" : "Ayşenur Kaya",
                      ],
                    ].map(([a, b]) => (
                      <div key={a} className="flex justify-between gap-3">
                        <span className="text-white/40">{a}</span>
                        <b className="text-right">{b}</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-[18px] bg-emerald-50 p-4 text-[10px] text-emerald-800">
                  Aday oluşturulduğunda şube, oluşturan kullanıcı ve teknik
                  zaman bilgisi Timeline’a otomatik işlenir. Öğrenci kayıt
                  tarihi oluşturulmaz.
                </div>
              </aside>
            </div>
            <footer className="flex items-center justify-between border-t bg-white p-4">
              <button
                onClick={() => { setNewCandidate(false); setEditingCandidate(null); }}
                className="rounded-xl border px-4 py-2.5 text-[10px]"
              >
                İptal
              </button>
              <button
                onClick={createCandidate}
                className="rounded-xl bg-black px-5 py-3 text-[11px] text-white"
              >
                <Plus size={14} className="mr-2 inline" />
                {editingCandidate ? "Değişiklikleri Kaydet" : "Yeni Adayı Kaydet"}
              </button>
            </footer>
          </div>
        </div>
      )}
      {wizard && (
        <div className="fixed inset-0 z-[90] bg-black/40 p-0 md:p-5">
          <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden bg-[#f5f6f8] md:rounded-[28px]">
            <header className="flex justify-between border-b bg-white p-5">
              <div>
                <p className="text-[9px] uppercase tracking-[.14em] text-black/35">
                  Teklif hazırlama merkezi
                </p>
                  <h2 className="text-[20px] font-semibold">
                  {revisionSource ? `Teklifi Revize Et · ${revisionSource.id}` : "Yeni Eğitim Teklifi"}
                </h2>
                <p className="mt-1 text-[10px] text-black/40">
                  {revisionSource ? "Önceki teklif korunur; bu işlem yeni bir sürüm oluşturur." : "Aday, kampanya, ödeme ve avantajları tek ekranda düzenleyin."}
                </p>
              </div>
              <button onClick={() => setWizard(false)}>
                <X />
              </button>
            </header>
            <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(380px,440px)_minmax(0,1fr)]">
              <div className="overflow-y-auto p-4">
                {true && (
                  <div className="space-y-3 rounded-[20px] border bg-white p-4">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[.12em] text-black/35">
                        Aday ve eğitim
                      </p>
                      <h3 className="text-[17px] font-semibold">
                        Aday ve eğitim seçimi
                      </h3>
                    </div>
                    <input
                      list="candidate-suggestions"
                      value={guestName}
                      onChange={(e) => {
                        const name = e.target.value,
                          c = candidateList.find((x) => x.name === name);
                        setGuestName(name);
                        setWc(c);
                        if (c) {
                          setProgram(c.program);
                          setGuestPhone(c.phone);
                          setGuestSource(c.source);
                        }
                      }}
                      placeholder="Herhangi bir öğrenci adayı adı yazın"
                      className="w-full rounded-xl border bg-white p-3 text-[11px]"
                    />
                    <datalist id="candidate-suggestions">
                      {scopeCandidates.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.program} · {c.branch}
                        </option>
                      ))}
                    </datalist>
                    <select
                      value={wc?.id || ""}
                      onChange={(e) => {
                        const c = candidateList.find(
                          (x) => x.id === Number(e.target.value),
                        );
                        setWc(c);
                        setGuestName(c?.name || guestName);
                        setGuestPhone(c?.phone || "");
                        setGuestSource(c?.source || "");
                        setProgram(c?.program || program);
                      }}
                      className="w-full rounded-xl border bg-white p-3 text-[11px]"
                    >
                      <option value="">Aday seçin</option>
                      {scopeCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.program}
                        </option>
                      ))}
                    </select>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-[9px] font-semibold">
                        Telefon *
                        <input value={guestPhone} disabled={!!wc} onChange={(e) => setGuestPhone(e.target.value)} placeholder="05XX XXX XX XX" className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px] disabled:bg-black/[.035]" />
                      </label>
                      <label className="text-[9px] font-semibold">
                        Başvuru Kaynağı *
                        <select value={guestSource} disabled={!!wc} onChange={(e) => setGuestSource(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px] disabled:bg-black/[.035]">
                          <option value="">Kaynak seçin</option>
                          {sourceOptions.map((source) => <option key={source}>{source}</option>)}
                        </select>
                      </label>
                    </div>
                    {!wc && guestPhone && !validTrPhone(guestPhone) && <p className="text-[9px] text-red-600">Telefon 05XX XXX XX XX biçiminde olmalıdır.</p>}
                    <select
                      value={program}
                      onChange={(e) => {
                        setProgram(e.target.value);
                        setCampaignId(undefined);
                      }}
                      className="w-full rounded-xl border bg-white p-3 text-[11px]"
                    >
                      <option value="">Eğitim tipi seçin</option>
                      {education
                        .filter((e) => e.active)
                        .map((e) => (
                          <option key={e.id}>{e.name}</option>
                        ))}
                    </select>
                  </div>
                )}
                {true && (
                  <div className="mt-3 rounded-[18px] border bg-white p-4">
                    <label className="text-[10px] font-semibold">
                      Kampanya
                      <select
                        value={campaignId || ""}
                        onChange={(e) => {
                          const c = active.find(
                            (x) => x.id === Number(e.target.value),
                          );
                          setCampaignId(c?.id);
                          setFinanceRuleId(undefined);
                          setInstallmentCount(undefined);
                          setAlternatives([]);
                          setPayment("Nakit");
                          if (c) {
                            setBookGift(c.bookGift);
                            setValidity(c.validity);
                          }
                        }}
                        className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"
                      >
                        <option value="">Aktif kampanya seçin</option>
                        {active.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ·{" "}
                            {c.pricingModel === "HOURLY"
                              ? money(c.cash) + "/saat"
                              : money(c.cash)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {campaign && (
                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-amber-50 p-3 text-[10px]">
                        <span>
                          <b className="block">{campaign.name}</b>
                          {campaign.program} · {campaign.branch}
                        </span>
                        <span className="text-right">
                          <b className="block">
                            {campaign.pricingModel === "HOURLY"
                              ? money(campaign.cash) +
                                "/saat × " +
                                (campaign.defaultHours || campaign.hours)
                              : money(campaign.cash)}
                          </b>
                          {campaign.pricingModel === "HOURLY"
                            ? "Toplam " +
                              money(
                                campaign.cash *
                                  (campaign.defaultHours ||
                                    campaign.hours ||
                                    1),
                              )
                            : (campaign.start || "") +
                              " – " +
                              (campaign.end || "")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {true && (
                  <div className="mt-4 rounded-[20px] border bg-white p-4">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[.12em] text-black/35">
                        Ödeme planı
                      </p>
                      <h3 className="text-[17px] font-semibold">
                        Ödeme ve avantajlar
                      </h3>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(["Nakit", "Kredi Kartı", "Senet"] as const).map((x) => (
                        <button
                          key={x}
                          disabled={
                            (x === "Kredi Kartı" &&
                              campaign?.cardRules === false) ||
                            (x === "Senet" && campaign?.noteRules === false)
                          }
                          onClick={() => {
                            setPayment(x);
                            setFinanceRuleId(undefined);
                            setInstallmentCount(undefined);
                          }}
                          className={`rounded-xl border p-3 text-[10px] disabled:cursor-not-allowed disabled:opacity-35 ${payment === x ? "bg-black text-white" : "bg-white"}`}
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                    {payment !== "Nakit" && (
                      <div className="mt-4">
                        <label className="text-[10px] font-semibold">
                          {payment === "Kredi Kartı"
                            ? "Kredi Kartı Tarifesi"
                            : "Senet Kuralı"}
                          <select
                            value={financeRuleId || ""}
                            onChange={(e) => {
                              setFinanceRuleId(e.target.value ? Number(e.target.value) : undefined);
                              setInstallmentCount(undefined);
                            }}
                            className="mt-1 w-full rounded-xl border bg-white p-3"
                          >
                            <option value="">Aktif kural seçin</option>
                            {(payment === "Kredi Kartı"
                              ? availableCardRules
                              : availableNoteRules
                            ).map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} · {r.detail}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="mt-3 block text-[10px] font-semibold">
                          Taksit Sayısı
                          <select
                            value={installmentCount || ""}
                            disabled={!selectedRule}
                            onChange={(e) => setInstallmentCount(e.target.value ? Number(e.target.value) : undefined)}
                            className="mt-1 w-full rounded-xl border bg-white p-3 disabled:bg-black/[.03]"
                          >
                            <option value="">Taksit sayısı seçin</option>
                            {(payment === "Kredi Kartı" ? cardInstallmentOptions.map((step) => step.count) : noteInstallmentOptions).map((count) => (
                              <option key={count} value={count}>{count} taksit</option>
                            ))}
                          </select>
                        </label>
                        <div className={`mt-2 flex justify-between rounded-xl p-3 ${paymentSelectionComplete ? "bg-sky-50" : "bg-amber-50 text-amber-900"}`}>
                          <span>{installmentText}</span>
                          <b>{paymentSelectionComplete ? money(total) : "Seçim gerekli"}</b>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 space-y-4 rounded-[18px] border bg-white p-4 text-[11px]">
                      <label className="flex justify-between">
                        Kitap seti hediye
                        <input
                          type="checkbox"
                          checked={bookGift}
                          onChange={(e) => setBookGift(e.target.checked)}
                        />
                      </label>
                      <label className="block"><span className="mb-1 block text-[9px] font-semibold">Ek indirim oranı</span><div className="flex items-center gap-2"><input type="number" min={0} max={100} step={0.1} value={extraDiscountRate || ""} onChange={(e) => setExtraDiscountRate(Math.max(0, Number(e.target.value) || 0))} className="min-w-0 flex-1 rounded-xl border p-3" placeholder="0" /><span className={`rounded-full px-3 py-2 text-[9px] font-semibold ${discountAuthority === "Müdür İnisiyatifi" ? "bg-orange-100 text-orange-800" : discountAuthority === "Danışman İndirimi" ? "bg-amber-100 text-amber-800" : discountAuthority === "Kurucu Onayı" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-600"}`}>{discountAuthority}</span></div><small className="mt-1 block text-[8px] text-black/40">Danışman %{campaign?.consultantLimit || 0} · Müdür %{campaign?.managerLimit || 0} sınırı</small></label>
                      <select
                        value={validity}
                        onChange={(e) => setValidity(Number(e.target.value))}
                        className="w-full rounded-xl border p-3"
                      >
                        <option value={1}>1 Gün</option>
                        <option value={2}>2 Gün</option>
                        <option value={3}>3 Gün</option>
                        <option value={7}>7 Gün</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <aside className="hidden overflow-y-auto border-l bg-white p-5 lg:block">
                <div className="rounded-[22px] bg-[#182033] p-5 text-white">
                  <b className="text-[18px]">ENGLISH TIME</b>
                  <p className="text-[10px] text-white/50">
                    {wc?.branch || "İZMİT"}
                  </p>
                </div>
                <p className="mt-4 text-[11px] text-black/55">
                  Sayın {offerName || "Öğrencimiz"}, teklif seçeneklerinizi
                  inceleyebilirsiniz.
                </p>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <div className="rounded-[18px] border-2 border-black p-4">
                    <span className="rounded-full bg-black px-2 py-1 text-[8px] text-white">
                      ANA TEKLİF
                    </span>
                    <b className="mt-3 block text-[12px]">{payment}</b>
                    <p className="text-[9px] text-black/40">
                      {campaign?.name || "Kampanya seçilmedi"}
                    </p>
                    <p className="mt-3 text-[9px] text-black/40">Ödeme planı</p>
                    <b className="text-[10px]">{installmentText}</b>
                    <p className="mt-3 text-[9px] text-black/40">
                      Toplam Tutar
                    </p>
                    <p className="text-[22px] font-semibold">{paymentSelectionComplete ? money(total) : "—"}</p>
                    {normalizedDiscountRate > 0 && <div className="mt-2 flex items-center justify-between rounded-lg bg-orange-50 px-2 py-1.5 text-[8px] text-orange-800"><span>{discountAuthority}</span><b>%{normalizedDiscountRate} ek indirim</b></div>}
                    <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-[9px] text-emerald-800">
                      Kitap Seti: {bookGift ? "Hediye" : "Ücretli"}
                    </div>
                  </div>
                  {alternatives.map((alternative, i) => {
                    const alt = alternativeSnapshot(alternative);
                    const alternativeRules = alternative.payment === "Kredi Kartı" ? availableCardRules : availableNoteRules;
                    const alternativeRule = alternativeRules.find((rule) => rule.id === alternative.financeRuleId);
                    const alternativeInstallments = alternative.payment === "Kredi Kartı"
                      ? alternativeRule?.draft?.steps.filter((step) => step.enabled && step.count <= (campaign?.maxCardInstallment || 12)).map((step) => step.count).sort((a,b) => a-b) || []
                      : Array.from({length: Math.min(campaign?.maxNoteInstallment || 12, alternativeRule?.draft?.noteInstallment || Number(alternativeRule?.detail.match(/(\d+)\s*taksit/i)?.[1] || 12))}, (_, index) => index + 1);
                    return (
                      <div key={i} className="rounded-[18px] border p-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-sky-50 px-2 py-1 text-[8px] text-sky-800">
                            ALTERNATİF {i + 1}
                          </span>
                          <button
                            onClick={() =>
                              setAlternatives((v) =>
                                v.filter((_, index) => index !== i),
                              )
                            }
                            className="text-[9px] text-red-600"
                          >
                            Kaldır
                          </button>
                        </div>
                        <select
                          value={alternative.payment}
                          onChange={(e) => setAlternatives((v) => v.map((item, index) => index === i ? {payment: e.target.value as PaymentMethod} : item))}
                          className="mt-3 w-full rounded-lg border p-2 text-[10px]"
                        >
                          <option>Nakit</option>
                          {campaign?.cardRules !== false && (
                            <option>Kredi Kartı</option>
                          )}
                          {campaign?.noteRules !== false && (
                            <option>Senet</option>
                          )}
                        </select>
                        {alternative.payment !== "Nakit" && <>
                          <select value={alternative.financeRuleId || ""} onChange={(e) => setAlternatives((v) => v.map((item, index) => index === i ? {...item, financeRuleId: e.target.value ? Number(e.target.value) : undefined, installmentCount: undefined} : item))} className="mt-2 w-full rounded-lg border p-2 text-[10px]">
                            <option value="">{alternative.payment === "Kredi Kartı" ? "Kart tarifesi seçin" : "Senet planı seçin"}</option>
                            {alternativeRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
                          </select>
                          <select disabled={!alternativeRule} value={alternative.installmentCount || ""} onChange={(e) => setAlternatives((v) => v.map((item, index) => index === i ? {...item, installmentCount: e.target.value ? Number(e.target.value) : undefined} : item))} className="mt-2 w-full rounded-lg border p-2 text-[10px] disabled:bg-black/[.03]">
                            <option value="">Taksit sayısı seçin</option>
                            {alternativeInstallments.map((count) => <option key={count} value={count}>{count} taksit</option>)}
                          </select>
                        </>}
                        <p className="mt-2 text-[9px] text-black/40">
                          {alternative.payment === "Nakit" ? "Peşin ödeme" : alternativeRule?.name || "Tarife seçilmedi"} ·{" "}
                          {alternative.payment === "Nakit" || alternative.installmentCount ? alt.installmentText : "Taksit seçilmedi"}
                        </p>
                        <p className="mt-3 text-[9px] text-black/40">
                          Toplam Tutar
                        </p>
                        <p className="text-[20px] font-semibold">
                          {alternative.payment === "Nakit" || (alternative.financeRuleId && alternative.installmentCount) ? money(alt.total) : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {campaign && alternatives.length < 2 && (
                  <button
                    onClick={() =>
                      setAlternatives((v) => [
                        ...v,
                        {payment: v.length === 0 ? "Kredi Kartı" : "Senet"},
                      ])
                    }
                    className="mt-3 w-full rounded-xl border border-dashed border-black/25 py-3 text-[10px] font-semibold"
                  >
                    <Plus size={13} className="mr-2 inline" />
                    Alternatif Teklif Ekle
                  </button>
                )}
              </aside>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-white p-4">
              <button
                onClick={() => setWizard(false)}
                className="rounded-xl border px-4 py-2.5 text-[10px]"
              >
                İptal
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl border px-4 py-2.5 text-[10px]"
                >
                  <FileText size={14} className="mr-2 inline" />
                  PDF Önizle
                </button>
                <button
                  onClick={() => {
                    const phone = wc?.phone || guestPhone;
                    if (!offerName || !validTrPhone(phone) || !campaign) {
                      notify("Önce aday ve kampanya seçmelisiniz");
                      return;
                    }
                    window.open(
                      "https://wa.me/90" +
                        normalizePhone(phone).slice(1) +
                        "?text=" +
                        encodeURIComponent(
                          "Merhaba " +
                            offerName +
                            ", " +
                            campaign.name +
                            " teklifiniz: " +
                            money(total),
                        ),
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] text-white"
                >
                  WhatsApp
                </button>
                <button
                  onClick={createOffer}
                  disabled={!offerName || !campaign || !validTrPhone(wc?.phone || guestPhone) || !(wc?.source || guestSource)}
                  className="rounded-xl bg-black px-5 py-2.5 text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {revisionSource ? "Revizyonu Kaydet" : "Teklifi Oluştur"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
      {newCampaign && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-[600px] rounded-[26px] bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-[20px] font-semibold">Yeni Kampanya</h2>
              <button onClick={() => setNewCampaign(false)}>
                <X />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                id="cn"
                placeholder="Kampanya adı"
                className="rounded-xl border p-3 text-[11px]"
              />
              <select id="cp" className="rounded-xl border p-3 text-[11px]">
                <option>Genel İngilizce</option>
                <option>Junior</option>
                <option>Teenage</option>
                <option>Almanca</option>
              </select>
              <input
                id="cl"
                type="number"
                placeholder="Liste fiyatı"
                className="rounded-xl border p-3 text-[11px]"
              />
              <input
                id="cc"
                type="number"
                placeholder="Nakit fiyatı"
                className="rounded-xl border p-3 text-[11px]"
              />
            </div>
            <button
              onClick={() => {
                const name =
                    (document.getElementById("cn") as HTMLInputElement).value ||
                    "Yeni Kampanya",
                  pr = (document.getElementById("cp") as HTMLSelectElement)
                    .value,
                  list =
                    Number(
                      (document.getElementById("cl") as HTMLInputElement).value,
                    ) || 90000,
                  cash =
                    Number(
                      (document.getElementById("cc") as HTMLInputElement).value,
                    ) || 60000;
                setCampaigns((v) => [
                  ...v,
                  {
                    id: Date.now(),
                    name,
                    program: pr,
                    branch: role === "Kurucu" ? "Tüm Şubeler" : "İzmit",
                    list,
                    cash,
                    card: cash + 6000,
                    note: cash + 3000,
                    buy: 2,
                    gift: 1,
                    hours: 240,
                    bookGift: true,
                    validity: 2,
                    status: "Aktif",
                  },
                ]);
                setNewCampaign(false);
                notify("Kampanya eklendi");
              }}
              className="mt-5 w-full rounded-xl bg-black py-3 text-[11px] text-white"
            >
              Kampanyayı Kaydet
            </button>
          </div>
        </div>
      )}
      {registrationOffer && registrationCandidate && (
        <div className="fixed inset-0 z-[108] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[720px] overflow-hidden rounded-[26px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b p-6"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-emerald-700">Kesin kayıt işlemi</p><h2 className="text-[22px] font-semibold">{registrationOffer.registrationComplete ? 'Kayıt Detayı' : 'Kesin Kayda Dönüştür'}</h2><p className="mt-1 text-[10px] text-black/45">{registrationCandidate.name} · {registrationOffer.id}</p></div><button onClick={() => setRegistrationOffer(null)}><X /></button></div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-[18px] bg-emerald-50 p-4 text-[10px] text-emerald-900 sm:col-span-2"><b>Aday bağlantısı doğrulandı.</b> Kaynak ve eğitim bilgileri adaydan; tutar ve ödeme bilgileri tekliften alınır. Kaydetme sonrasında her iki ekran da Kesin Kayıt olarak güncellenir.</div>
              <label className="text-[9px] font-semibold">Kayıt Tarihi *<input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-[11px]" /></label>
              <label className="text-[9px] font-semibold">Kaynak *<select value={registrationSource} onChange={(e) => setRegistrationSource(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"><option value="">Kaynak seçin</option>{sourceOptions.map((source) => <option key={source}>{source}</option>)}</select></label>
              <label className="text-[9px] font-semibold">Ücretli Kur *<input type="number" min="1" value={registrationPaidCourses || ''} onChange={(e) => setRegistrationPaidCourses(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3 text-[11px]" /></label>
              <label className="text-[9px] font-semibold">Hediye Kur<input type="number" min="0" value={registrationGiftCourses} onChange={(e) => setRegistrationGiftCourses(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3 text-[11px]" /></label>
              <label className="text-[9px] font-semibold">Peşinat<input type="number" min="0" value={registrationDownPayment} onChange={(e) => setRegistrationDownPayment(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3 text-[11px]" /></label>
              <div className="rounded-[18px] bg-[#17191c] p-4 text-white"><p className="text-[9px] text-white/45">Sözleşme / Teklif Tutarı</p><b className="mt-1 block text-[20px]">{money(registrationOffer.total)}</b><span className="text-[9px] text-white/45">{registrationCandidate.program} · {registrationOffer.payment}</span></div>
            </div>
            <div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setRegistrationOffer(null)} className="rounded-xl border px-4 py-2.5 text-[10px]">Vazgeç</button><button onClick={completeRegistration} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[10px] font-semibold text-white">{registrationOffer.registrationComplete ? 'Kayıt Bilgilerini Güncelle' : 'Kesin Kaydı Oluştur'}</button></div>
          </div>
        </div>
      )}
      {conversionOffer && (
        <div className="fixed inset-0 z-[105] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-[520px] rounded-[24px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.14em] text-black/35">Misafir teklif</p>
                <h2 className="text-[20px] font-semibold">Adaya Dönüştür</h2>
                <p className="mt-1 text-[10px] text-black/45">{conversionOffer.candidate} · {conversionOffer.id}</p>
              </div>
              <button onClick={() => setConversionOffer(null)}><X /></button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-[9px] font-semibold">Telefon *<input value={conversionPhone} onChange={(e) => setConversionPhone(e.target.value)} placeholder="05XX XXX XX XX" className="mt-1 w-full rounded-xl border p-3 text-[11px]" /></label>
              <label className="text-[9px] font-semibold">Başvuru Kaynağı *<select value={conversionSource} onChange={(e) => setConversionSource(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3 text-[11px]"><option value="">Kaynak seçin</option>{sourceOptions.map((source) => <option key={source}>{source}</option>)}</select></label>
            </div>
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] text-amber-900">Telefon sistemdeki adaylar ve önceki teklifler içinde kontrol edilir. Eşleşme varsa mükerrer aday oluşturulmaz.</div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setConversionOffer(null)} className="rounded-xl border px-4 py-2.5 text-[10px]">İptal</button><button onClick={confirmGuestConversion} className="rounded-xl bg-black px-5 py-2.5 text-[10px] text-white">Adayı Oluştur ve Teklifi Bağla</button></div>
          </div>
        </div>
      )}
      {detailOffer && (
        <div className="fixed inset-0 z-[104] grid place-items-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[26px] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white/95 p-6 backdrop-blur">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.14em] text-black/35">
                  Teklif snapshot'ı
                </p>
                <h2 className="text-[22px] font-semibold">{detailOffer.id}</h2>
                <p className="mt-1 text-[10px] text-black/45">
                  Sürüm {detailOffer.version || 1} · {detailOffer.status}
                </p>
              </div>
              <button onClick={() => setDetailOffer(null)} aria-label="Kapat">
                <X />
              </button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-[20px] border p-5">
                <p className="text-[9px] uppercase tracking-wider text-black/35">Aday / Misafir</p>
                <b className="mt-2 block text-[16px]">{detailOffer.candidate}</b>
                <p className="mt-1 text-[11px]">{detailOffer.phone || linkedCandidate(detailOffer)?.phone || "Telefon bilgisi yok"}</p>
                <p className="mt-1 text-[10px] text-black/45">
                  {detailOffer.recordType || (detailOffer.guest ? "Misafir teklif" : "Kayıtlı aday")} · {detailOffer.source || linkedCandidate(detailOffer)?.source || "Kaynak yok"}
                </p>
              </div>
              <div className="rounded-[20px] bg-[#17191c] p-5 text-white">
                <p className="text-[9px] uppercase tracking-wider text-white/40">Toplam teklif</p>
                <p className="mt-2 text-[28px] font-semibold">{money(detailOffer.total)}</p>
                <p className="mt-2 text-[10px] text-white/55">{detailOffer.payment} · {detailOffer.installmentText || detailOffer.financeRule || "Peşin ödeme"}</p>
              </div>
              <div className="rounded-[20px] border p-5 sm:col-span-2">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><p className="text-[9px] text-black/35">Program</p><b className="text-[11px]">{detailOffer.program}</b></div>
                  <div><p className="text-[9px] text-black/35">Kampanya</p><b className="text-[11px]">{detailOffer.campaign}</b></div>
                  <div><p className="text-[9px] text-black/35">Şube / Danışman</p><b className="text-[11px]">{detailOffer.branch} · {detailOffer.owner}</b></div>
                  <div><p className="text-[9px] text-black/35">İlk teklif</p><b className="text-[11px]">{formatDateTime(offerVersionChain(detailOffer).sort((a, b) => (a.version || 1) - (b.version || 1))[0]?.originalCreatedAt || offerVersionChain(detailOffer).sort((a, b) => (a.version || 1) - (b.version || 1))[0]?.createdAt || detailOffer.date)}</b></div>
                  <div><p className="text-[9px] text-black/35">Geçerlilik</p><b className="text-[11px]">{detailOffer.expiry}</b></div>
                  <div><p className="text-[9px] text-black/35">Paylaşılma</p><b className="text-[11px]">{detailOffer.sentAt ? formatDateTime(detailOffer.sentAt) : "Henüz paylaşılmadı"}</b></div>
                  <div><p className="text-[9px] text-black/35">Son revizyon</p><b className="text-[11px]">{(detailOffer.version || 1) > 1 ? `${formatDateTime(detailOffer.revisedAt || detailOffer.createdAt)} · Revizyon ${(detailOffer.version || 1) - 1}` : "Henüz revize edilmedi"}</b></div>
                </div>
              </div>
              {Boolean(detailOffer.alternatives?.length) && (
                <div className="rounded-[20px] border p-5 sm:col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-black/35">Alternatifler</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {detailOffer.alternatives?.map((alternative, index) => (
                      <div key={index} className="rounded-xl bg-black/[.035] p-3 text-[10px]">
                        <b>{alternative.payment} · {money(alternative.total)}</b>
                        <span className="mt-1 block text-black/45">{alternative.installmentText}{alternative.financeRule ? ` · ${alternative.financeRule}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(detailOffer.parentOfferId || detailOffer.rootOfferId) && (
                <div className="rounded-[20px] bg-amber-50 p-4 text-[10px] text-amber-900 sm:col-span-2">
                  Bu teklif bir revizyondur. Önceki sürüm: {detailOffer.parentOfferId || "—"} · Ana teklif: {detailOffer.rootOfferId || detailOffer.parentOfferId}
                </div>
              )}
              {offerVersionChain(detailOffer).length > 1 && (
                <div className="rounded-[20px] border p-5 sm:col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-black/35">Sürüm geçmişi</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offerVersionChain(detailOffer).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDetailOffer(item)}
                        className={`rounded-xl border px-3 py-2 text-left text-[9px] ${item.id === detailOffer.id ? "border-black bg-black text-white" : "bg-white"}`}
                      >
                        <b>Sürüm {item.version || 1}</b>
                        <span className="ml-2 opacity-60">{item.id} · {item.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {offerShares.some((share) => share.offerId === detailOffer.id) && (
                <div className="rounded-[20px] border p-5 sm:col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-black/35">Paylaşım geçmişi</p>
                  <div className="mt-3 space-y-2">
                    {offerShares.filter((share) => share.offerId === detailOffer.id).map((share) => (
                      <div key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/[.035] p-3 text-[9px]">
                        <b>{share.channel} · {share.recipient}</b>
                        <span className="text-black/45">{new Date(share.sharedAt).toLocaleString("tr-TR")} · {share.sharedBy} · {share.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-white/95 p-4 backdrop-blur">
              {detailOffer.status === "Gönderildi" && (
                <button onClick={() => transitionOffer(detailOffer, "Görüntülendi")} className="rounded-xl border px-4 py-2.5 text-[10px]">Görüntülendi</button>
              )}
              {["Gönderildi", "Görüntülendi"].includes(detailOffer.status) && <button onClick={() => transitionOffer(detailOffer, "Kaybedildi")} className="rounded-xl border px-4 py-2.5 text-[10px] text-red-600">Kaybedildi</button>}
              {(detailOffer.registrationComplete || canStartRegistration(detailOffer)) && <button onClick={() => openRegistration(detailOffer)} className={`rounded-xl px-4 py-2.5 text-[10px] font-semibold text-white ${detailOffer.registrationComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'}`}>{detailOffer.registrationComplete ? "Kayıt Detayı" : detailOffer.status === "Kazanıldı" ? "Kayıt Bilgilerini Tamamla" : "Kesin Kayda Dönüştür"}</button>}
              <button onClick={() => { const offer = detailOffer; setDetailOffer(null); copyOffer(offer); }} className="rounded-xl border px-4 py-2.5 text-[10px]">Kopyala</button>
              {!['Kazanıldı', 'Kaybedildi', 'Revize edildi'].includes(detailOffer.status) && (
                <button onClick={() => { const offer = detailOffer; setDetailOffer(null); reviseOffer(offer); }} className="rounded-xl border px-4 py-2.5 text-[10px]">Revize Et</button>
              )}
              {!['Kazanıldı', 'Kaybedildi', 'Revize edildi'].includes(detailOffer.status) && (
                <button onClick={() => shareOffer(detailOffer)} className="rounded-xl bg-black px-5 py-2.5 text-[10px] text-white">WhatsApp ile Paylaş</button>
              )}
            </div>
          </div>
        </div>
      )}
      {rowActionMenu && (
        <div className="fixed inset-0 z-[105]" onClick={() => setRowActionMenu(null)}>
          <div role="menu" aria-label="Diğer işlemler" onClick={(e) => e.stopPropagation()} className="fixed w-[178px] overflow-hidden rounded-xl border bg-white p-1.5 text-[10px] shadow-2xl" style={{left: rowActionMenu.left, top: rowActionMenu.top}}>
            {rowActionMenu.kind === 'candidate' ? <>
              <button role="menuitem" onClick={() => { setSelected(rowActionMenu.item); setTab('Genel'); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/[.035]">Aday detayını aç</button>
              <button role="menuitem" onClick={() => { openWizard(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/[.035]">Yeni teklif hazırla</button>
              {membership?.role !== 'Danışman' && role !== 'Satış Danışmanı' && <button role="menuitem" onClick={() => { requestCandidateDelete(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">Adayı sil</button>}
            </> : <>
              <button role="menuitem" onClick={() => { openOffer(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/[.035]">Teklifi aç</button>
              {!terminalOfferStatuses.includes(rowActionMenu.item.status as never) && <button role="menuitem" onClick={() => { reviseOffer(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/[.035]">Revize et</button>}
              <button role="menuitem" onClick={() => { copyOffer(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/[.035]">Kopyala</button>
              {!terminalOfferStatuses.includes(rowActionMenu.item.status as never) && <button role="menuitem" onClick={() => { shareOffer(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-black/[.035]">WhatsApp ile paylaş</button>}
              {membership?.role !== 'Danışman' && role !== 'Satış Danışmanı' && <button role="menuitem" onClick={() => { requestOfferDelete(rowActionMenu.item); setRowActionMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">Teklifi sil</button>}
            </>}
          </div>
        </div>
      )}
      {archiveOpen && membership?.role !== "Danışman" && (
        <div className="fixed inset-0 z-[108] grid place-items-center bg-black/45 p-4" onClick={() => setArchiveOpen(false)}>
          <div className="max-h-[82vh] w-full max-w-[760px] overflow-hidden rounded-[24px] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="archive-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-5">
              <div><h2 id="archive-title" className="text-[18px] font-semibold">Arşiv</h2><p className="mt-1 text-[10px] text-black/45">Kayıtlar ve ilişkili geçmişleri korunur.</p></div>
              <button onClick={() => setArchiveOpen(false)} aria-label="Arşivi kapat" className="grid h-9 w-9 place-items-center rounded-xl border"><X size={16}/></button>
            </div>
            <div className="max-h-[68vh] space-y-5 overflow-y-auto p-5">
              <section><h3 className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-black/40">Adaylar · {archivedCandidates.length}</h3>
                <div className="space-y-2">{archivedCandidates.map((candidate) => <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><b className="text-[11px]">{candidate.name}</b><p className="mt-1 text-[9px] text-black/45">{candidate.branch} · {candidate.owner} · {candidate.phone}</p></div><button onClick={() => restoreArchivedRecord("candidate", candidate.id)} className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-semibold"><RotateCcw size={13}/>Geri Yükle</button></div>)}{!archivedCandidates.length&&<p className="rounded-xl border border-dashed p-4 text-center text-[10px] text-black/40">Arşivlenmiş aday yok.</p>}</div>
              </section>
              <section><h3 className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-black/40">Teklifler · {archivedOffers.length}</h3>
                <div className="space-y-2">{archivedOffers.map((offer) => <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><b className="text-[11px]">{offer.id} · {offer.candidate}</b><p className="mt-1 text-[9px] text-black/45">{offer.branch} · {offer.campaign} · {money(offer.total)}</p></div><button onClick={() => restoreArchivedRecord("offer", offer.id)} className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-semibold"><RotateCcw size={13}/>Geri Yükle</button></div>)}{!archivedOffers.length&&<p className="rounded-xl border border-dashed p-4 text-center text-[10px] text-black/40">Arşivlenmiş teklif yok.</p>}</div>
              </section>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div className="fixed inset-0 z-[109] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-[440px] rounded-[24px] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={20} /></div>
            <h2 id="delete-title" className="mt-4 text-[19px] font-semibold">{pendingDelete.kind === "candidate" ? "Aday arşivlensin mi?" : "Teklif arşivlensin mi?"}</h2>
            <p className="mt-2 text-[11px] leading-5 text-black/55">
              <b className="text-black">{pendingDelete.kind === "candidate" ? pendingDelete.item.name : pendingDelete.item.id}</b> aktif listelerden kaldırılacak ve verileri korunacak.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} className="rounded-xl border px-4 py-2.5 text-[10px]">Vazgeç</button>
              <button onClick={confirmRecordDelete} className="rounded-xl bg-red-600 px-4 py-2.5 text-[10px] font-semibold text-white">Arşivle</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[110] w-[min(92vw,620px)] -translate-x-1/2 rounded-xl bg-black px-4 py-3 text-center text-[11px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
export default App;
