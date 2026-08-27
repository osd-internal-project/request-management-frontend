/**
 * Application theme — light surfaces, blue accent.
 *
 * One palette, defined once. An earlier palette (#3B82F6) sat commented out
 * above the live one (#2F6FED) for long enough that neither was obviously the
 * real one; it has been removed rather than left as a second opinion.
 */
import type { ThemeConfig } from "antd";

export const appTheme: ThemeConfig = {
  token: {
    // Brand
    colorPrimary: "#2F6FED",
    colorInfo: "#2F6FED",

    // Semantic
    colorSuccess: "#48A868",
    colorWarning: "#D99A32",
    colorError: "#D9535F",

    // Background
    colorBgBase: "#F7F9FC",
    colorBgLayout: "#F7F9FC",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",

    // Text
    colorText: "#17243A",
    colorTextSecondary: "#66758A",
    colorTextTertiary: "#91A0B4",
    colorTextQuaternary: "#B8C3D1",

    // Border
    colorBorder: "#E3E9F2",
    colorBorderSecondary: "#EDF1F6",

    // Typography
    fontFamily:
      'Inter, "Noto Sans Thai", "Noto Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading3: 22,
    fontSizeHeading2: 28,

    // Shape
    borderRadius: 8,
    borderRadiusSM: 6,
    borderRadiusLG: 14,

    // Controls
    controlHeight: 38,
    controlHeightSM: 32,
    controlHeightLG: 44,

    // Shadows
    boxShadow:
      "0 1px 3px rgba(23, 36, 58, 0.04), 0 8px 24px rgba(23, 36, 58, 0.04)",

    boxShadowSecondary: "0 2px 8px rgba(23, 36, 58, 0.06)",
  },

  components: {
    Layout: {
      bodyBg: "#F7F9FC",
      headerBg: "#FFFFFF",
      siderBg: "#FFFFFF",
      headerHeight: 68,
    },

    Menu: {
      itemBg: "transparent",
      itemColor: "#66758A",
      itemHoverColor: "#2F6FED",
      itemHoverBg: "#F4F7FD",
      itemSelectedColor: "#2F6FED",
      itemSelectedBg: "#EEF4FF",
      itemActiveBg: "#EEF4FF",

      itemBorderRadius: 10,
      itemHeight: 44,

      iconSize: 17,
    },

    Button: {
      borderRadius: 8,
      controlHeight: 38,
      fontWeight: 500,

      primaryShadow: "none",
      defaultShadow: "none",

      colorPrimary: "#2F6FED",
      colorPrimaryHover: "#4280F4",
      colorPrimaryActive: "#245FD2",

      defaultBorderColor: "#DCE4EF",
      defaultColor: "#34445A",
    },

    Input: {
      controlHeight: 38,
      borderRadius: 8,

      colorBorder: "#DCE4EF",
      activeBorderColor: "#6D9AF5",
      hoverBorderColor: "#AFC6F5",

      activeShadow: "0 0 0 3px rgba(47, 111, 237, 0.10)",
    },

    Select: {
      controlHeight: 38,
      borderRadius: 8,

      colorBorder: "#DCE4EF",
      optionSelectedBg: "#EEF4FF",
      optionActiveBg: "#F5F8FD",
    },

    Card: {
      borderRadiusLG: 14,
      colorBorderSecondary: "#E5EAF2",

      boxShadowTertiary:
        "0 1px 3px rgba(23, 36, 58, 0.03), 0 8px 24px rgba(23, 36, 58, 0.035)",
    },

    Table: {
      headerBg: "#F8FAFD",
      headerColor: "#526176",

      rowHoverBg: "#F8FAFF",

      borderColor: "#EDF1F6",

      cellPaddingBlock: 13,
      cellPaddingInline: 16,
    },

    Tag: {
      borderRadiusSM: 999,
      defaultBg: "#F3F6FA",
      defaultColor: "#526176",
    },

    Checkbox: {
      colorPrimary: "#2F6FED",
      colorPrimaryHover: "#4280F4",
    },

    Switch: {
      colorPrimary: "#2F6FED",
      colorPrimaryHover: "#4280F4",
    },

    Modal: {
      borderRadiusLG: 16,
    },

    Tabs: {
      itemColor: "#66758A",
      itemSelectedColor: "#2F6FED",
      itemHoverColor: "#2F6FED",
      inkBarColor: "#2F6FED",
    },

    InputNumber: {
      controlHeight: 38,
      borderRadius: 8,

      colorBorder: "#DCE4EF",
      activeBorderColor: "#6D9AF5",
      hoverBorderColor: "#AFC6F5",

      activeShadow: "0 0 0 3px rgba(47, 111, 237, 0.10)",
    },

    Breadcrumb: {
      itemColor: "#91A0B4",
      lastItemColor: "#17243A",
      linkColor: "#66758A",
      linkHoverColor: "#2F6FED",
      separatorColor: "#B8C3D1",
    },

    Alert: {
      borderRadiusLG: 10,
    },
  },
};
