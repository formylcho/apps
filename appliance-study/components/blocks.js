export function Card({ title, children }) {
  return (
    <section className="card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

export function OneLine({ children }) {
  return (
    <section className="card">
      <h2>一言で言うと</h2>
      <p className="oneLine">{children}</p>
    </section>
  );
}

/**
 * ポイント。〈質問〉→〈太字の結論〉→〈グレーの根拠〉の3段を縦に積む。
 * 横並びのグリッドにはしない（読む順序を保つため）。
 */
export function Points({ title = 'このページのポイント', items }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {items.map((p) => (
        <div className="point" key={p.q}>
          <p className="q">{p.q}</p>
          <p className="a">{p.a}</p>
          <p className="detail">{p.detail}</p>
        </div>
      ))}
    </section>
  );
}

export function Row({ href, title, badge, sub, meta }) {
  const inner = (
    <>
      <div className="rowHead">
        <span className="rowTitle">{title}</span>
        {badge ? <span className={`badge ${badge.kind}`}>{badge.label}</span> : null}
      </div>
      {sub ? <p className="rowSub">{sub}</p> : null}
      {meta ? <p className="rowMeta">{meta}</p> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <a className="rowLink" href={href}>{inner}</a>
      ) : (
        <div className="rowLink disabled">{inner}</div>
      )}
    </li>
  );
}

export function List({ children }) {
  return <ul className="list">{children}</ul>;
}
