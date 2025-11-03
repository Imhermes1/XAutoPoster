import { ToastProvider } from '@/components/Toast';

export const metadata = {
  title: 'X Autoposter',
  description: 'Automate X (Twitter) posting with RSS + LLM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"', margin: 0, padding: 0, backgroundColor: '#f9fafb' }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

