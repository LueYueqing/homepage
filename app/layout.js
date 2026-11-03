import { BUILD_ID } from '../lib/build-id.mjs';
import { HOME_DESCRIPTION, HOME_TITLE, SITE } from '../lib/seo';

export const metadata = {
  metadataBase: new URL(SITE),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-cn">
      <head>
        <meta name="build" content={BUILD_ID} />
      </head>
      <body>{children}</body>
    </html>
  );
}
