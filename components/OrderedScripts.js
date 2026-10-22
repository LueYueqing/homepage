'use client';

import Script from 'next/script';
import { useState } from 'react';

export default function OrderedScripts({ srcs }) {
  const [loaded, setLoaded] = useState(0);

  return (
    <>
      {srcs.map((src, index) =>
        index <= loaded ? (
          <Script
            key={src}
            src={src}
            strategy="afterInteractive"
            onLoad={() => setLoaded((count) => Math.max(count, index + 1))}
            onError={() => setLoaded((count) => Math.max(count, index + 1))}
          />
        ) : null
      )}
    </>
  );
}
