import "./globals.css";

export const metadata = {
  title: "Shalom Digital API",
  description:
    "ShalomDigital WhatsApp assistant dashboard for training, testing and monitoring customer replies.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
