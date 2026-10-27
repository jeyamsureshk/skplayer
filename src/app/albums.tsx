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

// --- 1. High-Quality Grid Card for Albums ---
const AlbumGridCard = memo(({ item, onPress }: { item: { name: string; files: LocalMedia[]; coverItem: LocalMedia }, onPress: (item: any) => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.gridCard} onPress={() => onPress(item)}>
    <View style={styles.gridArtworkContainer}>
      <AudioArtworkImage uri={item.coverItem.uri} size={GRID_ITEM_WIDTH} style={styles.gridArtwork} />
    </View>
    <Text style={styles.gridTitle} numberOfLines={1}>{item.name}</Text>
    <Text style={styles.gridSubtitle}>{item.coverItem.artist || 'Unknown Artist'} • {item.files.length} tracks</Text>
  </TouchableOpacity>
));

// --- 2. Track Row for inside the Album Screen ---
const AlbumTrackRow = memo(({ item, index, isActive, onPress }: { item: LocalMedia, index: number, isActive: boolean, onPress: (item: LocalMedia) => void }) => (
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
      <Text style={styles.trackArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
    </View>
    <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
  </TouchableOpacity>
));

export default function AlbumsRoute() {
  const { mediaFiles } = useMedia();
  const { activeMedia: globalActiveAudio, playMedia } = useAudioPlayback();
  const insets = useSafeAreaInsets(); // Used to dynamically pad the header under the notch

  const [activeAlbum, setActiveAlbum] = useState<{ name: string; files: LocalMedia[]; coverItem: LocalMedia } | null>(null);
  const [activeVideo, setActiveVideo] = useState<LocalMedia | null>(null);

  const albumsData = useMemo(() => {
    const groups: { [key: string]: LocalMedia[] } = {};
    mediaFiles.forEach(file => {
      if (file.type === 'audio') {
        const albumKey = file.album || 'Unknown Album';
        if (!groups[albumKey]) groups[albumKey] = [];
        groups[albumKey].push(file);
      }
    });
    
    return Object.keys(groups).sort().map(key => ({ 
      name: key, 
      files: groups[key],
      coverItem: groups[key][0] 
    }));
  }, [mediaFiles]);

  const handleMediaPress = (item: LocalMedia) => {
    if (globalActiveAudio?.id !== item.id && activeAlbum) {
      playMedia(item, activeAlbum.files);
    }
  };

  const playEntireAlbum = () => {
    if (activeAlbum && activeAlbum.files.length > 0) {
      playMedia(activeAlbum.files[0], activeAlbum.files);
    }
  };

  return (
    <View style={styles.rootContainer}>
      
      {/* --- Main Albums List (Grid) --- */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Albums</Text>
          <Text style={styles.headerSubtitle}>{albumsData.length} Collections</Text>
        </View>
        
        <FlatList
          data={albumsData}
          keyExtractor={item => item.name}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <AlbumGridCard item={item} onPress={setActiveAlbum} />}
          contentContainerStyle={styles.listPadding} // 120px padding ensures MiniPlayer doesn't block the bottom
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* --- Overlay Album Details Screen (Replaces Modal to prevent flicker & show MiniPlayer) --- */}
      {activeAlbum && (
        <View style={[StyleSheet.absoluteFill, styles.overlayBackground]}>
          <FlatList
            data={activeAlbum.files}
            keyExtractor={item => item.id}
            extraData={globalActiveAudio?.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            
            // The gorgeous blurred header sits at the top of the list
            ListHeaderComponent={() => (
              <View style={styles.albumHeader}>
                {/* Blurred Background Image */}
                <View style={StyleSheet.absoluteFill}>
                  <AudioArtworkImage uri={activeAlbum.coverItem.uri} size={SCREEN_WIDTH} style={{ width: '100%', height: '100%', opacity: 0.5 }} />
                  <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
                </View>

                {/* Header Content respecting device notch */}
                <View style={{ paddingTop: insets.top }}>
                  <TouchableOpacity onPress={() => setActiveAlbum(null)} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={26} color="#4F46E5" />
                    <Text style={styles.backButtonText}>Albums</Text>
                  </TouchableOpacity>

                  <View style={styles.albumHeaderContent}>
                    <View style={styles.albumHeaderArtContainer}>
                      <AudioArtworkImage uri={activeAlbum.coverItem.uri} size={220} style={styles.albumHeaderArt} />
                    </View>
                    <Text style={styles.albumTitleLarge}>{activeAlbum.name}</Text>
                    <Text style={styles.albumArtistLarge}>{activeAlbum.coverItem.artist || 'Unknown Artist'}</Text>
                    <Text style={styles.albumMetaLarge}>Album • {activeAlbum.files.length} songs</Text>
                    
                    <TouchableOpacity style={styles.playFab} activeOpacity={0.8} onPress={playEntireAlbum}>
                      <Ionicons name="play" size={24} color="#FFF" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            
            renderItem={({ item, index }) => (
              <View style={styles.trackListContainer}>
                <AlbumTrackRow 
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

      {/* Video Player Modal remains standard since it takes over the screen to play video */}
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
  gridArtworkContainer: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH, borderRadius: 16, backgroundColor: '#E2E8F0', marginBottom: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  gridArtwork: { width: '100%', height: '100%', borderRadius: 16 },
  gridTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2, letterSpacing: -0.2 },
  gridSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  // Overlay Screen Styles
  overlayBackground: { backgroundColor: '#FFFFFF', zIndex: 10 },
  albumHeader: { paddingBottom: 30, backgroundColor: '#F8FAFC', marginHorizontal: -20, paddingHorizontal: 20 },
  
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, marginLeft: -10 },
  backButtonText: { fontSize: 17, color: '#4F46E5', fontWeight: '600', marginLeft: 2 },
  
  albumHeaderContent: { alignItems: 'center', marginTop: 10 },
  albumHeaderArtContainer: { shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 24 },
  albumHeaderArt: { width: 220, height: 220, borderRadius: 12 },
  
  albumTitleLarge: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  albumArtistLarge: { fontSize: 18, color: '#4F46E5', fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  albumMetaLarge: { fontSize: 14, color: '#64748B', fontWeight: '500', textAlign: 'center', marginBottom: 24 },
  
  playFab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  // Track Rows inside Album
  trackListContainer: { paddingHorizontal: 0 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  trackNumberContainer: { width: 30, alignItems: 'center', marginRight: 10 },
  trackNumber: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  
  trackInfo: { flex: 1, justifyContent: 'center', paddingRight: 10 },
  trackTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4, letterSpacing: -0.2 },
  titleActive: { color: '#4F46E5', fontWeight: '700' },
  trackArtist: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  trackDuration: { fontSize: 13, color: '#94A3B8', fontWeight: '500', fontVariant: ['tabular-nums'] },
});
