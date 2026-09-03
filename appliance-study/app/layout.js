import './globals.css';

export const metadata = {
  title: '家電を学ぶ',
  description: '最新の家電を、商品ごとに体系的に学ぶための個人用サイト。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <header className="siteHeader">
          <div className="inner">
            <a className="logo" href="/">家電を学ぶ</a>
            <nav className="headerNav">
              <a href="/pc">PC</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="siteFooter">
          <div className="inner">
            <p>個人の学習用の非公式サイトです。購入判断は必ずメーカー公式をご確認ください。</p>
            <p>スペックの数値はメーカー公式を一次情報とし、区分やメーカーの傾向は家電量販店の情報も参考にしています。</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
