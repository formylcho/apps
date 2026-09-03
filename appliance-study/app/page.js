import types from '../data/types.json';
import { Card, List, Row } from '../components/blocks';

export default function Home() {
  const active = types.filter((t) => t.status === 'active');
  const planned = types.filter((t) => t.status !== 'active');

  return (
    <div className="wrap">
      <div className="pageHead">
        <h1>家電を学ぶ</h1>
        <p className="lead">
          最新の家電を、商品の種類ごとに体系立てて学ぶためのサイトです。
        </p>
      </div>

      <Card title="商品の種類">
        <List>
          {active.map((t) => (
            <Row key={t.slug} href={`/${t.slug}`} title={t.name} sub={t.lead} />
          ))}
          {planned.map((t) => (
            <Row
              key={t.slug}
              title={t.name}
              badge={{ kind: 'planned', label: '未着手' }}
              sub={t.lead}
            />
          ))}
        </List>
      </Card>
    </div>
  );
}
