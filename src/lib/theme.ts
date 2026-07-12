import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

// 颜色与 global.css 变量保持一致
export const THEME = {
  light: {
    background: 'hsl(40 33% 95%)',
    foreground: 'hsl(24 16% 20%)',
    card: 'hsl(38 30% 92%)',
    cardForeground: 'hsl(24 16% 20%)',
    popover: 'hsl(40 33% 95%)',
    popoverForeground: 'hsl(24 16% 20%)',
    primary: 'hsl(24 16% 20%)',
    primaryForeground: 'hsl(40 33% 95%)',
    secondary: 'hsl(36 22% 88%)',
    secondaryForeground: 'hsl(24 16% 20%)',
    muted: 'hsl(36 18% 90%)',
    mutedForeground: 'hsl(24 8% 45%)',
    accent: 'hsl(9 58% 46%)',
    accentForeground: 'hsl(40 33% 95%)',
    destructive: 'hsl(0 84% 60%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(30 16% 82%)',
    input: 'hsl(30 16% 82%)',
    ring: 'hsl(9 58% 46%)',
    radius: '0.25rem',
  },
  dark: {
    background: 'hsl(24 16% 10%)',
    foreground: 'hsl(40 20% 90%)',
    card: 'hsl(24 14% 14%)',
    cardForeground: 'hsl(40 20% 90%)',
    popover: 'hsl(24 14% 14%)',
    popoverForeground: 'hsl(40 20% 90%)',
    primary: 'hsl(40 20% 90%)',
    primaryForeground: 'hsl(24 16% 10%)',
    secondary: 'hsl(24 12% 18%)',
    secondaryForeground: 'hsl(40 20% 90%)',
    muted: 'hsl(24 10% 16%)',
    mutedForeground: 'hsl(30 10% 55%)',
    accent: 'hsl(9 50% 50%)',
    accentForeground: 'hsl(40 20% 90%)',
    destructive: 'hsl(0 84% 60%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(24 10% 22%)',
    input: 'hsl(24 10% 22%)',
    ring: 'hsl(9 50% 50%)',
    radius: '0.25rem',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
