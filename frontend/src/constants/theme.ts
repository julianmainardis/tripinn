export const COLORS = {
  // Primary colors
  primary: '#2D5A3D',
  primaryLight: '#4A7C59',
  primaryDark: '#1E3D2B',
  
  // Accent colors
  accent: '#D4A574',
  accentLight: '#E8C9A5',
  accentDark: '#B8895A',
  
  // Background colors
  background: '#FAF8F5',
  backgroundDark: '#F0EDE8',
  cardBackground: '#FFFFFF',
  
  // Text colors
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  textLight: '#BDC3C7',
  textWhite: '#FFFFFF',
  
  // Mood colors
  moodStressed: '#FF6B6B',
  moodSad: '#74B9FF',
  moodChange: '#FDCB6E',
  moodDisconnect: '#00B894',
  moodLost: '#A29BFE',
  
  // Status colors
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  
  // Neutral colors
  border: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)'
};

export const FONTS = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
};
