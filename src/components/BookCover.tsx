import React from 'react';
import { View, Text } from 'react-native';

interface BookCoverProps {
  title: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { w: 56, h: 76, titleSize: 'text-xs' },
  md: { w: 80, h: 108, titleSize: 'text-sm' },
  lg: { w: 120, h: 162, titleSize: 'text-base' },
};

export function BookCover({ title, color, size = 'md' }: BookCoverProps) {
  const s = SIZE_MAP[size];
  return (
    <View
      style={{
        width: s.w,
        height: s.h,
        backgroundColor: color,
        borderRadius: 2,
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.15)',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 4,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: 'rgba(255,255,255,0.25)',
        }}
      />
      <Text
        numberOfLines={4}
        style={{
          color: '#F7F4ED',
          fontSize: size === 'lg' ? 14 : size === 'md' ? 12 : 10,
          fontWeight: '600',
          textAlign: 'center',
          lineHeight: size === 'lg' ? 20 : size === 'md' ? 16 : 14,
        }}
      >
        {title}
      </Text>
    </View>
  );
}