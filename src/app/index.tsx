import React, { useState, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useMedia } from '../components/MediaProvider';
import { LocalMedia } from '../types';

const { width } = Dimensions.get('window');
const GRID_SPACING = 16;
const GRID_ITEM_WIDTH = (width - (GRID_SPACING * 3)) / 2;

const thumbnailCache = new Map<string, string>();

const formatDuration = (ms: number) => {
  if (isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

const VideoThumbnail = memo(({ videoUri }: { videoUri: string }) => {
  const [imageUri, setImageUri] = useState<string | null>(thumbnailCache.get(videoUri) || null);
  const [isLoading, setIsLoading] = useState(!imageUri);

  React.useEffect(() => {
    if (imageUri) return;
    let isMounted = true;
    
    const loadOrGenerateThumbnail = async () => {
      try {
        const savedPath = await AsyncStorage.getItem(videoUri);
        if (savedPath) {
          const fileInfo = await FileSystem.getInfoAsync(savedPath);
          if (fileInfo.exists) {
            if (isMounted) {
              thumbnailCache.set(videoUri, savedPath);
              setImageUri(savedPath);
              setIsLoading(false);
            }
            return; 
          }
        }

        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000, quality: 0.7 });
        const safeFileName = videoUri.replace(/[^a-z0-9]/gi, '_') + '.jpg';
        const permanentUri = `${FileSystem.documentDirectory}${safeFileName}`;
        
        await FileSystem.copyAsync({ from: uri, to: permanentUri });
        await AsyncStorage.setItem(videoUri, permanentUri);
        
        if (isMounted) {
          thumbnailCache.set(videoUri, permanentUri);
          setImageUri(permanentUri);
          setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOrGenerateThumbnail();
    return () => { isMounted = false; };
  }, [videoUri, imageUri]);

  return (
    <View style={styles.thumbnailBase}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.absoluteImage} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderImage}>
          {isLoading && <ActivityIndicator color="#4F46E5" size="small" />}
        </View>
      )}
    </View>
  );
});

const VideoListCard = memo(({ item, onPress }: { item: LocalMedia, onPress: (item: LocalMedia) => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.listCard} onPress={() => onPress(item)}>
    <View style={styles.listThumbnailContainer}>
      <VideoThumbnail videoUri={item.uri} />
      <View style={styles.overlayCenter}>
        <View style={styles.playButtonBlur}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </View>
      <View style={styles.durationBadge}>
        <Text style={styles.badgeText}>{formatDuration(item.duration)}</Text>
      </View>
    </View>
    <View style={styles.listDetailsContainer}>
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{(item.size / (1024 * 1024)).toFixed(1)} MB  •  Local Video</Text>
    </View>
  </TouchableOpacity>
));

const VideoGridCard = memo(({ item, onPress }: { item: LocalMedia, onPress: (item: LocalMedia) => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.gridCard} onPress={() => onPress(item)}>
    <View style={styles.gridThumbnailContainer}>
      <VideoThumbnail videoUri={item.uri} />
      <View style={styles.durationBadge}>
        <Text style={styles.badgeText}>{formatDuration(item.duration)}</Text>
      </View>
    </View>
    <View style={styles.gridDetailsContainer}>
      <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.gridSubtitle} numberOfLines={1}>{(item.size / (1024 * 1024)).toFixed(1)} MB</Text>
    </View>
  </TouchableOpacity>
));

export default function VideosRoute() {
  const { mediaFiles } = useMedia();
  const videoFiles = mediaFiles.filter(file => file.type === 'video');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const router = useRouter();

  const openPlayer = (item: LocalMedia) => {
    // Navigate to the new screen and pass the video data via URL params
    router.push({
      pathname: '/video-player',
      params: { uri: item.uri, title: item.title }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Videos</Text>
        
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleBtnIcon, viewMode === 'list' && styles.toggleBtnIconActive]}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[styles.toggleBtnIcon, viewMode === 'grid' && styles.toggleBtnIconActive]}>⊞</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        key={viewMode}
        data={videoFiles}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridColumnWrapper : undefined}
        renderItem={({ item }) => 
          viewMode === 'grid' 
            ? <VideoGridCard item={item} onPress={openPlayer} />
            : <VideoListCard item={item} onPress={openPlayer} />
        }
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: GRID_SPACING, paddingBottom: 15 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  viewToggleContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  toggleBtnIcon: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  toggleBtnIconActive: { color: '#0F172A' },
  listPadding: { paddingHorizontal: GRID_SPACING, paddingBottom: 24 },
  gridColumnWrapper: { justifyContent: 'space-between' },
  thumbnailBase: { width: '100%', height: '100%', overflow: 'hidden' },
  absoluteImage: { ...StyleSheet.absoluteFillObject },
  placeholderImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  overlayCenter: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playButtonBlur: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  playIcon: { fontSize: 20, color: '#FFF', marginLeft: 4 },
  durationBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  badgeText: { color: '#F8FAFC', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: GRID_SPACING, elevation: 4, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, overflow: 'hidden' },
  listThumbnailContainer: { width: '100%', aspectRatio: 16/9, backgroundColor: '#1E293B', position: 'relative' },
  listDetailsContainer: { padding: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  gridCard: { width: GRID_ITEM_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: GRID_SPACING, elevation: 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, overflow: 'hidden' },
  gridThumbnailContainer: { width: '100%', aspectRatio: 16/9, backgroundColor: '#1E293B', position: 'relative' },
  gridDetailsContainer: { padding: 12 },
  gridTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4, letterSpacing: -0.2, lineHeight: 18 },
  gridSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
});
