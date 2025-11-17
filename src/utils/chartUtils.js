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

/**
 * Get responsive tooltip configuration for Recharts
 * Prevents tooltips from being cut off on mobile
 * @returns {object} - Tooltip configuration object
 */
export const getResponsiveTooltipConfig = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return {
    wrapperStyle: isMobile ? {
      pointerEvents: 'none',
      zIndex: 1000
    } : {},
    allowEscapeViewBox: { x: true, y: true },
    position: isMobile ? { y: 0 } : undefined
  };
};

/**
 * Export chart as PNG (simple implementation)
 * Note: This is a basic implementation. For production, consider using html2canvas
 * @param {string} chartId - ID of the chart container
 * @param {string} filename - Name of the downloaded file
 */
export const exportChartAsPNG = async (chartId, filename = 'chart.png') => {
  try {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
      console.error('Chart element not found');
      return;
    }

    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) {
      console.error('SVG element not found in chart');
      return;
    }

    // Create a canvas from the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Download the image
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  } catch (error) {
    console.error('Error exporting chart:', error);
    alert('Chart export is not fully supported in this browser. Please use screenshot instead.');
  }
};
