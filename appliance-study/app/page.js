import types from '../data/types.json';
import { Card, OneLine, Points, List, Row } from '../components/blocks';

const points = [
  {
    q: '何のためのサイト？',
    a: '買うために比べるのではなく、商品知識を体系として身につけるためのサイトです。',
    detail:
      'スペックを並べるだけでは「数字の意味」が分からないままになります。値の読み方、区分が分かれる理由、メーカーごとの設計思想までを合わせて扱います。',
  },
  {
    q: 'どういう順で読む？',
    a: 'まず商品の種類を選び、その中で「学ぶ → 引く → 比べる」の順に進みます。',
    detail:
      '区分やスペックの意味を先に押さえてから個別の製品を見ると、型番の違いが差分として理解できます。逆順でも読めますが、この順が最短です。',
  },
  {
    q: '情報はどこから？',
    a: 'スペックの数値はメーカー公式のみ。区分の分け方やメーカーの傾向は家電量販店の情報も使います。',
    detail:
      '公式・量販店・その他の3層に分けて出典を記録し、どの層から得た情報かがページ上で分かるようにしています。数値は必ず公式で裏取りします。',
  },
];

export default function Home() {
  const active = types.filter((t) => t.status === 'active');
  const planned = types.filter((t) => t.status !== 'active');

  return (
    <div className="wrap">
      <div className="pageHead">
        <div className="metaRow">
          <span className="tag">📚 学習サイト</span>
          <span className="spacer" />
          <span className="badge planned">PCから作成中</span>
        </div>
        <h1>家電を学ぶ</h1>
        <p className="lead">
          最新の家電を、商品の種類ごとに体系立てて学ぶための個人用サイトです。
        </p>
      </div>

      <OneLine>
        メーカー公式の情報をもとに、スペックの読み方・区分の違い・メーカーの設計思想を
        一続きの流れで学べるようにまとめています。
      </OneLine>

      <Points items={points} />

      <Card title="商品の種類">
        <List>
          {active.map((t) => (
            <Row
              key={t.slug}
              href={`/${t.slug}`}
              title={`${t.icon} ${t.name}`}
              badge={{ kind: 'done', label: '作成中' }}
              sub={t.lead}
            />
          ))}
          {planned.map((t) => (
            <Row
              key={t.slug}
              title={`${t.icon} ${t.name}`}
              badge={{ kind: 'planned', label: '未着手' }}
              sub={t.lead}
            />
          ))}
        </List>
        <p className="note">
          まずノート・モバイルPCを作り込み、そこで固まった構成を他の種類へ広げていきます。
        </p>
      </Card>

      <Card title="サイトの構造">
        <p>
          製品を「引く」ための道筋と、「理解する」ための道筋を分けています。
          分類の階層は住所にすぎず、知識の体系はそれとは別に用意する、という考え方です。
        </p>
        <List>
          <Row
            title="住所 — メーカー / シリーズ / 型番"
            sub="製品を引くための構造。型番はメーカーに一意で不変なので、この軸だけは将来も壊れません。"
          />
          <Row
            title="体系 — 区分の違いとスペックの読み方"
            sub="理解するための構造。方式やグレードを階層に固定すると、方式どうしの違いという最も学びたい部分が消えるため、記事として正面から扱います。"
          />
          <Row
            title="メーカー — 設計思想とシリーズ体系"
            sub="作り手を理解する構造。シリーズ名と型番の読み方が分かると、一覧が意味を持ち始めます。"
          />
          <Row
            title="比較 — 同じ種類の中で最大4件"
            sub="メーカーを問わず横断で並べられます。並列に見せるのはここと、各ページに1枚だけ置く比較表に限ります。"
          />
        </List>
      </Card>
    </div>
  );
}
