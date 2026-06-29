import "./globals.css";

export const metadata = {
  title: "Zettelkasten",
  description: "ツリー状にメモを育てるツェッテルカステン",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
