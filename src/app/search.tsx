import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import Video from 'react-native-video';
import { useMedia } from '../components/MediaProvider';
import { LocalMedia } from '../types';

type FilterType = 'all' | 'audio' | 'video';

export default function SearchRoute() {
  const { mediaFiles } = useMedia();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeMedia, setActiveMedia] = useState<LocalMedia | null>(null);

  // Instantly filter by text query AND the selected media type (All/Audio/Video)
  const filteredMedia = useMemo(() => {
    let results = mediaFiles;

    // Apply type filter
    if (activeFilter !== 'all') {
      results = results.filter(file => file.type === activeFilter);
    }

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(file => 
        file.title?.toLowerCase().includes(query) ||
        file.artist?.toLowerCase().includes(query) ||
        file.album?.toLowerCase().includes(query) ||
        file.genre?.toLowerCase().includes(query)
      );
    }

    return results;
  }, [searchQuery, activeFilter, mediaFiles]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
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
    <TouchableOpacity activeOpacity={0.7} style={styles.mediaItem} onPress={() => setActiveMedia(item)}>
      <View style={[styles.mediaIcon, item.type === 'video' ? styles.videoIcon : styles.audioIcon]}>
        <Text style={styles.mediaIconText}>{item.type === 'video' ? '▶' : '🎵'}</Text>
      </View>
      <View style={styles.mediaDetails}>
        <Text style={styles.mediaTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.mediaSubtitle} numberOfLines={1}>
          {item.artist || 'Unknown Artist'}  •  {item.album || 'Unknown Album'}
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

      {/* Unified Media Player Modal */}
      <Modal visible={!!activeMedia} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveMedia(null)}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{activeMedia?.title}</Text>
            <TouchableOpacity onPress={() => setActiveMedia(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.playerWrapper}>
            {activeMedia && (
              <Video 
                source={{ uri: activeMedia.uri }} 
                style={styles.videoView} 
                controls={true}
                resizeMode="contain" 
                ignoreSilentSwitch="ignore" 
                playInBackground={activeMedia.type === 'audio'}
                audioOnly={activeMedia.type === 'audio'} 
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  listPadding: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  mediaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  
  // Modern Squircle Icons
  mediaIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  videoIcon: { backgroundColor: '#111827' },
  audioIcon: { backgroundColor: '#4F46E5' },
  mediaIconText: { color: '#FFF', fontSize: 18, marginLeft: 2 },
  
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

  // Modal & Player UI
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, backgroundColor: '#111' },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 16 },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  closeButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  playerWrapper: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  videoView: { width: '100%', height: '100%' }, 
});
