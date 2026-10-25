import React, { useMemo, useState, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useMedia } from '../components/MediaProvider';
import { useAudioPlayback } from '../components/AudioPlaybackProvider';
import { LocalMedia } from '../types';

// Import your custom Video Player
import VideoPlayerModal from '../components/VideoPlayerModal';

const formatDuration = (ms: number) => {
  if (isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

// 1. Memoized Album Card
const AlbumCard = memo(({ item, onPress }: { item: { name: string; files: LocalMedia[] }, onPress: (item: any) => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.groupCard} onPress={() => onPress(item)}>
    <View style={styles.groupIconContainer}>
      <Text style={styles.groupIcon}>💽</Text>
    </View>
    <View style={styles.groupDetails}>
      <Text style={styles.groupTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.groupSubtitle}>{item.files.length} items</Text>
    </View>
  </TouchableOpacity>
));

// 2. Memoized Media Item inside an Album
const MediaItemCard = memo(({ item, isActive, onPress }: { item: LocalMedia, isActive: boolean, onPress: (item: LocalMedia) => void }) => (
  <TouchableOpacity activeOpacity={0.7} style={[styles.mediaItem, isActive && styles.mediaItemActive]} onPress={() => onPress(item)}>
    <View style={[styles.mediaIcon, item.type === 'video' ? styles.videoIcon : styles.audioIcon, isActive && styles.activeIconBg]}>
      <Text style={styles.mediaIconText}>
        {isActive ? '🎶' : item.type === 'video' ? '▶' : '🎵'}
      </Text>
    </View>
    <View style={styles.mediaDetails}>
      <Text style={[styles.mediaTitle, isActive && styles.titleActive]} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.mediaSubtitle} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
    </View>
    <Text style={styles.mediaDuration}>{formatDuration(item.duration)}</Text>
  </TouchableOpacity>
));

export default function AlbumsRoute() {
  const { mediaFiles } = useMedia();
  
  // Hook into your global audio context
  const { activeMedia: globalActiveAudio, playMedia } = useAudioPlayback();

  // Local Navigation and Video states
  const [activeAlbum, setActiveAlbum] = useState<{ name: string; files: LocalMedia[] } | null>(null);
  const [activeVideo, setActiveVideo] = useState<LocalMedia | null>(null);

  // Group media by Album
  const albumsData = useMemo(() => {
    const groups: { [key: string]: LocalMedia[] } = {};
    mediaFiles.forEach(file => {
      const albumKey = file.album || 'Unknown Album';
      if (!groups[albumKey]) groups[albumKey] = [];
      groups[albumKey].push(file);
    });
    // Sort alphabetically by album name
    return Object.keys(groups).sort().map(key => ({ name: key, files: groups[key] }));
  }, [mediaFiles]);

  const handleMediaPress = (item: LocalMedia) => {
    if (item.type === 'video') {
      // Open the full-screen Video Player Modal
      setActiveVideo(item);
    } else {
      // Trigger global background audio playback (Mini-Player handles the UI)
      if (globalActiveAudio?.id !== item.id) {
        playMedia(item);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      
      {/* View Toggle: Show Album Contents OR Album List */}
      {activeAlbum ? (
        <>
          <View style={styles.headerWithBack}>
            <TouchableOpacity onPress={() => setActiveAlbum(null)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back to Albums</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{activeAlbum.name}</Text>
            <Text style={styles.headerSubtitle}>{activeAlbum.files.length} Tracks</Text>
          </View>
          <FlatList
            data={activeAlbum.files}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MediaItemCard 
                item={item} 
                isActive={globalActiveAudio?.id === item.id} 
                onPress={handleMediaPress} 
              />
            )}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Albums</Text>
            <Text style={styles.headerSubtitle}>{albumsData.length} Collections</Text>
          </View>
          <FlatList
            data={albumsData}
            keyExtractor={item => item.name}
            renderItem={({ item }) => <AlbumCard item={item} onPress={setActiveAlbum} />}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Render the unified Video Player component */}
      <VideoPlayerModal 
        media={activeVideo} 
        onClose={() => setActiveVideo(null)} 
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // Headers
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  headerWithBack: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10, flexDirection: 'column', alignItems: 'flex-start' },
  backButton: { marginBottom: 12, paddingVertical: 6, paddingRight: 12, backgroundColor: '#EEF2FF', borderRadius: 20, paddingLeft: 12 },
  backButtonText: { color: '#4F46E5', fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 100 }, // Extra padding for the Mini-Player
  
  // Album Card Styles
  groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  groupIconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  groupIcon: { fontSize: 28 },
  groupDetails: { flex: 1 },
  groupTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4, letterSpacing: -0.3 },
  groupSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  // Inner Media Item Styles
  mediaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 10, elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  mediaItemActive: { borderColor: 'rgba(79, 70, 229, 0.2)', borderWidth: 1 },
  
  mediaIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  videoIcon: { backgroundColor: '#1E293B' },
  audioIcon: { backgroundColor: '#F1F5F9' },
  activeIconBg: { backgroundColor: '#EEF2FF' },
  
  mediaIconText: { color: '#0F172A', fontSize: 16, marginLeft: 2 },
  mediaDetails: { flex: 1, marginRight: 10 },
  mediaTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4, letterSpacing: -0.2 },
  titleActive: { color: '#4F46E5', fontWeight: '700' },
  mediaSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  mediaDuration: { fontSize: 13, fontWeight: '600', color: '#94A3B8', fontVariant: ['tabular-nums'] },
});
