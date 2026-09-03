import makers from '../../data/pc/makers.json';
import learn from '../../data/pc/learn.json';
import { Card, OneLine, Points, List, Row } from '../../components/blocks';

export const metadata = {
  title: 'ノート・モバイルPC | 家電を学ぶ',
  description: 'メーカーごとのシリーズ体系と、スペックの読み方から学ぶノート・モバイルPCの学習ページ。',
};

const points = [
  {
    q: '何から学ぶ？',
    a: 'まず「区分」と「スペックの読み方」、次にメーカーのシリーズ体系、最後に個別の製品です。',
    detail:
      'CPUの型番やパネル方式の意味を先に押さえておくと、製品ページのスペック表が単なる数字の羅列ではなく、設計上の選択として読めるようになります。',
  },
  {
    q: 'なぜメーカーから引く？',
    a: 'PCはブランド体系そのものに設計思想が現れていて、しかもメーカーと型番の関係は将来も変わらないためです。',
    detail:
      '「モバイル」「クリエイター」といった用途区分は時代とともに揺れますが、型番がどのメーカーのどのシリーズに属するかは変わりません。壊れない軸を住所に使い、揺れる軸はタグとして扱います。',
  },
  {
    q: 'どこまで扱う？',
    a: '現行機種と、販売終了でも発売から6ヶ月以内のものを対象にします。',
    detail:
      '6ヶ月を過ぎたものも削除はせず、一覧から隠すだけにします。世代ごとの変化を追うには旧モデルの情報が必要になるためです。価格は参考程度にとどめ、比較表には出しません。',
  },
];

export default function PcPage() {
  const domestic = makers.filter((m) => m.origin === '国内');
  const overseas = makers.filter((m) => m.origin === '海外');

  const makerRow = (m) => (
    <Row
      key={m.slug}
      title={`${m.brand}（${m.name}）`}
      badge={{ kind: 'planned', label: '未作成' }}
      sub={m.oneLine}
      meta={`主なシリーズ: ${m.series.join(' / ')}`}
    />
  );

  return (
    <div className="wrap">
      <div className="pageHead">
        <div className="metaRow">
          <span className="tag">💻 ノート・モバイルPC</span>
          <span className="spacer" />
          <span className="badge planned">作成中</span>
        </div>
        <h1>ノート・モバイルPC</h1>
        <p className="lead">
          メーカーごとのシリーズ体系と、CPU・ディスプレイなどスペックの読み方を学びます。
        </p>
        <div className="metaLine">
          <span>住所の軸: メーカー</span>
          <span>対象: 現行機種 ＋ 発売6ヶ月以内の終売品</span>
          <span>比較: 最大4件</span>
        </div>
      </div>

      <OneLine>
        同じ「ノートPC」でも、重量・GPU・冷却のどこに予算を割いたかで別物になります。
        その配分の違いを、区分とスペックの両面から読めるようにするのがこのページの目的です。
      </OneLine>

      <Points items={points} />

      <Card title="学ぶ — 区分の違い">
        <p>
          区分そのものを記事として扱います。カードで並べるのではなく、
          基本形からどう派生してきたかの順に読めるように書きます。
        </p>
        <List>
          {learn.segments.map((s) => (
            <Row
              key={s.slug}
              title={s.title}
              badge={{ kind: 'planned', label: '未作成' }}
              sub={s.oneLine}
              meta={`扱う区分: ${s.items.join(' / ')}`}
            />
          ))}
        </List>
      </Card>

      <Card title="学ぶ — スペックの読み方">
        <p>
          数値の意味が分かると、製品ページの比較が「差」ではなく「設計の選択」として見えてきます。
        </p>
        <List>
          {learn.specs.map((s) => (
            <Row
              key={s.slug}
              title={s.title}
              badge={{ kind: 'planned', label: '未作成' }}
              sub={s.oneLine}
            />
          ))}
        </List>
      </Card>

      <Card title="引く — メーカーから">
        <p>
          各メーカーのページでは、設計思想・シリーズ体系・型番の読み方をまとめます。
          型番のルールが分かると、一覧が意味を持ち始めます。
        </p>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: '20px 0 6px' }}>国内メーカー</h3>
        <List>{domestic.map(makerRow)}</List>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: '24px 0 6px' }}>海外メーカー</h3>
        <List>{overseas.map(makerRow)}</List>
        <p className="note">
          着手順は 富士通 / NEC / Dynabook / Panasonic / VAIO → Lenovo / HP / Dell / ASUS → Apple / Microsoft。
          シリーズ体系が明快で学習素材として扱いやすい国内メーカーから作ります。
        </p>
      </Card>

      <Card title="比べる">
        <p>
          メーカーを問わず、ノートPCどうしを最大4件まで並べて比較できるようにします。
          比較表の項目・並び順・差分の強調は、スペック定義（<code>data/pc/schema.json</code>）から
          自動生成する方針です。
        </p>
        <p className="note">
          製品データの投入後に公開します。比較表に載せるのはメーカー公式の値のみです。
        </p>
      </Card>

      <p className="sourceNote">
        このページはサイト構成の骨組みです。各解説ページはメーカー公式（スペック・機能名）と
        家電量販店（区分の呼称、メーカーの傾向）を出典として順次作成します。最終更新 2026-09-03。
      </p>
    </div>
  );
}
