import { readLegacyDocument } from '../lib/legacyHtml';

export default function LegacyPage({
  file,
  self,
  styles = ['/common/base.a83ad4.css'],
  localImages = false,
  id,
}) {
  const doc = readLegacyDocument(file, { self, localImages });

  return (
    <>
      {styles.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div id={id} dangerouslySetInnerHTML={{ __html: doc.body }} />
    </>
  );
}
