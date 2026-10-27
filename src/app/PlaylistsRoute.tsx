import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useMedia } from '../components/MediaProvider';
import { useAudioPlayback } from '../components/AudioPlaybackProvider';
import { LocalMedia } from '../types';
import { AudioArtworkImage } from '../components/AudioArtwork';
import GlobalBackground from '../components/GlobalBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2; 

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

export default function PlaylistsRoute() {
  const { mediaFiles } = useMedia();
  const { activeMedia: globalActiveAudio, playMedia } = useAudioPlayback();
  const insets = useSafeAreaInsets(); 

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<{ id: string, name: string; files: LocalMedia[], isAuto?: boolean } | null>(null);

  // Unified Bottom Sheet State
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
    if (overlay.mode === 'input') {
      setInputValue(overlay.name || '');
    }
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
    setOverlay({ mode: 'none' });
    Keyboard.dismiss();
  };

  const handleDeletePlaylist = async () => {
    if (!overlay.id) return;
    const updated = playlists.filter(pl => pl.id !== overlay.id);
    setPlaylists(updated);
    await AsyncStorage.setItem('@custom_playlists', JSON.stringify(updated));
    if (activePlaylist?.id === overlay.id) setActivePlaylist(null);
    setOverlay({ mode: 'none' });
  };

  const handleMediaPress = (item: LocalMedia) => {
    if (globalActiveAudio?.id !== item.id && activePlaylist) playMedia(item, activePlaylist.files);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <GlobalBackground />
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Playlists</Text>
          <TouchableOpacity 
            onPress={() => setOverlay({ mode: 'input' })} 
            style={styles.createBtn} 
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createBtnText}>New</Text>
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
              activeOpacity={0.8} 
              style={styles.gridCard} 
              onPress={() => setActivePlaylist(item)}
            >
              <View style={[styles.gridArtworkContainer, item.isAuto && { backgroundColor: '#4F46E5' }]}>
                {item.files.length > 0 ? (
                  <AudioArtworkImage uri={item.files[0].uri} size={GRID_ITEM_WIDTH} style={styles.gridArtwork} />
                ) : (
                  <Ionicons name={item.isAuto ? "heart" : "musical-notes"} size={40} color="rgba(255,255,255,0.5)" />
                )}

                {/* 3-Dot Menu Button in the top right corner */}
                {!item.isAuto && (
                  <TouchableOpacity 
                    style={styles.threeDotBtn}
                    activeOpacity={0.7}
                    onPress={() => setOverlay({ mode: 'options', id: item.id, name: item.name })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
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
          <FlatList
            data={activePlaylist.files}
            keyExtractor={item => item.id}
            extraData={globalActiveAudio?.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPadding}
            
            ListHeaderComponent={() => (
              <View style={styles.albumHeader}>
                <View style={StyleSheet.absoluteFill}>
                  {activePlaylist.files.length > 0 && (
                    <AudioArtworkImage uri={activePlaylist.files[0].uri} size={SCREEN_WIDTH} style={{ width: '100%', height: '100%', opacity: 0.4 }} />
                  )}
                  <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                </View>

                <View style={{ paddingTop: insets.top }}>
                  <TouchableOpacity onPress={() => setActivePlaylist(null)} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                    <Text style={styles.backButtonText}>Playlists</Text>
                  </TouchableOpacity>

                  <View style={styles.albumHeaderContent}>
                    <View style={[styles.albumHeaderArtContainer, activePlaylist.files.length === 0 && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      {activePlaylist.files.length > 0 ? (
                        <AudioArtworkImage uri={activePlaylist.files[0].uri} size={220} style={styles.albumHeaderArt} />
                      ) : (
                        <Ionicons name="musical-notes" size={80} color="rgba(255,255,255,0.3)" />
                      )}
                    </View>
                    <Text style={styles.albumTitleLarge}>{activePlaylist.name}</Text>
                    <Text style={styles.albumMetaLarge}>{activePlaylist.files.length} songs</Text>
                    
                    {activePlaylist.files.length > 0 && (
                      <TouchableOpacity style={styles.playFab} activeOpacity={0.8} onPress={() => playMedia(activePlaylist.files[0], activePlaylist.files)}>
                        <Ionicons name="play" size={24} color="#FFF" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
            
            renderItem={({ item, index }) => (
              <TouchableOpacity activeOpacity={0.7} style={styles.trackRow} onPress={() => handleMediaPress(item)}>
                <View style={styles.trackNumberContainer}>
                  {globalActiveAudio?.id === item.id ? (
                    <Ionicons name="volume-high" size={18} color="#A5B4FC" />
                  ) : (
                    <Text style={styles.trackNumber}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, globalActiveAudio?.id === item.id && styles.titleActive]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                </View>
                <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
              </TouchableOpacity>
            )}
            
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No songs here yet.</Text>
              </View>
            )}
          />
        </View>
      )}

      {/* --- Unified Bottom Sheet Modal --- */}
      <Modal visible={overlay.mode !== 'none'} transparent animationType="fade" onRequestClose={() => setOverlay({ mode: 'none' })}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={40} tint="dark" style={{ flex: 1, justifyContent: 'flex-end' }}>
            
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setOverlay({ mode: 'none' }); }}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <View style={styles.bottomSheet}>
              <LinearGradient colors={['#18181B', '#09090B']} style={styles.sheetContent}>
                <View style={styles.dragHandle} />

                {overlay.mode === 'options' && (
                  <View style={{ paddingBottom: 20 }}>
                    <Text style={styles.sheetTitle}>{overlay.name}</Text>
                    
                    <TouchableOpacity style={styles.optionRow} onPress={() => setOverlay({ ...overlay, mode: 'input' })}>
                      <Ionicons name="pencil" size={22} color="#FFFFFF" style={styles.optionIcon} />
                      <Text style={styles.optionText}>Rename Playlist</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.optionRow} onPress={handleDeletePlaylist}>
                      <Ionicons name="trash" size={22} color="#EF4444" style={styles.optionIcon} />
                      <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete Playlist</Text>
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
                        placeholder="Enter playlist name..."
                        placeholderTextColor="#71717A"
                        value={inputValue}
                        onChangeText={setInputValue}
                        autoFocus
                        onSubmitEditing={handleSavePlaylist}
                        returnKeyType="done"
                      />
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlaylist} activeOpacity={0.8}>
                        <Text style={styles.saveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </LinearGradient>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  createBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 4, fontSize: 15 },
  
  listPadding: { paddingHorizontal: 20, paddingBottom: 120 }, 
  gridRow: { justifyContent: 'space-between', marginBottom: 20 },
  gridCard: { width: GRID_ITEM_WIDTH },
  gridArtworkContainer: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, overflow: 'hidden' },
  gridArtwork: { width: '100%', height: '100%' },
  
  // 3-Dot Button Styles
  threeDotBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 6, zIndex: 10 },
  
  gridTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2, letterSpacing: -0.2 },
  gridSubtitle: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },

  overlayBackground: { zIndex: 10, elevation: 99, backgroundColor: '#000' },
  albumHeader: { paddingBottom: 30, backgroundColor: 'transparent', marginHorizontal: -20, paddingHorizontal: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, marginLeft: -10 },
  backButtonText: { fontSize: 17, color: '#FFFFFF', fontWeight: '600', marginLeft: 2 },
  albumHeaderContent: { alignItems: 'center', marginTop: 10 },
  albumHeaderArtContainer: { shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, marginBottom: 24, width: 220, height: 220, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  albumHeaderArt: { width: '100%', height: '100%', borderRadius: 12 },
  albumTitleLarge: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 6, letterSpacing: -0.5 },
  albumMetaLarge: { fontSize: 14, color: '#CBD5E1', fontWeight: '500', textAlign: 'center', marginBottom: 24 },
  playFab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  trackNumberContainer: { width: 30, alignItems: 'center', marginRight: 10 },
  trackNumber: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  trackInfo: { flex: 1, justifyContent: 'center', paddingRight: 10 },
  trackTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.2 },
  titleActive: { color: '#A5B4FC', fontWeight: '700' },
  trackArtist: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },
  trackDuration: { fontSize: 13, color: '#CBD5E1', fontWeight: '500', fontVariant: ['tabular-nums'] },
  emptyContainer: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: '#CBD5E1', fontSize: 15, fontWeight: '500' },

  // --- Modal Styles ---
  bottomSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  sheetContent: { paddingHorizontal: 24, paddingBottom: 30, paddingTop: 12 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#3F3F46', alignSelf: 'center', marginBottom: 20 },
  
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
  
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#27272A' },
  optionIcon: { marginRight: 14, width: 24, textAlign: 'center' },
  optionText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },

  createInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  createInput: { flex: 1, backgroundColor: '#27272A', color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, fontSize: 16, borderWidth: 1, borderColor: '#4F46E5' },
  saveBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }
});
