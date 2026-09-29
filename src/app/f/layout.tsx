/**
 * CD-66 — the customers' pages. No app shell: no menu, no company switcher,
 * nothing that assumes a signed-in person. The root layout still supplies
 * antd's providers.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}
