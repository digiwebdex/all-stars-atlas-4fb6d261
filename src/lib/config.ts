export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  appName: 'Seven Trip',
  parentCompany: 'Evan International',
  legalName: 'Evan International',
  currency: 'BDT',
  currencySymbol: '৳',
  defaultLanguage: 'en',
  supportPhone: '+880 1749-373748',
  supportEmail: 'support@seventrip.com.bd',
  address: 'Beena Kanon, Flat-4A, House-03, Road-17, Block-E, Banani, Dhaka-1213',
  addressShort: 'Banani, Dhaka-1213',
  website: 'www.seventrip.com.bd',
} as const;
