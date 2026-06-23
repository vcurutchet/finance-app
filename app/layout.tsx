import "./globals.css";

export const metadata = {
  title: "FinanceFlow — Gestion de finances",
  description: "App de gestion de finances personnelles",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
