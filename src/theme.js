export const getThemeConfig = (dark = false) => {
  const surfaces = dark
    ? {
        bgBase: "#0f1117",
        bgLayout: "#0f1117",
        bgContainer: "#171a24",
        bgElevated: "#1b2030",
        bgSpotlight: "#252b3b",
        text: "#e5e7eb",
        textSecondary: "#9aa4b2",
        textTertiary: "#7f8896",
        textDisabled: "#5f6773",
        border: "#2b3242",
        borderSecondary: "#232938",
        controlActiveBg: "#27324a",
        tableHeaderBg: "#1f2635",
        tableHoverBg: "#232d40",
        shadow: "0 1px 3px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.28)",
      }
    : {
        bgBase: "#f0f2f7",
        bgLayout: "#f0f2f7",
        bgContainer: "#ffffff",
        bgElevated: "#ffffff",
        bgSpotlight: "#f5f6fa",
        text: "#1a1d2e",
        textSecondary: "#6b7280",
        textTertiary: "#9ca3af",
        textDisabled: "#c4c9d4",
        border: "#e5e7ef",
        borderSecondary: "#f0f1f5",
        controlActiveBg: "#eaf0ff",
        tableHeaderBg: "#f5f6fa",
        tableHoverBg: "#f5f6ff",
        shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      };

  return {
    token: {
      colorPrimary: "#4361ee",
      colorPrimaryHover: "#3a56d4",
      colorPrimaryActive: "#2f48c0",

      colorBgBase: surfaces.bgBase,
      colorBgContainer: surfaces.bgContainer,
      colorBgLayout: surfaces.bgLayout,
      colorBgElevated: surfaces.bgElevated,
      colorBgSpotlight: surfaces.bgSpotlight,

      colorText: surfaces.text,
      colorTextBase: surfaces.text,
      colorTextSecondary: surfaces.textSecondary,
      colorTextTertiary: surfaces.textTertiary,
      colorTextDisabled: surfaces.textDisabled,

      colorBorder: surfaces.border,
      colorBorderSecondary: surfaces.borderSecondary,
      controlItemBgActive: surfaces.controlActiveBg,

      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontSize: 14,
      fontSizeLG: 16,
      fontSizeHeading3: 20,
      fontWeightStrong: 600,
      lineHeight: 1.6,

      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 6,

      boxShadow: surfaces.shadow,
      boxShadowSecondary: dark
        ? "0 4px 16px rgba(26,36,56,0.45)"
        : "0 4px 16px rgba(67,97,238,0.10)",

      motionDurationMid: "0.2s",
    },

    components: {
      Layout: {
        bodyBg: surfaces.bgLayout,
        headerBg: surfaces.bgContainer,
        siderBg: dark ? "#10131d" : "#1a1d2e",
      },

      Menu: {
        darkItemBg: "#10131d",
        darkSubMenuItemBg: "#0d1018",
        darkItemSelectedBg: "#4361ee",
        darkItemHoverBg: "#252840",
        darkItemColor: "#a0a8c0",
        darkItemSelectedColor: "#ffffff",
        itemBorderRadius: 8,
      },

      Card: {
        colorBgContainer: surfaces.bgContainer,
        borderRadiusLG: 14,
        boxShadow: surfaces.shadow,
      },

      Table: {
        colorBgContainer: surfaces.bgContainer,
        headerBg: surfaces.tableHeaderBg,
        headerColor: surfaces.textSecondary,
        headerSplitColor: "transparent",
        rowHoverBg: surfaces.tableHoverBg,
        rowSelectedBg: surfaces.controlActiveBg,
        rowSelectedHoverBg: surfaces.controlActiveBg,
        borderColor: surfaces.borderSecondary,
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
      },

      Input: {
        colorBgContainer: surfaces.bgContainer,
        activeBg: surfaces.bgContainer,
        hoverBg: surfaces.bgContainer,
        colorBorder: surfaces.border,
        activeBorderColor: "#4361ee",
        hoverBorderColor: "#4361ee",
      },

      Select: {
        colorBgContainer: surfaces.bgContainer,
        optionSelectedBg: surfaces.controlActiveBg,
        optionActiveBg: surfaces.controlActiveBg,
        selectorBg: surfaces.bgContainer,
        colorBorder: surfaces.border,
      },

      Modal: {
        colorBgElevated: surfaces.bgElevated,
        colorBgMask: "rgba(0,0,0,0.45)",
        titleColor: surfaces.text,
      },

      Dropdown: {
        colorBgElevated: surfaces.bgElevated,
      },

      Button: {
        defaultBg: surfaces.bgContainer,
        defaultColor: surfaces.text,
        defaultBorderColor: surfaces.border,
        defaultHoverBg: surfaces.bgContainer,
        defaultActiveBg: surfaces.bgContainer,
        borderRadius: 8,
      },
    },
  };
};
