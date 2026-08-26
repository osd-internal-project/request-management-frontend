import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "antd";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Connect the Dot",
  description: "Connect the Dot : Request Management System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`h-full antialiased ${kanit.className}`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ConfigProvider
          theme={{
            token: {
              // Global primary accent color (Buttons, active states, etc.)
              colorPrimary: "#ff6600",
            },
            components: {
              // Customizing Header styling
              Layout: {
                headerBg: "#ffffff",
                headerColor: "#000000",
                bodyBg: "#f5f5f5", // Content area background
              },
              // Customizing Sidebar (Sider) and Menu styling
              Menu: {
                // itemBg: "#ffffff", // Background for unselected items
                darkItemBg: "#000000", // Black background for dark menu
                darkItemSelectedBg: "#ff6600", // Orange background for active item
                darkItemColor: "#a6a6a6", // Text color for unselected items
                darkItemSelectedColor: "#ffffff", // Text color for active item
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
