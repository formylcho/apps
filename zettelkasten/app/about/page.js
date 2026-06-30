import Link from "next/link";

export const metadata = {
  title: "このアプリについて — Zettelkasten",
};

export default function About() {
  return (
    <div className="wrap fade">
      <div className="topbar">
        <Link className="brand" href="/">
          ← ZETTELKASTEN
        </Link>
        <span className="hint">このアプリについて</span>
      </div>

      <article className="prose">
        <h1>考えを「継ぎ足して育てる」ノート</h1>
        <p>
          これは
          <strong>ツェッテルカステン（Zettelkasten＝メモ箱）</strong>
          の考え方をもとにした、思考を深めるためのメモアプリです。
          ひとつの考えを書き捨てず、後日あらためて目にしたときに
          <strong>追記して枝を伸ばしていく</strong>
          ことで、断片的なメモが少しずつ体系へと育っていきます。
        </p>

        <h2>なぜ「ツリー状」なのか</h2>
        <p>
          ふつうのメモは時系列に並ぶだけで、関連する考えがバラバラに散らばってしまいます。
          このアプリでは、あるメモへの追記を
          <strong>「次のメモ」ではなく「そのメモの子」</strong>
          として記録します。こうすることで、
          ひとつのテーマがどう派生・発展していったかが、
          そのまま枝分かれの形で残ります。
        </p>

        <h2>採番（ルビ）の読み方</h2>
        <ul>
          <li>
            最初に書いた考えは <code>メモ1</code>、<code>メモ2</code>… と番号が振られます。
          </li>
          <li>
            <code>メモ1</code> に追記すると、子として <code>メモ1.1</code>、
            <code>メモ1.2</code> … になります。
          </li>
          <li>
            さらに <code>メモ1.2</code> に追記すると <code>メモ1.2.1</code> と、
            どこまでも深く枝を伸ばせます。
          </li>
          <li>
            既に <code>3.1, 3.2</code> がある <code>メモ3</code> に追記すれば
            <code>メモ3.3</code> として、同じ階層に並びます。
          </li>
        </ul>
        <p className="muted-note">
          番号（ルビ）は、その考えが「どの幹の・どの枝から伸びたか」を示す住所のようなものです。
        </p>

        <h2>使い方</h2>
        <ol>
          <li>
            <strong>起動すると、過去のツリーがランダムに1つ</strong>
            表示されます。気になるメモを選んで「追記」、
            ピンとこなければ「スキップ」。
          </li>
          <li>
            その後の<strong>メニュー</strong>から、
            <em>すべてのツリーを見る</em> ／ <em>別のメモに追記する</em> ／
            <em>新しいメモを書く</em> を選べます。
          </li>
          <li>
            <strong>すべてのツリーを見る</strong>：蓄積したメモ全体を俯瞰し、
            ツリーを選んで閲覧・追記します。
          </li>
          <li>
            <strong>別のメモに追記する</strong>：ランダムな1枚が表示され、
            その場で追記できます。偶然の再会が、新しいつながりを生みます。
          </li>
          <li>
            <strong>新しいメモを書く</strong>：白紙に、まだ枝のない新しい考えを投稿します。
          </li>
        </ol>

        <h2>続けるコツ</h2>
        <p>
          うまくまとめようとしないこと。思いついた断片をそのまま放り込み、
          再会したときに一言を継ぎ足す——その繰り返しだけで、
          数週間後には自分でも驚くほど枝が茂っています。
          <strong>書くことより、育てることを楽しむ</strong>
          のがこのアプリの使い方です。
        </p>

        <div style={{ marginTop: 40 }}>
          <Link className="btn primary" href="/">
            メモを書きはじめる
          </Link>
        </div>
      </article>
    </div>
  );
}
