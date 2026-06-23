import "./globals.css";

export const metadata = {
  title: "Kontu — Gestion de finances",
  description: "Gestion de finances personnelles et professionnelles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
