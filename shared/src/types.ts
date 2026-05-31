// ===== Subscription Plans =====
export enum PlanType {
  FREE = 'FREE',
  START = 'START',
  BUSINESS = 'BUSINESS',
  ENTERPRISE = 'ENTERPRISE',
}

export interface PlanConfig {
  name: string;
  price: number; // in tenge
  proposalsLimit: number;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    name: 'Free',
    price: 0,
    proposalsLimit: 3,
    features: [
      '3 коммерческих предложения',
      'Базовые шаблоны',
      'PDF экспорт',
      'Поддержка в Telegram',
    ],
  },
  [PlanType.START]: {
    name: 'Start',
    price: 3000,
    proposalsLimit: 30,
    features: [
      '30 коммерческих предложений',
      'Все шаблоны',
      'PDF экспорт с брендированием',
      'Загрузка логотипа',
      'Генерация договора',
      'Генерация счета',
      'WhatsApp сообщение',
      'Приоритетная поддержка',
    ],
  },
  [PlanType.BUSINESS]: {
    name: 'Business',
    price: 10000,
    proposalsLimit: -1, // unlimited
    features: [
      'Безлимитные коммерческие предложения',
      'Все шаблоны',
      'PDF экспорт с брендированием',
      'Загрузка логотипа',
      'Генерация договора',
      'Генерация счета',
      'WhatsApp сообщение',
      'Скрипт звонка клиенту',
      'Коммерческое письмо',
      'API доступ',
      'Приоритетная поддержка 24/7',
    ],
  },
  [PlanType.ENTERPRISE]: {
    name: 'Enterprise',
    price: -1,
    proposalsLimit: -1,
    features: [
      'Всё из Business',
      'Индивидуальные шаблоны',
      'White-label',
      'Выделенный сервер',
      'Своя AI модель',
      'Персональный менеджер',
    ],
  },
};

// ===== Proposal =====
export enum ProposalStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum TemplateType {
  IT = 'IT',
  MARKETING = 'MARKETING',
  DESIGN = 'DESIGN',
  CONSULTING = 'CONSULTING',
  CONSTRUCTION = 'CONSTRUCTION',
  PROCUREMENT = 'PROCUREMENT',
  EDUCATION = 'EDUCATION',
  LEGAL = 'LEGAL',
}

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  [TemplateType.IT]: 'IT услуги',
  [TemplateType.MARKETING]: 'Маркетинг',
  [TemplateType.DESIGN]: 'Дизайн',
  [TemplateType.CONSULTING]: 'Консалтинг',
  [TemplateType.CONSTRUCTION]: 'Строительство',
  [TemplateType.PROCUREMENT]: 'Закупки',
  [TemplateType.EDUCATION]: 'Образование',
  [TemplateType.LEGAL]: 'Юридические услуги',
};

// ===== Proposal Input from user =====
export interface ProposalInput {
  companyName: string;
  clientName: string;
  clientBusiness: string;
  services: string;
  cost: string;
  timeline: string;
  advantages: string;
  contactInfo: string;
  templateType: TemplateType;
  logoUrl?: string;
  brandColor?: string;
}

// ===== Generated Proposal =====
export interface GeneratedProposal {
  title: string;
  coverPage: {
    title: string;
    subtitle: string;
    date: string;
    companyName: string;
    clientName: string;
  };
  greeting: string;
  problemAnalysis: string;
  solution: string;
  advantages: string[];
  servicesOffered: ServiceItem[];
  pricing: PricingSection;
  timeline: TimelineSection;
  caseStudies: CaseStudy[];
  contactSection: ContactSection;
  conclusion: string;
}

export interface ServiceItem {
  name: string;
  description: string;
  price?: string;
}

export interface PricingSection {
  total: string;
  items: ServiceItem[];
  notes?: string;
}

export interface TimelineSection {
  totalDuration: string;
  phases: TimelinePhase[];
}

export interface TimelinePhase {
  name: string;
  duration: string;
  description: string;
}

export interface CaseStudy {
  title: string;
  description: string;
  result: string;
}

export interface ContactSection {
  companyName: string;
  contactInfo: string;
  phone?: string;
  email?: string;
  website?: string;
}

// ===== Additional Documents =====
export interface GeneratedContract {
  title: string;
  content: string;
  terms: string[];
  parties: {
    contractor: string;
    client: string;
  };
}

export interface GeneratedInvoice {
  invoiceNumber: string;
  date: string;
  items: ServiceItem[];
  total: string;
  companyDetails: string;
  clientDetails: string;
}

export interface WhatsAppMessage {
  text: string;
}

export interface CallScript {
  script: string;
  sections: CallScriptSection[];
}

export interface CallScriptSection {
  title: string;
  content: string;
}

// ===== API Responses =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserProfile {
  id: string;
  telegramId?: string;
  email?: string;
  name?: string;
  companyName?: string;
  planType: PlanType;
  proposalsUsed: number;
  proposalsLimit: number;
  logoUrl?: string;
  brandColor?: string;
  createdAt: string;
}
