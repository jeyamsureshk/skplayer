import React, { useMemo, useState, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { useMedia } from '../components/MediaProvider';
import { useAudioPlayback } from '../components/AudioPlaybackProvider';
import { LocalMedia } from '../types';
import { AudioArtworkImage } from '../components/AudioArtwork';
import VideoPlayerModal from '../components/VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2; 

const formatDuration = (ms: number) => {
  if (isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

// --- 1. High-Quality Grid Card for Artists ---
const ArtistGridCard = memo(({ item, onPress }: { item: { name: string; files: LocalMedia[]; coverItem: LocalMedia }, onPress: (item: any) => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.gridCard} onPress={() => onPress(item)}>
    <View style={styles.gridArtworkContainer}>
      {/* We use the first track's artwork as the Artist's cover image */}
      <AudioArtworkImage uri={item.coverItem.uri} size={GRID_ITEM_WIDTH} style={styles.gridArtwork} />
    </View>
    <Text style={styles.gridTitle} numberOfLines={1}>{item.name}</Text>
    <Text style={styles.gridSubtitle}>{item.files.length} songs</Text>
  </TouchableOpacity>
));

// --- 2. Track Row for inside the Artist Screen ---
const ArtistTrackRow = memo(({ item, index, isActive, onPress }: { item: LocalMedia, index: number, isActive: boolean, onPress: (item: LocalMedia) => void }) => (
  <TouchableOpacity activeOpacity={0.7} style={styles.trackRow} onPress={() => onPress(item)}>
    <View style={styles.trackNumberContainer}>
      {isActive ? (
        <Ionicons name="volume-high" size={18} color="#4F46E5" />
      ) : (
        <Text style={styles.trackNumber}>{index + 1}</Text>
      )}
    </View>
    
    <View style={styles.trackInfo}>
      <Text style={[styles.trackTitle, isActive && styles.titleActive]} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.trackAlbum} numberOfLines={1}>{item.album || 'Unknown Album'}</Text>
    </View>
    <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
  </TouchableOpacity>
));

export default function ArtistsRoute() {
  const { mediaFiles } = useMedia();
  const { activeMedia: globalActiveAudio, playMedia } = useAudioPlayback();
  const insets = useSafeAreaInsets();

  const [activeArtist, setActiveArtist] = useState<{ name: string; files: LocalMedia[]; coverItem: LocalMedia } | null>(null);
  const [activeVideo, setActiveVideo] = useState<LocalMedia | null>(null);

  // Group media by Artist and handle comma-separated multiple artists
  const artistsData = useMemo(() => {
    const groups: { [key: string]: LocalMedia[] } = {};
    
    mediaFiles.forEach(file => {
      if (file.type === 'audio') {
        const rawArtist = file.artist || 'Unknown Artist';
        
        // Split by comma, trim whitespace, and ignore empty strings
        const individualArtists = rawArtist.split(',').map(a => a.trim()).filter(Boolean);
        
        // If it was completely empty after splitting, fallback to Unknown
        if (individualArtists.length === 0) {
          individualArtists.push('Unknown Artist');
        }

        // Add the track to EVERY artist group it belongs to
        individualArtists.forEach(artistKey => {
          if (!groups[artistKey]) groups[artistKey] = [];
          groups[artistKey].push(file);
        });
      }
    });
    
    // Sort alphabetically by artist name
    return Object.keys(groups).sort().map(key => ({ 
      name: key, 
      files: groups[key],
      coverItem: groups[key][0] 
    }));
  }, [mediaFiles]);

  const handleMediaPress = (item: LocalMedia) => {
    if (globalActiveAudio?.id !== item.id && activeArtist) {
      playMedia(item, activeArtist.files);
    }
  };

  const playEntireArtist = () => {
    if (activeArtist && activeArtist.files.length > 0) {
      playMedia(activeArtist.files[0], activeArtist.files);
    }
  };

  return (
    <View style={styles.rootContainer}>
      
      {/* --- Main Artists List (Grid) --- */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Artists</Text>
          <Text style={styles.headerSubtitle}>{artistsData.length} Artists</Text>
        </View>
        
        <FlatList
          data={artistsData}
          keyExtractor={item => item.name}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <ArtistGridCard item={item} onPress={setActiveArtist} />}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* --- Overlay Artist Details Screen (Replaces Modal to show MiniPlayer) --- */}
      {activeArtist && (
        <View style={[StyleSheet.absoluteFill, styles.overlayBackground]}>
          <FlatList
            data={activeArtist.files}
            keyExtractor={item => item.id}
            extraData={globalActiveAudio?.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            
            // The gorgeous blurred header
            ListHeaderComponent={() => (
              <View style={styles.artistHeader}>
                {/* Blurred Background Image */}
                <View style={StyleSheet.absoluteFill}>
                  <AudioArtworkImage uri={activeArtist.coverItem.uri} size={SCREEN_WIDTH} style={{ width: '100%', height: '100%', opacity: 0.5 }} />
                  <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
                </View>

                {/* Header Content respecting device notch */}
                <View style={{ paddingTop: insets.top }}>
                  <TouchableOpacity onPress={() => setActiveArtist(null)} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={26} color="#4F46E5" />
                    <Text style={styles.backButtonText}>Artists</Text>
                  </TouchableOpacity>

                  <View style={styles.artistHeaderContent}>
                    {/* Make the artist profile pic completely round to distinguish from square albums */}
                    <View style={styles.artistHeaderArtContainer}>
                      <AudioArtworkImage uri={activeArtist.coverItem.uri} size={200} style={styles.artistHeaderArt} />
                    </View>
                    <Text style={styles.artistTitleLarge}>{activeArtist.name}</Text>
                    <Text style={styles.artistMetaLarge}>Artist • {activeArtist.files.length} songs</Text>
                    
                    <TouchableOpacity style={styles.playFab} activeOpacity={0.8} onPress={playEntireArtist}>
                      <Ionicons name="play" size={24} color="#FFF" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            
            renderItem={({ item, index }) => (
              <View style={styles.trackListContainer}>
                <ArtistTrackRow 
                  item={item} 
                  index={index}
                  isActive={globalActiveAudio?.id === item.id} 
                  onPress={handleMediaPress} 
                />
              </View>
            )}
          />
        </View>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal media={activeVideo} onClose={() => setActiveVideo(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  safeArea: { flex: 1 },
  
  // Headers
  header: { paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 120 }, // 120px clears the MiniPlayer
  
  // Grid Layout
  gridRow: { justifyContent: 'space-between', marginBottom: 20 },
  gridCard: { width: GRID_ITEM_WIDTH },
  gridArtworkContainer: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH, borderRadius: GRID_ITEM_WIDTH / 2, backgroundColor: '#E2E8F0', marginBottom: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  gridArtwork: { width: '100%', height: '100%', borderRadius: GRID_ITEM_WIDTH / 2 }, // Round image for artists
  gridTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2, letterSpacing: -0.2, textAlign: 'center' },
  gridSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', textAlign: 'center' },

  // Overlay Screen Styles
  overlayBackground: { backgroundColor: '#FFFFFF', zIndex: 10 },
  artistHeader: { paddingBottom: 30, backgroundColor: '#F8FAFC', marginHorizontal: -20, paddingHorizontal: 20 },
  
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, marginLeft: -10 },
  backButtonText: { fontSize: 17, color: '#4F46E5', fontWeight: '600', marginLeft: 2 },
  
  artistHeaderContent: { alignItems: 'center', marginTop: 10 },
  artistHeaderArtContainer: { shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 20 },
  artistHeaderArt: { width: 200, height: 200, borderRadius: 100 }, // Full circle for artist profile
  
  artistTitleLarge: { fontSize: 28, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 4, letterSpacing: -0.5 },
  artistMetaLarge: { fontSize: 15, color: '#64748B', fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  
  playFab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  // Track Rows inside Artist Profile
  trackListContainer: { paddingHorizontal: 0 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  trackNumberContainer: { width: 30, alignItems: 'center', marginRight: 10 },
  trackNumber: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  
  trackInfo: { flex: 1, justifyContent: 'center', paddingRight: 10 },
  trackTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4, letterSpacing: -0.2 },
  titleActive: { color: '#4F46E5', fontWeight: '700' },
  trackAlbum: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  trackDuration: { fontSize: 13, color: '#94A3B8', fontWeight: '500', fontVariant: ['tabular-nums'] },
});
