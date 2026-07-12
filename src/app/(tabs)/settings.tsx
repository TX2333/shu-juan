import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Type, Gauge, Sparkles, Moon, Sun, Mic2, ChevronRight, Play } from 'lucide-react-native';
import { useSettings } from '@/contexts/SettingsContext';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { VOICE_OPTIONS } from '@/lib/audioAssets';
import type { VoiceOption } from '@/lib/audioAssets';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const audio = useAudioEngine(settings);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [voiceTab, setVoiceTab] = useState<'male' | 'female'>('male');

  const FONT_SIZES = [16, 18, 20, 22, 24, 26, 28];
  const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const handlePreviewVoice = useCallback(async (voice: VoiceOption) => {
    if (previewingVoice === voice.id) return;
    setPreviewingVoice(voice.id);
    try {
      await audio.generateAndPlayTTS(
        `你好，我是${voice.label}，很高兴为你朗读。`,
        voice.id,
        'calm',
        settings.speechRate,
      );
    } catch {
      // ignore preview errors
    } finally {
      setPreviewingVoice(null);
    }
  }, [previewingVoice, audio, settings.speechRate]);

  const filteredVoices = VOICE_OPTIONS.filter(v => v.gender === voiceTab);

  return (
    <View className="flex-1 bg-background">
      {/* 顶部标题栏 */}
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-foreground">设置</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}>

        {/* 音色试听 */}
        <View className="bg-card border border-border p-4" style={{ borderRadius: 2 }}>
          <View className="flex-row items-center gap-2 mb-3">
            <Mic2 size={18} color="#BC4431" strokeWidth={1.5} />
            <Text className="text-base font-semibold text-foreground">朗读音色</Text>
          </View>
          {/* 性别切换 */}
          <View className="flex-row gap-2 mb-3">
            {(['male', 'female'] as const).map(g => (
              <Pressable
                key={g}
                onPress={() => setVoiceTab(g)}
                className={`flex-1 py-2 border items-center active:opacity-70 ${voiceTab === g ? 'bg-accent border-accent' : 'bg-background border-border'}`}
                style={{ borderRadius: 2 }}
              >
                <Text className={`text-xs font-medium ${voiceTab === g ? 'text-accent-foreground' : 'text-foreground'}`}>
                  {g === 'male' ? '男声' : '女声'}
                </Text>
              </Pressable>
            ))}
          </View>
          {/* 音色列表 */}
          <View className="gap-2">
            {filteredVoices.map(voice => (
              <View
                key={voice.id}
                className="flex-row items-center justify-between py-2 border-b border-border"
              >
                <View className="flex-1" style={{ minWidth: 0 }}>
                  <Text className="text-sm font-medium text-foreground">{voice.label}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">{voice.desc}</Text>
                </View>
                <Pressable
                  onPress={() => handlePreviewVoice(voice)}
                  disabled={!!previewingVoice}
                  className="flex-row items-center gap-1.5 px-3 py-1.5 border border-border active:opacity-70"
                  style={{ borderRadius: 2 }}
                >
                  {previewingVoice === voice.id ? (
                    <ActivityIndicator size="small" color="#BC4431" />
                  ) : (
                    <Play size={12} color="#BC4431" strokeWidth={2} fill="#BC4431" />
                  )}
                  <Text className="text-xs text-accent">
                    {previewingVoice === voice.id ? '播放中' : '试听'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* 字体大小 */}
        <View className="bg-card border border-border p-4" style={{ borderRadius: 2 }}>
          <View className="flex-row items-center gap-2 mb-3">
            <Type size={18} color="#BC4431" strokeWidth={1.5} />
            <Text className="text-base font-semibold text-foreground">字体大小</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {FONT_SIZES.map(size => (
              <Pressable
                key={size}
                onPress={() => updateSettings({ fontSize: size })}
                className={`px-3 py-2 border active:opacity-70 ${settings.fontSize === size ? 'bg-accent border-accent' : 'bg-background border-border'}`}
                style={{ borderRadius: 2 }}
              >
                <Text
                  className={`${settings.fontSize === size ? 'text-accent-foreground' : 'text-foreground'}`}
                  style={{ fontSize: size }}
                >
                  {size}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 语速 */}
        <View className="bg-card border border-border p-4" style={{ borderRadius: 2 }}>
          <View className="flex-row items-center gap-2 mb-3">
            <Gauge size={18} color="#BC4431" strokeWidth={1.5} />
            <Text className="text-base font-semibold text-foreground">朗读语速</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {SPEEDS.map(speed => (
              <Pressable
                key={speed}
                onPress={() => updateSettings({ speechRate: speed })}
                className={`px-3 py-2 border active:opacity-70 ${settings.speechRate === speed ? 'bg-accent border-accent' : 'bg-background border-border'}`}
                style={{ borderRadius: 2 }}
              >
                <Text
                  className={`text-sm font-medium ${settings.speechRate === speed ? 'text-accent-foreground' : 'text-foreground'}`}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 沉浸模式 */}
        <View className="bg-card border border-border p-4" style={{ borderRadius: 2 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <Sparkles size={18} color="#BC4431" strokeWidth={1.5} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">沉浸模式</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  AI自动控制音色、背景音乐和音效
                </Text>
              </View>
            </View>
            <Switch
              value={settings.immersiveMode}
              onValueChange={v => updateSettings({ immersiveMode: v })}
              trackColor={{ false: 'hsl(30 16% 82%)', true: '#BC4431' }}
              thumbColor="#F7F4ED"
            />
          </View>
        </View>

        {/* 主题 */}
        <View className="bg-card border border-border p-4" style={{ borderRadius: 2 }}>
          <View className="flex-row items-center gap-2 mb-3">
            {settings.theme === 'dark' ? (
              <Moon size={18} color="#BC4431" strokeWidth={1.5} />
            ) : (
              <Sun size={18} color="#BC4431" strokeWidth={1.5} />
            )}
            <Text className="text-base font-semibold text-foreground">主题</Text>
          </View>
          <View className="flex-row gap-2">
            {(['light', 'dark'] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => updateSettings({ theme: t })}
                className={`flex-1 py-3 border items-center active:opacity-70 ${settings.theme === t ? 'bg-accent border-accent' : 'bg-background border-border'}`}
                style={{ borderRadius: 2 }}
              >
                <Text className={`text-sm font-medium ${settings.theme === t ? 'text-accent-foreground' : 'text-foreground'}`}>
                  {t === 'light' ? '亮色' : '暗色'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 关于 */}
        <View className="bg-card border border-border p-4" style={{ borderRadius: 2 }}>
          <Text className="text-base font-semibold text-foreground mb-2">关于</Text>
          <Text className="text-xs text-muted-foreground leading-5">书卷·自动跟读听书 v1.0.0</Text>
          <Text className="text-xs text-muted-foreground leading-5 mt-1">
            支持导入TXT/PDF文档，AI智能朗读，沉浸式听书体验
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}