/**
 * Get responsive height for charts based on screen size.
 * @param desktopHeight Height for desktop screens (>=768px)
 * @param mobileHeight Optional custom mobile height, defaults to 60% of desktop
 */
export const getResponsiveChartHeight = (
  desktopHeight: number,
  mobileHeight: number | null = null
): number => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const calculatedMobileHeight = mobileHeight || Math.min(desktopHeight * 0.6, 280);
  return isMobile ? calculatedMobileHeight : desktopHeight;
};

export type ChartSize = 'large' | 'medium' | 'regular' | 'small' | 'mini';

/**
 * Responsive heights for common chart sizes.
 */
export const CHART_HEIGHTS: Record<ChartSize, { desktop: number; mobile: number }> = {
  large: { desktop: 500, mobile: 300 },
  medium: { desktop: 400, mobile: 260 },
  regular: { desktop: 350, mobile: 250 },
  small: { desktop: 300, mobile: 220 },
  mini: { desktop: 250, mobile: 180 },
};

/**
 * Get height by preset name.
 */
export const getChartHeight = (size: ChartSize = 'regular'): number => {
  const preset = CHART_HEIGHTS[size] || CHART_HEIGHTS.regular;
  return getResponsiveChartHeight(preset.desktop, preset.mobile);
};

/**
 * Get responsive tooltip configuration for Recharts.
 * Prevents tooltips from being cut off on mobile.
 */
export const getResponsiveTooltipConfig = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return {
    wrapperStyle: isMobile
      ? { pointerEvents: 'none' as const, zIndex: 1000 }
      : {},
    allowEscapeViewBox: { x: true, y: true },
    position: isMobile ? { y: 0 } : undefined,
  };
};

/**
 * Export chart as PNG (simple implementation).
 * Note: basic implementation. For production, consider using html2canvas.
 */
export const exportChartAsPNG = async (chartId: string, filename = 'chart.png'): Promise<void> => {
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
    if (!ctx) {
      console.error('Could not get 2D canvas context');
      return;
    }
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
