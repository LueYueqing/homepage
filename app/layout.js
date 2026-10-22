export const metadata = {
  title: '简法主页',
  description: '简法主页是一个极简风格的主页网站，简洁清新，轻快大方。',
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
      <body>{children}</body>
    </html>
  );
}
