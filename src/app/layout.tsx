import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "antd";
import { appTheme } from "./configs/theme";

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
          theme={appTheme}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
