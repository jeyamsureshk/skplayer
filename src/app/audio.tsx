import React, { memo, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
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

const AudioTrackCard = memo(
  ({
    item,
    isActive,
    onPress,
  }: {
    item: LocalMedia;
    isActive: boolean;
    onPress: (item: LocalMedia) => void;
  }) => {
    const scale = React.useRef(new Animated.Value(1)).current;

    const animateTo = (value: number) => {
      Animated.spring(scale, {
        toValue: value,
        useNativeDriver: true,
        speed: 25,
        bounciness: 5,
      }).start();
    };

    return (
      <View style={styles.trackCardWrapper}>
        <Animated.View
          style={{ transform: [{ scale }] }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(item)}
            onPressIn={() => animateTo(0.97)}
            onPressOut={() => animateTo(1)}
            style={[
              styles.trackCard,
              isActive && styles.trackCardActive,
            ]}
          >
            <AudioArtworkImage
              uri={item.uri}
              size={48}
              style={styles.artwork}
            />

            <View style={styles.trackInfo}>
              <Text
                style={[
                  styles.title,
                  isActive && styles.titleActive,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              <Text style={styles.artist} numberOfLines={1}>
                {item.artist || 'Unknown Artist'} 
                {item.year ? ` • ${item.year}` : ''}
              </Text>
            </View>

            <View style={styles.metaContainer}>
              <Text style={styles.duration}>
                {formatDuration(item.duration)}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
  // Ensure strict comparison so backgrounds update properly when selection changes
  (prevProps, nextProps) => prevProps.isActive === nextProps.isActive && prevProps.item.id === nextProps.item.id
);

export default function AudioRoute() {
  const { mediaFiles } = useMedia();
  const { activeMedia, playMedia } = useAudioPlayback();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Extract audio files
  const audioFiles = useMemo(() => {
    return mediaFiles.filter(file => file.type === 'audio');
  }, [mediaFiles]);

  // Filter audio files based on search query (Title, Artist, Album, Year)
  const filteredAudio = useMemo(() => {
    if (!searchQuery.trim()) return audioFiles;
    
    const query = searchQuery.toLowerCase();
    return audioFiles.filter(file => 
      file.title?.toLowerCase().includes(query) ||
      file.artist?.toLowerCase().includes(query) ||
      file.album?.toLowerCase().includes(query) ||
      file.year?.toString().toLowerCase().includes(query)
    );
  }, [audioFiles, searchQuery]);

  const handlePlay = (item: LocalMedia) => {
    if (activeMedia?.id !== item.id) {
      // Pass the filtered array so next/previous works within the search context
      playMedia(item, filteredAudio);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Music</Text>
        <Text style={styles.headerSubtitle}>{audioFiles.length} Tracks</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, artist, album, year..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="never" // Disable native iOS clear button to use our custom cross platform one
            autoCorrect={false}
          />
          
          {/* Custom Clear Button */}
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setSearchQuery('')} 
              style={styles.clearButton}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredAudio}
        keyExtractor={item => item.id}
        extraData={activeMedia?.id} // Forces re-render of active states
        renderItem={({ item }) => (
          <AudioTrackCard 
            item={item} 
            isActive={activeMedia?.id === item.id} 
            onPress={handlePlay} 
          />
        )}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks found matching "{searchQuery}"</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 16,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
    opacity: 0.6,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
    fontWeight: '500',
  },

  clearButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginLeft: 8,
  },
  
  clearIcon: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '800',
  },

  listPadding: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  trackCardWrapper: {
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#348834',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },

  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  trackCardActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#818CF8',
    borderWidth: 1.5,
  },

  artwork: {
    marginRight: 14,
  },

  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },

  titleActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },

  artist: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  metaContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  duration: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
  },
});
