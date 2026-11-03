import SiteHeader from './SiteHeader';
import { readLegacyDocument } from '../lib/legacyHtml';

function withoutHeader(html) {
  return html.replace(/<div id="headDiv">[\s\S]*?<\/div>\s*<\/div>/, '');
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
  const body = header ? withoutHeader(doc.body) : doc.body;

  return (
    <>
      {styles.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {doc.headCss ? <style dangerouslySetInnerHTML={{ __html: doc.headCss }} /> : null}
      {header ? <SiteHeader current={self} /> : null}
      <div id={id} dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
