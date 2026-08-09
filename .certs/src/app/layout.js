import FirebaseAnalytics from "@/components/FirebaseAnalytics";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}