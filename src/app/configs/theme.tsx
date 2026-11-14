/**
 * Application theme — "Ledger": neutral slate surfaces, borders instead of
 * shadows, compact controls for long sessions over dense tables.
 *
 * `palette` is the only place a colour is written. antd reads it through
 * `appTheme`; Tailwind classes and globals.css read it as `--app-*` through
 * `paletteCssVars`, which the root layout puts on <html>.
 */
import type { CSSProperties } from "react";
import type { ThemeConfig } from "antd";

export const palette = {
  primary: "#2557D6",
  primaryHover: "#3A6AE0",
  primaryActive: "#1E48B5",
  primarySoft: "#E8EEFB",
  primaryPale: "#F3F6FD",

  canvas: "#F3F5F8",
  surface: "#FFFFFF",
  surfaceSunken: "#F6F7F9",

  text: "#1B2433",
  textSecondary: "#4A5568",
  textMuted: "#6B7686",
  textPlaceholder: "#8A94A3",

  border: "#DDE2EA",
  borderSoft: "#E8ECF1",

  success: "#2F8A55",
  successSoft: "#E9F6EE",
  warning: "#B7791F",
  warningSoft: "#FDF4E3",
  danger: "#C2414D",
  dangerSoft: "#FCEBEC",
} as const;

/** The same palette as CSS custom properties — names kept from the old `:root` block. */
export const paletteCssVars = {
  "--app-primary": palette.primary,
  "--app-primary-soft": palette.primarySoft,
  "--app-primary-pale": palette.primaryPale,
  "--app-bg": palette.canvas,
  "--app-surface": palette.surface,
  "--app-surface-sunken": palette.surfaceSunken,
  "--app-text": palette.text,
  "--app-text-secondary": palette.textSecondary,
  "--app-text-muted": palette.textMuted,
  "--app-text-placeholder": palette.textPlaceholder,
  "--app-border": palette.border,
  "--app-border-soft": palette.borderSoft,
  "--app-success": palette.success,
  "--app-success-soft": palette.successSoft,
  "--app-warning": palette.warning,
  "--app-warning-soft": palette.warningSoft,
  "--app-danger": palette.danger,
  "--app-danger-soft": palette.dangerSoft,
} as CSSProperties; // CSSProperties has no index signature for custom properties

const FONT = 'var(--font-sans), "IBM Plex Sans Thai", -apple-system, BlinkMacSystemFont, sans-serif';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: palette.primary,
    colorInfo: palette.primary,
    colorLink: palette.primary,

    colorSuccess: palette.success,
    colorWarning: palette.warning,
    colorError: palette.danger,

    colorBgBase: palette.surface,
    colorBgLayout: palette.canvas,
    colorBgContainer: palette.surface,
    colorBgElevated: palette.surface,

    colorText: palette.text,
    colorTextSecondary: palette.textSecondary,
    colorTextTertiary: palette.textMuted,
    colorTextQuaternary: palette.textPlaceholder,
    colorTextPlaceholder: palette.textPlaceholder,

    colorBorder: palette.border,
    colorBorderSecondary: palette.borderSoft,
    colorSplit: palette.borderSoft,

    fontFamily: FONT,
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading3: 22,
    fontSizeHeading2: 26,

    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,

    controlHeight: 32,
    controlHeightSM: 26,
    controlHeightLG: 38,

    // Borders separate surfaces; shadow is kept only for floating layers.
    boxShadowTertiary: "none",
    boxShadowSecondary: "0 4px 12px rgba(27, 36, 51, 0.08)",
  },

  components: {
    Layout: {
      bodyBg: palette.canvas,
      headerBg: palette.surface,
      siderBg: palette.surface,
      headerHeight: 56,
    },

    Menu: {
      itemBg: "transparent",
      itemColor: palette.textSecondary,
      itemHoverColor: palette.primary,
      itemHoverBg: palette.primaryPale,
      itemSelectedColor: palette.primary,
      itemSelectedBg: palette.primarySoft,
      itemActiveBg: palette.primarySoft,
      itemBorderRadius: 6,
      itemHeight: 36,
      iconSize: 16,
    },

    Button: {
      fontWeight: 500,
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      defaultBorderColor: palette.border,
      defaultColor: palette.text,
    },

    Input: {
      activeShadow: `0 0 0 2px ${palette.primarySoft}`,
    },

    InputNumber: {
      activeShadow: `0 0 0 2px ${palette.primarySoft}`,
    },

    Select: {
      optionSelectedBg: palette.primarySoft,
      optionActiveBg: palette.primaryPale,
    },

    Card: {
      colorBorderSecondary: palette.border,
    },

    Table: {
      headerBg: palette.surfaceSunken,
      headerColor: palette.textSecondary,
      rowHoverBg: palette.primaryPale,
      borderColor: palette.borderSoft,
      // 140 of 145 tables are size="small", which reads the SM paddings.
      cellPaddingBlockSM: 6,
      cellPaddingInlineSM: 10,
      cellPaddingBlock: 8,
      cellPaddingInline: 12,
    },

    Tag: {
      defaultBg: palette.surfaceSunken,
      defaultColor: palette.textSecondary,
    },

    Tabs: {
      itemColor: palette.textSecondary,
      horizontalItemPadding: "10px 0",
    },

    Breadcrumb: {
      itemColor: palette.textMuted,
      lastItemColor: palette.text,
      linkColor: palette.textSecondary,
      linkHoverColor: palette.primary,
      separatorColor: palette.textPlaceholder,
    },

    Modal: {
      borderRadiusLG: 10,
    },
  },
};
