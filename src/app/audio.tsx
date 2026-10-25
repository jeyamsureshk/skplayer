import React, { memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useMedia } from '../components/MediaProvider';
import { useAudioPlayback } from '../components/AudioPlaybackProvider';
import { LocalMedia } from '../types';

// 1. Import the native artwork component
import { AudioArtworkImage } from '../components/AudioArtwork';

const formatDuration = (ms: number) => {
  if (isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

const AudioTrackCard = memo(({ item, isActive, onPress }: { item: LocalMedia, isActive: boolean, onPress: (item: LocalMedia) => void }) => (
  <TouchableOpacity activeOpacity={0.7} style={[styles.trackCard, isActive && styles.trackCardActive]} onPress={() => onPress(item)}>
    
    {/* Replaced the emoji with the native artwork fetcher */}
    <AudioArtworkImage uri={item.uri} size={48} style={styles.artwork} />
    
    <View style={styles.trackInfo}>
      <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.artist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
    </View>
    <View style={styles.metaContainer}>
      <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
    </View>
  </TouchableOpacity>
));

export default function AudioRoute() {
  const { mediaFiles } = useMedia();
  const audioFiles = mediaFiles.filter(file => file.type === 'audio');
  
  const { activeMedia, playMedia } = useAudioPlayback();

 const handlePlay = (item: LocalMedia) => {
    if (activeMedia?.id !== item.id) {
      // Pass the audioFiles array as the context playlist!
      playMedia(item, audioFiles);
    }
  };
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Music</Text>
        <Text style={styles.headerSubtitle}>{audioFiles.length} Tracks</Text>
      </View>

      <FlatList
        data={audioFiles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AudioTrackCard 
            item={item} 
            isActive={activeMedia?.id === item.id} 
            onPress={handlePlay} 
          />
        )}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 100 },
  
  trackCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  trackCardActive: { borderColor: 'rgba(79, 70, 229, 0.2)', borderWidth: 1 },
  
  // Update spacing for the artwork
  artwork: { marginRight: 14 },
  
  trackInfo: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4, letterSpacing: -0.2 },
  titleActive: { color: '#4F46E5', fontWeight: '700' },
  artist: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  
  metaContainer: { justifyContent: 'center', alignItems: 'flex-end', marginLeft: 10 },
  duration: { fontSize: 13, color: '#94A3B8', fontWeight: '600', fontVariant: ['tabular-nums'] },
});
