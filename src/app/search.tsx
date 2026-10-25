import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useMedia } from '../components/MediaProvider';
import { useAudioPlayback } from '../components/AudioPlaybackProvider';
import { LocalMedia } from '../types';

// Import our custom native UI components
import { AudioArtworkImage } from '../components/AudioArtwork';
import VideoPlayerModal from '../components/VideoPlayerModal';

type FilterType = 'all' | 'audio' | 'video';

export default function SearchRoute() {
  const { mediaFiles } = useMedia();
  const { playMedia } = useAudioPlayback(); // Connect to global audio queue
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeVideo, setActiveVideo] = useState<LocalMedia | null>(null);

  // Instantly filter by text query AND the selected media type
// Instantly filter and sort audio files to appear first
  const filteredMedia = useMemo(() => {
    let results = mediaFiles;

    if (activeFilter !== 'all') {
      results = results.filter(file => file.type === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(file => 
        file.title?.toLowerCase().includes(query) ||
        file.artist?.toLowerCase().includes(query) ||
        file.album?.toLowerCase().includes(query) ||
        file.genre?.toLowerCase().includes(query)
      );
    }

    // Sort to place audio files first when viewing mixed results
    return [...results].sort((a, b) => {
      if (a.type === 'audio' && b.type !== 'audio') return -1;
      if (b.type === 'audio' && a.type !== 'audio') return 1;
      return 0;
    });
  }, [searchQuery, activeFilter, mediaFiles]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  };

  const handleMediaPress = (item: LocalMedia) => {
    if (item.type === 'video') {
      // Open the custom Video Player Modal
      setActiveVideo(item);
    } else {
      // Play audio and pass only the audio search results as the new queue!
      const audioQueue = filteredMedia.filter(m => m.type === 'audio');
      playMedia(item, audioQueue);
    }
  };

  const renderFilterChip = (label: string, value: FilterType) => {
    const isActive = activeFilter === value;
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={() => setActiveFilter(value)}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
      >
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMediaItem = ({ item }: { item: LocalMedia }) => (
    <TouchableOpacity activeOpacity={0.7} style={styles.mediaItem} onPress={() => handleMediaPress(item)}>
      
      {/* Show Native Artwork for Audio, standard icon for Video */}
      {item.type === 'audio' ? (
        <AudioArtworkImage uri={item.uri} size={48} style={styles.artworkImage} />
      ) : (
        <View style={styles.videoIcon}>
          <Text style={styles.mediaIconText}>▶</Text>
        </View>
      )}

      <View style={styles.mediaDetails}>
        <Text style={styles.mediaTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.mediaSubtitle} numberOfLines={1}>
          {item.type === 'video' 
            ? 'Video File' 
            : `${item.artist || 'Unknown Artist'}  •  ${item.album || 'Unknown Album'}`
          }
        </Text>
      </View>
      
      <View style={styles.durationBadge}>
        <Text style={styles.mediaDuration}>{formatDuration(item.duration)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        
        {/* Modern Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Songs, videos, artists, albums..."
            placeholderTextColor="#8F9BB3"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>

        {/* Filter Chips Row */}
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {renderFilterChip('All', 'all')}
            {renderFilterChip('Audio', 'audio')}
            {renderFilterChip('Videos', 'video')}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredMedia}
        keyExtractor={item => item.id}
        renderItem={renderMediaItem}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>👀</Text>
            </View>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>
              We couldn't find anything matching "{searchQuery}". Try a different spelling or keyword.
            </Text>
          </View>
        }
      />

      {/* Advanced Video Player Modal */}
      <VideoPlayerModal 
        media={activeVideo} 
        onClose={() => setActiveVideo(null)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F9' },
  
  // Header & Search
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5, backgroundColor: '#F4F6F9' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 16, letterSpacing: -0.5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, height: 54, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#EDF1F7' },
  searchIcon: { fontSize: 20, marginRight: 10, opacity: 0.7 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', height: '100%', fontWeight: '500' },
  
  // Filter Chips
  filtersWrapper: { marginTop: 16, marginBottom: 8, marginHorizontal: -20 },
  filtersScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDF1F7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  filterChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },

  // List & Items
  listPadding: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 }, // Extra padding for MiniPlayer
  mediaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  
  // Media Icons / Artwork
  artworkImage: { width: 48, height: 48, borderRadius: 12, marginRight: 14 },
  videoIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: '#111827' },
  mediaIconText: { color: '#FFF', fontSize: 18, marginLeft: 4 },
  
  mediaDetails: { flex: 1, marginRight: 10, justifyContent: 'center' },
  mediaTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4, letterSpacing: -0.2 },
  mediaSubtitle: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  
  durationBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mediaDuration: { fontSize: 12, fontWeight: '700', color: '#4B5563', fontVariant: ['tabular-nums'] },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EDF1F7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
