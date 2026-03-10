// Centralized CMS type definitions for ALL pages
// All content is managed via the backend CMS API — no hardcoded defaults

// ====== PAGE CONTENT TYPES ======

export interface PageHero {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  gradient?: string;
}

export interface ContentSection {
  id: string;
  title: string;
  content: string;
  visible: boolean;
  order: number;
}

export interface ListItemSection {
  title: string;
  items: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  bio: string;
}

export interface CompanyValue {
  icon: string;
  title: string;
  desc: string;
}

export interface JobPosition {
  id: number;
  title: string;
  dept: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
}

export interface Perk {
  icon: string;
  title: string;
  desc: string;
}

export interface ContactInfoItem {
  icon: string;
  title: string;
  text: string;
}

export interface FAQCategory {
  category: string;
  items: { q: string; a: string }[];
}

export interface RefundPolicySection {
  title: string;
  items: string[];
}

export interface RefundTimeline {
  icon: string;
  label: string;
  desc: string;
}

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  img: string;
}

export interface ServicePageContent {
  hero: { title: string; subtitle: string };
  intro: string;
  features?: { icon: string; title: string; desc: string }[];
  steps?: { step: string; title: string; desc: string }[];
  visible: boolean;
}

export interface BookingFormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "select" | "textarea" | "number" | "file";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  half?: boolean;
  visible: boolean;
}

export interface BookingFormStep {
  id: string;
  title: string;
  icon: string;
  fields: BookingFormField[];
  visible: boolean;
}

export interface BookingFormConfig {
  steps: BookingFormStep[];
  submitLabel: string;
  confirmationMessage: string;
}

export interface VisaCountryOption {
  value: string;
  label: string;
  flag?: string;
  processing?: string;
  fee?: string;
}

export interface VisaApplicationConfig {
  countries: VisaCountryOption[];
  requiredDocuments: string[];
  processingSteps: { step: string; title: string; desc: string }[];
}

export interface VisaCountryListing {
  name: string;
  flag: string;
  processing: string;
  fee: string;
  type: string;
  popular: boolean;
}

export interface ServiceListingConfig {
  heroBadge?: string;
  heroSearchPlaceholder?: string;
  visaCountries?: VisaCountryListing[];
  visaSteps?: { icon: string; title: string; desc: string }[];
  visaFeatures?: { icon: string; title: string; desc: string }[];
  holidayIncludes?: { icon: string; label: string }[];
  medicalCountries?: { value: string; label: string }[];
  medicalTreatments?: { value: string; label: string }[];
  esimCountries?: { value: string; label: string }[];
  carSortOptions?: { value: string; label: string }[];
  flightSortOptions?: { value: string; label: string }[];
  hotelSortOptions?: { value: string; label: string }[];
}

// ====== MASTER CMS CONTENT TYPE ======

export interface CmsPageContent {
  slug: string;
  pageTitle: string;
  hero: PageHero;
  sections?: ContentSection[];
  storyText?: string;
  values?: CompanyValue[];
  stats?: { value: string; label: string }[];
  team?: TeamMember[];
  contactInfo?: ContactInfoItem[];
  formTitle?: string;
  faqCategories?: FAQCategory[];
  perks?: Perk[];
  positions?: JobPosition[];
  careersEmail?: string;
  refundNotice?: string;
  refundPolicies?: RefundPolicySection[];
  refundTimeline?: RefundTimeline[];
  blogPosts?: BlogPost[];
  blogCategories?: string[];
  serviceContent?: ServicePageContent;
  visaConfig?: VisaApplicationConfig;
  bookingConfig?: BookingFormConfig;
  listingConfig?: ServiceListingConfig;
}
