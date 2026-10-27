import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  DeviceEventEmitter
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 1. Import Drag and Drop Libraries ---
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useMedia } from '../components/MediaProvider';
import { useAudioPlayback } from '../components/AudioPlaybackProvider';
import { LocalMedia } from '../types';
import { AudioArtworkImage } from '../components/AudioArtwork';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2; 

const formatDuration = (ms: number) => {
  if (isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};

interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

const PlaylistCover = memo(({ files, isAuto, size }: { files: LocalMedia[], isAuto?: boolean, size: number }) => {
  if (files.length === 0) {
    return <Ionicons name={isAuto ? "heart" : "musical-notes"} size={size * 0.4} color="rgba(255,255,255,0.7)" />;
  }
  const uniqueUris = Array.from(new Set(files.map(f => f.uri).filter(Boolean)));
  if (uniqueUris.length >= 4) {
    return (
      <View style={{ width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap' }}>
        {uniqueUris.slice(0, 4).map((uri, idx) => (
          <AudioArtworkImage key={idx} uri={uri} size={size / 2} style={{ width: '50%', height: '50%' }} />
        ))}
      </View>
    );
  }
  return <AudioArtworkImage uri={uniqueUris[0] || files[0].uri} size={size} style={{ width: '100%', height: '100%', borderRadius: 12 }} />;
});

export default function PlaylistsRoute() {
  const { mediaFiles } = useMedia();
  const { activeMedia: globalActiveAudio, playMedia } = useAudioPlayback();
  const insets = useSafeAreaInsets(); 

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<{ id: string, name: string; files: LocalMedia[], isAuto?: boolean } | null>(null);

  const [overlay, setOverlay] = useState<{
    mode: 'none' | 'options' | 'input';
    id?: string;
    name?: string;
  }>({ mode: 'none' });
  const [inputValue, setInputValue] = useState('');

  const loadPlaylists = useCallback(async () => {
    try {
      const savedPlaylists = await AsyncStorage.getItem('@custom_playlists');
      if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));

      const keys = await AsyncStorage.getAllKeys();
      const likedKeys = keys.filter(k => k.startsWith('@liked_track_'));
      const likedPairs = await AsyncStorage.multiGet(likedKeys);
      
      const likedIds = likedPairs.filter(([_, val]) => val === 'true').map(([k]) => k.replace('@liked_track_', ''));
      setLikedTrackIds(likedIds);
    } catch (error) {
      console.log('Failed to load playlists:', error);
    }
  }, []);

  useEffect(() => { loadPlaylists(); }, [loadPlaylists]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('PLAYLIST_UPDATED', () => {
      loadPlaylists();
    });
    return () => subscription.remove();
  }, [loadPlaylists]);

  useEffect(() => {
    if (overlay.mode === 'input') setInputValue(overlay.name || '');
  }, [overlay.mode]);

  const playlistData = useMemo(() => {
    const audioFiles = mediaFiles.filter(f => f.type === 'audio');
    const likedFiles = audioFiles.filter(f => likedTrackIds.includes(f.id));
    
    const allLists = [{ id: 'liked-songs', name: 'Liked Songs', files: likedFiles, isAuto: true }];
    playlists.forEach(pl => {
      allLists.push({
        id: pl.id,
        name: pl.name,
        files: audioFiles.filter(f => pl.trackIds.includes(f.id)),
        isAuto: false
      });
    });
    return allLists;
  }, [mediaFiles, playlists, likedTrackIds]);

  const handleSavePlaylist = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setOverlay({ mode: 'none' });
      Keyboard.dismiss();
      return;
    }

    let updated: Playlist[];
    if (overlay.id) {
      updated = playlists.map(pl => pl.id === overlay.id ? { ...pl, name: trimmed } : pl);
      if (activePlaylist?.id === overlay.id) setActivePlaylist({ ...activePlaylist, name: trimmed });
    } else {
      const newPlaylist: Playlist = { id: Date.now().toString(), name: trimmed, trackIds: [] };
      updated = [...playlists, newPlaylist];
    }

    setPlaylists(updated); 
    await AsyncStorage.setItem('@custom_playlists', JSON.stringify(updated));
    DeviceEventEmitter.emit('PLAYLIST_UPDATED');
    setOverlay({ mode: 'none' });
    Keyboard.dismiss();
  };

  const handleDeletePlaylist = async () => {
    if (!overlay.id) return;
    const updated = playlists.filter(pl => pl.id !== overlay.id);
    setPlaylists(updated);
    await AsyncStorage.setItem('@custom_playlists', JSON.stringify(updated));
    DeviceEventEmitter.emit('PLAYLIST_UPDATED');
    if (activePlaylist?.id === overlay.id) setActivePlaylist(null);
    setOverlay({ mode: 'none' });
  };

  const handleRemoveTrack = (trackId: string) => {
    if (!activePlaylist || activePlaylist.isAuto) return;
    
    const updatedPlaylists = playlists.map(pl => {
      if (pl.id === activePlaylist.id) {
        return { ...pl, trackIds: pl.trackIds.filter(id => id !== trackId) };
      }
      return pl;
    });
    setPlaylists(updatedPlaylists);
    AsyncStorage.setItem('@custom_playlists', JSON.stringify(updatedPlaylists));

    const updatedFiles = activePlaylist.files.filter(f => f.id !== trackId);
    setActivePlaylist({ ...activePlaylist, files: updatedFiles });
    DeviceEventEmitter.emit('PLAYLIST_UPDATED');
  };

  // --- 2. NEW: Handle Drag Drop Reordering ---
  const handleReorderPlaylist = async (newFiles: LocalMedia[]) => {
    if (!activePlaylist || activePlaylist.isAuto) return;
    
    // Instantly update the UI
    setActivePlaylist({ ...activePlaylist, files: newFiles });
    
    // Extract new track IDs in the new order
    const newTrackIds = newFiles.map(f => f.id);
    
    // Update main playlists state & save
    const updatedPlaylists = playlists.map(pl => {
      if (pl.id === activePlaylist.id) return { ...pl, trackIds: newTrackIds };
      return pl;
    });
    
    setPlaylists(updatedPlaylists);
    await AsyncStorage.setItem('@custom_playlists', JSON.stringify(updatedPlaylists));
    DeviceEventEmitter.emit('PLAYLIST_UPDATED');
  };

  const handleMediaPress = (item: LocalMedia) => {
    if (globalActiveAudio?.id !== item.id && activePlaylist) playMedia(item, activePlaylist.files);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Playlists</Text>
          <TouchableOpacity onPress={() => setOverlay({ mode: 'input' })} activeOpacity={0.7}>
            <Text style={styles.createBtnText}>New Playlist</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={playlistData}
          keyExtractor={item => item.id}
          extraData={playlists} 
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.gridCard} 
              onPress={() => setActivePlaylist(item)}
              onLongPress={() => {
                if (!item.isAuto) setOverlay({ mode: 'options', id: item.id, name: item.name });
              }}
              delayLongPress={300}
            >
              <View style={[styles.gridArtworkContainer, item.isAuto && { backgroundColor: '#FF2D55' }]}>
                <PlaylistCover files={item.files} isAuto={item.isAuto} size={GRID_ITEM_WIDTH} />
              </View>
              <Text style={styles.gridTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.gridSubtitle}>{item.files.length} songs</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      {/* --- Overlay Playlist Details Screen --- */}
      {activePlaylist && (
        <View style={[StyleSheet.absoluteFill, styles.overlayBackground]}>
          {/* 3. Wrap overlay in GestureHandlerRootView for Drag & Drop */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            <DraggableFlatList
              data={activePlaylist.files}
              keyExtractor={item => item.id}
              onDragEnd={({ data }) => handleReorderPlaylist(data)}
              extraData={globalActiveAudio?.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listPadding}
              
              ListHeaderComponent={() => (
                <View style={styles.albumHeader}>
                  <View style={StyleSheet.absoluteFill}>
                    {activePlaylist.files.length > 0 && (
                      <AudioArtworkImage uri={activePlaylist.files[0].uri} size={SCREEN_WIDTH} style={{ width: '100%', height: '100%', opacity: 0.6 }} />
                    )}
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={['rgba(0,0,0,0.1)', '#000000']} style={StyleSheet.absoluteFill} />
                  </View>

                  <View style={{ paddingTop: insets.top }}>
                    <TouchableOpacity onPress={() => setActivePlaylist(null)} style={styles.backButton}>
                      <Ionicons name="chevron-back" size={28} color="#0A84FF" />
                      <Text style={styles.backButtonText}>Playlists</Text>
                    </TouchableOpacity>

                    <View style={styles.albumHeaderContent}>
                      <View style={[styles.albumHeaderArtContainer, activePlaylist.files.length === 0 && { backgroundColor: '#1C1C1E' }]}>
                        <PlaylistCover files={activePlaylist.files} isAuto={activePlaylist.isAuto} size={220} />
                      </View>
                      <Text style={styles.albumTitleLarge}>{activePlaylist.name}</Text>
                      <Text style={styles.albumMetaLarge}>Playlist • {activePlaylist.files.length} songs</Text>
                      
                      {activePlaylist.files.length > 0 && (
                        <View style={styles.actionRowHeader}>
                          <TouchableOpacity style={styles.playFab} activeOpacity={0.8} onPress={() => playMedia(activePlaylist.files[0], activePlaylist.files)}>
                            <Ionicons name="play" size={24} color="#000" style={{ marginLeft: 4 }} />
                            <Text style={styles.playFabText}>Play</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
              
              renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<LocalMedia>) => (
                <ScaleDecorator>
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={[styles.trackRow, isActive && { backgroundColor: '#1C1C1E' }]} 
                    onPress={() => handleMediaPress(item)}
                  >
                    <View style={styles.trackNumberContainer}>
                      {globalActiveAudio?.id === item.id ? (
                        <Ionicons name="volume-high" size={18} color="#4587aa" />
                      ) : (
                        <Text style={styles.trackNumber}>{(getIndex() || 0) + 1}</Text>
                      )}
                    </View>
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, globalActiveAudio?.id === item.id && styles.titleActive]} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.trackArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                    </View>

                    <View style={styles.metaContainer}>
                      {!activePlaylist.isAuto && (
                        <TouchableOpacity 
                          style={styles.actionBtn} 
                          onPress={() => handleRemoveTrack(item.id)}
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#8E8E93" />
                        </TouchableOpacity>
                      )}
                      
                      <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
                      
                      {/* 4. Drag Handle Icon for custom playlists */}
                      {!activePlaylist.isAuto && (
                        <TouchableOpacity
                          onPressIn={drag} // Instant drag on touch
                          style={{ marginLeft: 12 }}
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                          <Ionicons name="reorder-three" size={24} color="#8E8E93" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                </ScaleDecorator>
              )}
              
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No songs here yet.</Text>
                </View>
              )}
            />
          </GestureHandlerRootView>
        </View>
      )}

      {/* --- iOS-Style Bottom Sheet Modal --- */}
      <Modal visible={overlay.mode !== 'none'} transparent animationType="fade" onRequestClose={() => setOverlay({ mode: 'none' })}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={20} tint="dark" style={{ flex: 1, justifyContent: 'flex-end' }}>
            
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setOverlay({ mode: 'none' }); }}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <View style={styles.bottomSheet}>
              <View style={styles.sheetContent}>
                <View style={styles.dragHandle} />

                {overlay.mode === 'options' && (
                  <View style={{ paddingBottom: 20 }}>
                    <Text style={styles.sheetTitle}>{overlay.name}</Text>
                    
                    <TouchableOpacity style={styles.optionRow} onPress={() => setOverlay({ ...overlay, mode: 'input' })}>
                      <Ionicons name="pencil" size={22} color="#FFFFFF" style={styles.optionIcon} />
                      <Text style={styles.optionText}>Rename Playlist</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.optionRow} onPress={handleDeletePlaylist}>
                      <Ionicons name="trash" size={22} color="#FF453A" style={styles.optionIcon} />
                      <Text style={[styles.optionText, { color: '#FF453A' }]}>Delete Playlist</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {overlay.mode === 'input' && (
                  <View style={{ paddingBottom: 10 }}>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>{overlay.id ? 'Rename Playlist' : 'New Playlist'}</Text>
                    </View>
                    
                    <View style={styles.createInputRow}>
                      <TextInput
                        style={styles.createInput}
                        placeholder="Playlist Name"
                        placeholderTextColor="#8E8E93"
                        value={inputValue}
                        onChangeText={setInputValue}
                        autoFocus
                        onSubmitEditing={handleSavePlaylist}
                        returnKeyType="done"
                        selectionColor="#0A84FF"
                      />
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlaylist} activeOpacity={0.8}>
                        <Text style={styles.saveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#000000', letterSpacing: 0.3 },
  createBtnText: { color: '#0A84FF', fontWeight: '500', fontSize: 17 },
  
  listPadding: { paddingHorizontal: 16, paddingBottom: 120 }, 
  gridRow: { justifyContent: 'space-between', marginBottom: 24 },
  gridCard: { width: GRID_ITEM_WIDTH },
  
  gridArtworkContainer: { 
    width: GRID_ITEM_WIDTH, 
    height: GRID_ITEM_WIDTH, 
    borderRadius: 12, 
    backgroundColor: '#1C1C1E', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 8,
    overflow: 'hidden' 
  },
  
  gridTitle: { fontSize: 15, fontWeight: '500', color: '#000000', marginBottom: 2 },
  gridSubtitle: { fontSize: 13, color: '#8E8E93', fontWeight: '400' },

  overlayBackground: { zIndex: 10, elevation: 99, backgroundColor: '#000000' },
  albumHeader: { paddingBottom: 30, backgroundColor: 'transparent', marginHorizontal: -16, paddingHorizontal: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, marginLeft: -10 },
  backButtonText: { fontSize: 17, color: '#0A84FF', fontWeight: '400', marginLeft: 2 },
  
  albumHeaderContent: { alignItems: 'center', marginTop: 10 },
  albumHeaderArtContainer: { shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, marginBottom: 20, width: 220, height: 220, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  albumTitleLarge: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  albumMetaLarge: { fontSize: 15, color: '#8E8E93', fontWeight: '400', textAlign: 'center', marginBottom: 24 },
  
  actionRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  playFab: { flexDirection: 'row', paddingHorizontal: 30, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  playFabText: { color: '#000', fontWeight: '700', fontSize: 17, marginLeft: 8 },

  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#38383A', paddingHorizontal: 16, marginHorizontal: -16 },
  trackNumberContainer: { width: 30, alignItems: 'center', marginRight: 12 },
  trackNumber: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  trackInfo: { flex: 1, justifyContent: 'center', paddingRight: 10 },
  trackTitle: { fontSize: 16, fontWeight: '500', color: '#FFFFFF', marginBottom: 2 },
  titleActive: { color: '#4587aa', fontWeight: '600' },
  trackArtist: { fontSize: 14, color: '#8E8E93', fontWeight: '400' },
  
  metaContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { marginRight: 16 },
  trackDuration: { fontSize: 14, color: '#8E8E93', fontWeight: '400', fontVariant: ['tabular-nums'] },
  
  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#8E8E93', fontSize: 16, fontWeight: '500' },

  bottomSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden', backgroundColor: '#1C1C1E' },
  sheetContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3A3C', alignSelf: 'center', marginBottom: 20 },
  
  sheetHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#38383A' },
  optionIcon: { marginRight: 16, width: 24, textAlign: 'center' },
  optionText: { fontSize: 17, fontWeight: '400', color: '#FFFFFF' },

  createInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  createInput: { flex: 1, backgroundColor: '#2C2C2E', color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, fontSize: 17 },
  saveBtn: { backgroundColor: '#0A84FF', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 17 }
});
