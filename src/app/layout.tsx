import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { App, ConfigProvider } from "antd";
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
        {/*
          `App` as well as `ConfigProvider`, not instead of it.

          `ConfigProvider` supplies the theme; `App` is what puts `message`,
          `modal` and `notification` inside React's tree so they can read it.
          Without it the only way to raise a toast is antd's static
          `message.success(…)`, which sits outside the provider entirely — antd
          warns about it, and the toast renders unthemed.
        */}
        <ConfigProvider theme={appTheme}>
          <App>{children}</App>
        </ConfigProvider>
      </body>
    </html>
  );
}
