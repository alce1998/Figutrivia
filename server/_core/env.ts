export const ENV = {
  appId: process.env.VITE_APP_ID || "figutrivia",
  cookieSecret:
    process.env.JWT_SECRET || "figutrivia-dev-jwt-secret-change-in-prod",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  errorReportEmail:
    process.env.ERROR_REPORT_EMAIL || "alessandro.centra10@gmail.com",
};
