import { theme } from "antd";

// export const appTheme = {
//   algorithm: theme.defaultAlgorithm,

//   token: {
//     // ─────────────────────────────
//     // Brand
//     // ─────────────────────────────
//     colorPrimary: "#3B82F6",
//     colorPrimaryHover: "#60A5FA",
//     colorPrimaryActive: "#2563EB",

//     // ─────────────────────────────
//     // Background
//     // ─────────────────────────────
//     colorBgBase: "#F6F8FC",
//     colorBgLayout: "#F6F8FC",
//     colorBgContainer: "#FFFFFF",
//     colorBgElevated: "#FFFFFF",

//     // ─────────────────────────────
//     // Text
//     // ─────────────────────────────
//     colorText: "#24344D",
//     colorTextSecondary: "#718096",
//     colorTextTertiary: "#9AA9BC",
//     colorTextQuaternary: "#C1CBD8",

//     // ─────────────────────────────
//     // Border
//     // ─────────────────────────────
//     colorBorder: "#E4EAF2",
//     colorBorderSecondary: "#EDF1F6",

//     // ─────────────────────────────
//     // Radius
//     // ─────────────────────────────
//     borderRadius: 10,
//     borderRadiusSM: 7,
//     borderRadiusLG: 14,

//     // ─────────────────────────────
//     // Controls
//     // ─────────────────────────────
//     controlHeight: 38,
//     controlHeightSM: 32,
//     controlHeightLG: 44,

//     // ─────────────────────────────
//     // Shadows
//     // ─────────────────────────────
//     boxShadow: "0 2px 8px rgba(30, 64, 100, 0.04)",

//     boxShadowSecondary: "0 6px 20px rgba(30, 64, 100, 0.07)",

//     // ─────────────────────────────
//     // Typography
//     // ─────────────────────────────
//     fontFamily: '"Inter", "Noto Sans Thai", "Noto Sans", sans-serif',

//     fontSize: 14,
//     fontSizeHeading1: 28,
//     fontSizeHeading2: 22,
//     fontSizeHeading3: 18,
//   },

//   components: {
//     Layout: {
//       headerBg: "#FFFFFF",
//       siderBg: "#FFFFFF",
//       bodyBg: "#F6F8FC",
//       headerHeight: 72,
//     },

//     Menu: {
//       itemBg: "transparent",
//       itemColor: "#52627A",

//       itemHoverBg: "#F5F8FE",
//       itemHoverColor: "#2563EB",

//       itemSelectedBg: "#EEF4FF",
//       itemSelectedColor: "#2563EB",

//       itemBorderRadius: 10,

//       activeBarWidth: 0,
//     },

//     Button: {
//       borderRadius: 8,

//       colorPrimary: "#3B82F6",
//       colorPrimaryHover: "#60A5FA",
//       colorPrimaryActive: "#2563EB",

//       primaryShadow: "0 3px 8px rgba(59, 130, 246, 0.18)",

//       defaultBorderColor: "#DDE5EF",
//       defaultColor: "#34445B",

//       defaultHoverBorderColor: "#AFC7ED",
//       defaultHoverColor: "#2563EB",
//     },

//     Card: {
//       borderRadiusLG: 14,
//       colorBorderSecondary: "#E8EDF4",

//       boxShadowTertiary: "0 2px 8px rgba(30, 64, 100, 0.035)",
//     },

//     Input: {
//       borderRadius: 8,

//       colorBgContainer: "#FFFFFF",

//       activeBorderColor: "#8CB5F5",
//       hoverBorderColor: "#B7CEF2",

//       activeShadow: "0 0 0 3px rgba(59, 130, 246, 0.08)",
//     },

//     Select: {
//       borderRadius: 8,

//       optionSelectedBg: "#EEF4FF",
//       optionSelectedColor: "#2563EB",

//       optionActiveBg: "#F5F8FE",
//     },

//     Table: {
//       headerBg: "#F8FAFD",
//       headerColor: "#52627A",

//       rowHoverBg: "#F8FAFE",

//       borderColor: "#EDF1F6",
//     },

//     Tabs: {
//       itemColor: "#718096",
//       itemHoverColor: "#3B82F6",
//       itemSelectedColor: "#2563EB",

//       inkBarColor: "#3B82F6",
//     },

//     Tag: {
//       borderRadiusSM: 6,
//     },

//     Badge: {
//       colorError: "#EF6A6A",
//     },

//     Divider: {
//       colorSplit: "#E9EEF5",
//     },

//     Tooltip: {
//       borderRadius: 8,
//     },
//   },
// };
// theme.ts
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
  },
};
