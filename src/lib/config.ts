export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  appName: 'Seven Trip',
  currency: 'BDT',
  currencySymbol: '৳',
  defaultLanguage: 'en',
  supportPhone: '+880 1234-567890',
  supportEmail: 'support@seventrip.com.bd',
} as const;
