import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gift Card Trading Terminal",
  description: "Personal procurement terminal for E-Gift Cards and E-Vouchers. Single operator, no customers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
