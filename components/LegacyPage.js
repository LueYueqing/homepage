import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import { readLegacyDocument } from '../lib/legacyHtml';

function withoutBlock(html, id) {
  const marker = `id="${id}"`;
  const start = html.indexOf(marker);
  if (start < 0) return html;
  const open = html.lastIndexOf('<div', start);
  if (open < 0) return html;
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = open;
  let depth = 0;
  let match = tag.exec(html);
  while (match) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return `${html.slice(0, open)}${html.slice(tag.lastIndex)}`;
    match = tag.exec(html);
  }
  return html;
}

export default function LegacyPage({
  file,
  self,
  styles = ['/common/base.a83ad4.css'],
  localImages = false,
  id,
  header = false,
}) {
  const doc = readLegacyDocument(file, { self, localImages });
  const showFrame = header && self !== '/';
  const body = showFrame ? withoutBlock(withoutBlock(doc.body, 'headDiv'), 'bottomDiv') : doc.body;

  return (
    <>
      {styles.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {doc.headCss ? <style dangerouslySetInnerHTML={{ __html: doc.headCss }} /> : null}
      {showFrame ? <SiteHeader current={self} /> : null}
      <div id={id} dangerouslySetInnerHTML={{ __html: body }} />
      {showFrame ? <SiteFooter /> : null}
    </>
  );
}
