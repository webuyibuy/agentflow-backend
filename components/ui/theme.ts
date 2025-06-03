// Apple Design System 2025 - Color Palette
export const appleColors = {
  // Primary colors
  primary: {
    light: "#0071e3", // Apple blue
    DEFAULT: "#0066cc", // Apple blue (slightly darker)
    dark: "#0055b3", // Apple blue (darker)
    hover: "#0077ED", // Hover state
    active: "#005CC8", // Active state
  },

  // Neutral colors
  neutral: {
    50: "#f9f9f9", // Almost white
    100: "#f2f2f7", // Light background
    200: "#e5e5ea", // Light dividers
    300: "#d1d1d6", // Medium dividers
    400: "#c7c7cc", // Medium-dark dividers
    500: "#aeaeb2", // Medium text
    600: "#8e8e93", // Medium-dark text
    700: "#636366", // Dark text
    800: "#3a3a3c", // Very dark text
    900: "#1c1c1e", // Almost black
  },

  // Semantic colors
  success: {
    light: "#34c759", // Success light
    DEFAULT: "#30b94e", // Success default
    dark: "#2ca745", // Success dark
  },
  warning: {
    light: "#ff9f0a", // Warning light
    DEFAULT: "#ff9500", // Warning default
    dark: "#e68600", // Warning dark
  },
  error: {
    light: "#ff3b30", // Error light
    DEFAULT: "#ff2d20", // Error default
    dark: "#e62920", // Error dark
  },
  info: {
    light: "#5ac8fa", // Info light
    DEFAULT: "#5ac8fa", // Info default
    dark: "#4db5e6", // Info dark
  },

  // Special colors
  accent1: "#bf5af2", // Purple accent
  accent2: "#ff2d55", // Pink accent
  accent3: "#5e5ce6", // Indigo accent

  // Background colors
  background: {
    primary: "#ffffff", // Primary background
    secondary: "#f2f2f7", // Secondary background
    tertiary: "#e5e5ea", // Tertiary background
    elevated: "#ffffff", // Elevated background
    dark: {
      primary: "#1c1c1e", // Dark primary background
      secondary: "#2c2c2e", // Dark secondary background
      tertiary: "#3a3a3c", // Dark tertiary background
      elevated: "#2c2c2e", // Dark elevated background
    },
  },

  // Special UI elements
  glass: {
    light: "rgba(255, 255, 255, 0.72)",
    dark: "rgba(30, 30, 30, 0.65)",
  },

  // Gradient colors
  gradient: {
    blue: ["#0091ff", "#0066cc"],
    purple: ["#bf5af2", "#9851e0"],
    orange: ["#ff9f0a", "#ff7d0a"],
  },
}

// Apple Typography 2025
export const appleTypography = {
  fontFamily: {
    sans: 'SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: "SF Mono, SFMono-Regular, ui-monospace, monospace",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
  },
}

// Apple Spacing 2025
export const appleSpacing = {
  0: "0",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  11: "2.75rem", // 44px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  28: "7rem", // 112px
  32: "8rem", // 128px
  36: "9rem", // 144px
  40: "10rem", // 160px
  44: "11rem", // 176px
  48: "12rem", // 192px
  52: "13rem", // 208px
  56: "14rem", // 224px
  60: "15rem", // 240px
  64: "16rem", // 256px
  72: "18rem", // 288px
  80: "20rem", // 320px
  96: "24rem", // 384px
}

// Apple Shadows 2025
export const appleShadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  // Apple-specific shadows
  elevated: "0 8px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.05)",
  card: "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
  button: "0 1px 2px rgba(0, 0, 0, 0.08)",
  focus: "0 0 0 4px rgba(0, 125, 250, 0.6)",
  none: "none",
}

// Apple Border Radius 2025
export const appleBorderRadius = {
  none: "0",
  sm: "0.25rem", // 4px
  DEFAULT: "0.5rem", // 8px
  md: "0.75rem", // 12px
  lg: "1rem", // 16px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.75rem", // 28px
  full: "9999px",
  // Apple-specific
  button: "0.75rem", // 12px
  card: "1rem", // 16px
  modal: "1.25rem", // 20px
  pill: "9999px",
}

// Apple Transitions 2025
export const appleTransitions = {
  duration: {
    75: "75ms",
    100: "100ms",
    150: "150ms",
    200: "200ms",
    300: "300ms",
    400: "400ms",
    500: "500ms",
    700: "700ms",
    1000: "1000ms",
  },
  timing: {
    DEFAULT: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    // Apple-specific
    spring: "cubic-bezier(0.25, 0.1, 0.25, 1.05)",
    bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
}

// Apple Z-Index 2025
export const appleZIndex = {
  0: "0",
  10: "10",
  20: "20",
  30: "30",
  40: "40",
  50: "50",
  auto: "auto",
  // Apple-specific
  base: "1",
  dropdown: "1000",
  sticky: "1100",
  fixed: "1200",
  modal: "1300",
  popover: "1400",
  tooltip: "1500",
  toast: "1600",
}
