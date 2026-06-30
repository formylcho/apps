import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Zettelkasten",
  description: "ツリー状にメモを育てるツェッテルカステン",
  appleWebApp: {
    capable: true,
    title: "Zettelkasten",
    statusBarStyle: "default",
  },
  // iOS が「ホーム画面に追加」時に全画面起動するためのレガシーメタ。
  // （manifest は display:browser にして PC はブラウザ準拠のまま）
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#3b6ea5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
