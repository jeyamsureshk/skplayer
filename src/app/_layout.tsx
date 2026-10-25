import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { MediaProvider } from '../components/MediaProvider';
import { AudioPlaybackProvider } from '../components/AudioPlaybackProvider'; 
import { Colors } from '@/constants/theme';

// 1. IMPORT THE MINI PLAYER
import MiniPlayer from '../components/MiniPlayer';

export default function RootLayout() {
  const scheme = useColorScheme();
  
  const colors = Colors?.[scheme === 'unspecified' ? 'light' : scheme] || {
    background: scheme === 'dark' ? '#111827' : '#FFFFFF',
    backgroundElement: scheme === 'dark' ? '#374151' : '#E5E7EB',
    text: scheme === 'dark' ? '#FFFFFF' : '#111827',
  };

  return (
    <MediaProvider>
      <AudioPlaybackProvider>
        
        <NativeTabs
          backgroundColor={colors.background}
          indicatorColor={colors.backgroundElement}
          labelStyle={{ selected: { color: colors.text } }}
        >
          <NativeTabs.Trigger name="audio">
            <NativeTabs.Trigger.Label>Audio</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/audio.png')} renderingMode="template" />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="videos">
            <NativeTabs.Trigger.Label>Videos</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/video.png')} renderingMode="template" />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="search">
            <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/search.png')} renderingMode="template" />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="albums">
            <NativeTabs.Trigger.Label>Albums</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/album.png')} renderingMode="template" />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="genres">
            <NativeTabs.Trigger.Label>Genres</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/genres.png')} renderingMode="template" />
          </NativeTabs.Trigger>
        </NativeTabs>

        {/* 2. ADD IT HERE - It will float securely above the NativeTabs */}
        <MiniPlayer />

      </AudioPlaybackProvider>
    </MediaProvider>
  );
}
