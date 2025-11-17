/**
 * Get responsive height for charts based on screen size
 * @param {number} desktopHeight - Height for desktop screens (≥768px)
 * @param {number} mobileHeight - Optional custom mobile height, defaults to 60% of desktop
 * @returns {number} - The responsive height
 */
export const getResponsiveChartHeight = (desktopHeight, mobileHeight = null) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const calculatedMobileHeight = mobileHeight || Math.min(desktopHeight * 0.6, 280);
  return isMobile ? calculatedMobileHeight : desktopHeight;
};

/**
 * Responsive heights for common chart sizes
 */
export const CHART_HEIGHTS = {
  // Large charts (main visualizations)
  large: {
    desktop: 500,
    mobile: 300
  },
  // Medium charts (secondary visualizations)
  medium: {
    desktop: 400,
    mobile: 260
  },
  // Regular charts (standard size)
  regular: {
    desktop: 350,
    mobile: 250
  },
  // Small charts (compact visualizations)
  small: {
    desktop: 300,
    mobile: 220
  },
  // Mini charts (minimal space)
  mini: {
    desktop: 250,
    mobile: 180
  }
};

/**
 * Get height by preset name
 * @param {string} size - Size preset ('large', 'medium', 'regular', 'small', 'mini')
 * @returns {number} - The responsive height
 */
export const getChartHeight = (size = 'regular') => {
  const preset = CHART_HEIGHTS[size] || CHART_HEIGHTS.regular;
  return getResponsiveChartHeight(preset.desktop, preset.mobile);
};
