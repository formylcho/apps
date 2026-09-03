import makers from '../../data/pc/makers.json';
import learn from '../../data/pc/learn.json';
import { Card, List, Row } from '../../components/blocks';

export const metadata = {
  title: 'ノート・モバイルPC | 家電を学ぶ',
};

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
        <h1>ノート・モバイルPC</h1>
        <p className="lead">
          メーカーごとのシリーズ体系と、CPU・ディスプレイなどスペックの読み方を学びます。
        </p>
        <div className="metaLine">
          <span>対象: 現行機種 ＋ 発売6ヶ月以内の終売品</span>
          <span>比較: 最大4件</span>
        </div>
      </div>

      <Card title="区分の違い">
        <List>
          {learn.segments.map((s) => (
            <Row
              key={s.slug}
              title={s.title}
              badge={{ kind: 'planned', label: '未作成' }}
              sub={s.oneLine}
            />
          ))}
        </List>
      </Card>

      <Card title="スペックの読み方">
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

      <Card title="メーカー">
        <h3 className="subHead">国内</h3>
        <List>{domestic.map(makerRow)}</List>
        <h3 className="subHead">海外</h3>
        <List>{overseas.map(makerRow)}</List>
      </Card>

      <Card title="比べる">
        <p>ノートPCどうしを、メーカーを問わず最大4件まで並べて比較できます。</p>
        <p className="rowMeta">製品データの投入後に公開します。</p>
      </Card>
    </div>
  );
}
