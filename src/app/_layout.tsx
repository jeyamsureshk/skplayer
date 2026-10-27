import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

import { MediaProvider } from '../components/MediaProvider';
import { AudioPlaybackProvider } from '../components/AudioPlaybackProvider'; 
import MiniPlayer from '../components/MiniPlayer';

export default function RootLayout() {
  const scheme = useColorScheme();
  
  const colors = Colors?.[scheme === 'unspecified' ? 'light' : scheme] || {
    backgroundElement: scheme === 'dark' ? '#374151' : '#E5E7EB',
    text: scheme === 'dark' ? '#FFFFFF' : '#111827',
  };

  return (
    <MediaProvider>
      <AudioPlaybackProvider>
        
        <NativeTabs
          backgroundColor="transparent"
          indicatorColor={colors.backgroundElement}
          labelStyle={{ selected: { color: colors.text } }}
        >
          <NativeTabs.Trigger name="audio">
            <NativeTabs.Trigger.Label>Audio</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/audio.png')} renderingMode="template" />
          </NativeTabs.Trigger>
          
          <NativeTabs.Trigger name="albums">
            <NativeTabs.Trigger.Label>Albums</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/album.png')} renderingMode="template" />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="artists">
            <NativeTabs.Trigger.Label>Artists</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/genres.png')} renderingMode="template" />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="playlist">
            <NativeTabs.Trigger.Label>Playlists</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/playlist.png')} renderingMode="template" />
          </NativeTabs.Trigger>
        </NativeTabs>

        <MiniPlayer />

      </AudioPlaybackProvider>
    </MediaProvider>
  );
}
