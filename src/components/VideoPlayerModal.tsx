
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
  PanResponder,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { VolumeManager } from 'react-native-volume-manager';
import { Ionicons } from '@expo/vector-icons';

import { LocalMedia } from '../types';

interface VideoPlayerModalProps {
  media: LocalMedia | null;
  onClose: () => void;
}

type GestureIndicator = {
  type: 'seek' | 'brightness' | 'volume';
  value: number;
  direction?: 'forward' | 'backward';
} | null;

const SEEK_SECONDS_PER_PIXEL = 0.12;
const GESTURE_THRESHOLD = 12;

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      secs,
    ).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function VideoPlayerModal({
  media,
  onClose,
}: VideoPlayerModalProps) {
  const videoRef = useRef<Video>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const [brightness, setBrightness] = useState(0.5);
  const [volume, setVolume] = useState(0.5);
  const [indicator, setIndicator] = useState<GestureIndicator>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const brightnessRef = useRef(0.5);
  const volumeRef = useRef(0.5);
  const pausedRef = useRef(false);
  const seekingRef = useRef(false);
  const seekStartRef = useRef(0);
  const gestureStartRef = useRef(0);
  const lastVolumeCallRef = useRef(0);

  const screen = Dimensions.get('screen');

  const clearHideTimer = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  }, []);

  const fadeOutControls = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setControlsVisible(false);
    });
  }, [fadeAnim]);

  const resetHideTimer = useCallback(() => {
    clearHideTimer();

    if (pausedRef.current || seekingRef.current) return;

    hideTimeout.current = setTimeout(() => {
      fadeOutControls();
    }, 3500);
  }, [clearHideTimer, fadeOutControls]);

  const fadeInControls = useCallback(() => {
    setControlsVisible(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    resetHideTimer();
  }, [fadeAnim, resetHideTimer]);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      clearHideTimer();
      fadeOutControls();
    } else {
      fadeInControls();
    }
  }, [
    controlsVisible,
    clearHideTimer,
    fadeOutControls,
    fadeInControls,
  ]);

  const showIndicator = useCallback(
    (nextIndicator: GestureIndicator) => {
      setIndicator(nextIndicator);

      if (indicatorTimeout.current) {
        clearTimeout(indicatorTimeout.current);
      }

      indicatorAnim.stopAnimation();
      indicatorAnim.setValue(1);

      indicatorTimeout.current = setTimeout(() => {
        Animated.timing(indicatorAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setIndicator(null));
      }, 850);
    },
    [indicatorAnim],
  );

  // Keep refs synchronized for gesture callbacks.
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    seekingRef.current = isSeeking;
  }, [isSeeking]);

  // Initialize brightness and system volume.
  useEffect(() => {
    if (!media) return;

    let mounted = true;

    const initializeAudioVideo = async () => {
      try {
        const currentBrightness = await Brightness.getBrightnessAsync();

        if (mounted) {
          const value = clamp(currentBrightness, 0, 1);
          brightnessRef.current = value;
          setBrightness(value);
        }
      } catch (error) {
        console.warn('Unable to read screen brightness:', error);
      }

      try {
        const result = await VolumeManager.getVolume();

        if (mounted && typeof result.volume === 'number') {
          const value = clamp(result.volume, 0, 1);
          volumeRef.current = value;
          setVolume(value);
        }
      } catch (error) {
        console.warn('Unable to read system volume:', error);
      }
    };

    initializeAudioVideo();

    return () => {
      mounted = false;
    };
  }, [media]);

  useEffect(() => {
    if (!media) return;

    setIsPaused(false);
    pausedRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(0);
    durationRef.current = 0;
    setIsSeeking(false);
    seekingRef.current = false;
    setControlsVisible(true);
    setIndicator(null);
    fadeAnim.setValue(1);

    ScreenOrientation.unlockAsync().catch(console.warn);
    resetHideTimer();

    return () => {
      clearHideTimer();

      if (indicatorTimeout.current) {
        clearTimeout(indicatorTimeout.current);
      }

      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(console.warn);
    };
  }, [media, fadeAnim, clearHideTimer, resetHideTimer]);

  useEffect(() => {
    resetHideTimer();
  }, [isPaused, isSeeking, resetHideTimer]);

  const seekTo = useCallback(
    (seconds: number) => {
      const nextTime = clamp(seconds, 0, durationRef.current || 0);

      videoRef.current?.seek(nextTime);
      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
    },
    [],
  );

  const skipBackward = useCallback(() => {
    seekTo(currentTimeRef.current - 10);
    fadeInControls();
  }, [seekTo, fadeInControls]);

  const skipForward = useCallback(() => {
    seekTo(currentTimeRef.current + 10);
    fadeInControls();
  }, [seekTo, fadeInControls]);

  const handlePlayPause = useCallback(() => {
    setIsPaused(previous => {
      pausedRef.current = !previous;
      return !previous;
    });

    fadeInControls();
  }, [fadeInControls]);

  const updateBrightness = useCallback(async (nextValue: number) => {
    const value = clamp(nextValue, 0.02, 1);

    brightnessRef.current = value;
    setBrightness(value);

    try {
      await Brightness.setBrightnessAsync(value);
    } catch (error) {
      console.warn('Unable to change screen brightness:', error);
    }
  }, []);

  const updateVolume = useCallback(async (nextValue: number) => {
    const value = clamp(nextValue, 0, 1);

    volumeRef.current = value;
    setVolume(value);

    // Avoid flooding native volume calls during a fast gesture.
    const now = Date.now();
    if (now - lastVolumeCallRef.current < 35) return;

    lastVolumeCallRef.current = now;

    try {
      await VolumeManager.setVolume(value);
    } catch (error) {
      console.warn('Unable to change system volume:', error);
    }
  }, []);

  const createGestureResponder = useCallback(
    (side: 'left' | 'right') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,

        onMoveShouldSetPanResponder: (_, gesture) => {
          const movedX = Math.abs(gesture.dx);
          const movedY = Math.abs(gesture.dy);

          return (
            Math.max(movedX, movedY) > GESTURE_THRESHOLD &&
            (movedX > movedY || movedY > movedX)
          );
        },

        onPanResponderGrant: () => {
          clearHideTimer();

          gestureStartRef.current =
            side === 'left'
              ? brightnessRef.current
              : volumeRef.current;

          seekStartRef.current = currentTimeRef.current;
        },

        onPanResponderMove: (_, gesture) => {
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);

          if (isHorizontal) {
            const nextTime = clamp(
              seekStartRef.current +
                gesture.dx * SEEK_SECONDS_PER_PIXEL,
              0,
              durationRef.current || 0,
            );

            seekTo(nextTime);

            showIndicator({
              type: 'seek',
              value: nextTime,
              direction: gesture.dx >= 0 ? 'forward' : 'backward',
            });

            return;
          }

          // Swipe up increases brightness/volume.
          // Swipe down decreases brightness/volume.
          const change = -gesture.dy / Math.max(screen.height, 1);

          if (side === 'left') {
            const nextBrightness = clamp(
              gestureStartRef.current + change,
              0.02,
              1,
            );

            updateBrightness(nextBrightness);

            showIndicator({
              type: 'brightness',
              value: nextBrightness,
            });
          } else {
            const nextVolume = clamp(
              gestureStartRef.current + change,
              0,
              1,
            );

            updateVolume(nextVolume);

            showIndicator({
              type: 'volume',
              value: nextVolume,
            });
          }
        },

        onPanResponderRelease: () => {
          resetHideTimer();
        },

        onPanResponderTerminate: () => {
          resetHideTimer();
        },
      }),
    [
      clearHideTimer,
      resetHideTimer,
      screen.height,
      seekTo,
      showIndicator,
      updateBrightness,
      updateVolume,
    ],
  );

  const leftGesture = useMemo(
    () => createGestureResponder('left'),
    [createGestureResponder],
  );

  const rightGesture = useMemo(
    () => createGestureResponder('right'),
    [createGestureResponder],
  );

  if (!media) return null;

  const indicatorIcon =
    indicator?.type === 'brightness'
      ? 'sunny'
      : indicator?.type === 'volume'
        ? indicator.value === 0
          ? 'volume-mute'
          : 'volume-high'
        : indicator?.direction === 'backward'
          ? 'play-back'
          : 'play-forward';

  const indicatorLabel =
    indicator?.type === 'seek'
      ? `${indicator.direction === 'backward' ? '−' : '+'}${Math.round(
          Math.abs(indicator.value - currentTimeRef.current),
        )} sec`
      : indicator
        ? `${Math.round(indicator.value * 100)}%`
        : '';

  return (
    <Modal
      visible={!!media}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />

      <SafeAreaView
        style={styles.modalContainer}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <View style={styles.playerWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: media.uri }}
            style={styles.videoView}
            controls={false}
            resizeMode="contain"
            paused={isPaused}
            ignoreSilentSwitch="ignore"
            onLoad={data => setDuration(data.duration)}
            onEnd={() => {
              setIsPaused(true);
              pausedRef.current = true;
              seekTo(0);
              fadeInControls();
            }}
            onProgress={data => {
              if (!seekingRef.current) {
                currentTimeRef.current = data.currentTime;
                setCurrentTime(data.currentTime);
              }
            }}
          />

          {/* Gesture zones sit behind the playback controls. */}
          <View style={styles.gestureLayer} pointerEvents="box-none">
            <View
              style={styles.gestureZone}
              {...leftGesture.panHandlers}
            />
            <View
              style={styles.gestureZone}
              {...rightGesture.panHandlers}
            />
          </View>

          {/* Temporary brightness, volume, and seek indicator. */}
          {indicator && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicatorCard,
                {
                  opacity: indicatorAnim,
                  transform: [
                    {
                      scale: indicatorAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name={indicatorIcon as any}
                size={27}
                color="#FFFFFF"
              />

              <Text style={styles.indicatorValue}>
                {indicatorLabel}
              </Text>

              {indicator.type !== 'seek' && (
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      { width: `${indicator.value * 100}%` },
                    ]}
                  />
                </View>
              )}
            </Animated.View>
          )}

          <Animated.View
            pointerEvents={controlsVisible ? 'box-none' : 'none'}
            style={[styles.overlayContainer, { opacity: fadeAnim }]}
          >
            {/* Top header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.75}
                style={styles.headerIconButton}
              >
                <Ionicons name="chevron-back" size={25} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {media.title}
                </Text>
                <Text style={styles.subtitle}>NOW PLAYING</Text>
              </View>

              <TouchableOpacity
                onPress={toggleControls}
                style={styles.headerIconButton}
              >
                <Ionicons
                  name={controlsVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={21}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Centered playback controls */}
            <View style={styles.centerControls} pointerEvents="box-none">
              <TouchableOpacity
                onPress={skipBackward}
                activeOpacity={0.75}
                style={styles.skipButton}
              >
                <Ionicons
                  name="play-back"
                  size={27}
                  color="#FFFFFF"
                />
                <Text style={styles.skipText}>10</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlayPause}
                activeOpacity={0.8}
                style={styles.playPauseBtn}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={38}
                  color="#FFFFFF"
                  style={isPaused ? { marginLeft: 4 } : undefined}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={skipForward}
                activeOpacity={0.75}
                style={styles.skipButton}
              >
                <Ionicons
                  name="play-forward"
                  size={27}
                  color="#FFFFFF"
                />
                <Text style={styles.skipText}>10</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom timeline */}
            <View style={styles.bottomControls}>
              <View style={styles.timeRow}>
                <Text style={styles.currentTimeText}>
                  {formatDuration(currentTime)}
                </Text>

                <View style={styles.playingBadge}>
                  <View
                    style={[
                      styles.playingDot,
                      { opacity: isPaused ? 0.35 : 1 },
                    ]}
                  />
                  <Text style={styles.playingBadgeText}>
                    {isPaused ? 'PAUSED' : 'PLAYING'}
                  </Text>
                </View>

                <Text style={styles.durationText}>
                  {formatDuration(duration)}
                </Text>
              </View>

              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={clamp(currentTime, 0, duration || 1)}
                minimumTrackTintColor="#8B5CF6"
                maximumTrackTintColor="rgba(255,255,255,0.22)"
                thumbTintColor="#FFFFFF"
                onSlidingStart={() => {
                  setIsSeeking(true);
                  seekingRef.current = true;
                  clearHideTimer();
                }}
                onValueChange={value => {
                  currentTimeRef.current = value;
                  setCurrentTime(value);
                }}
                onSlidingComplete={value => {
                  seekTo(value);
                  setIsSeeking(false);
                  seekingRef.current = false;
                  resetHideTimer();
                }}
              />

              <View style={styles.gestureHintRow}>
                <View style={styles.hintItem}>
                  <Ionicons
                    name="sunny-outline"
                    size={14}
                    color="#C4B5FD"
                  />
                  <Text style={styles.hintText}>Left · Brightness</Text>
                </View>

                <View style={styles.hintItem}>
                  <Ionicons
                    name="volume-high-outline"
                    size={14}
                    color="#C4B5FD"
                  />
                  <Text style={styles.hintText}>Right · Volume</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },

  playerWrapper: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  videoView: {
    ...StyleSheet.absoluteFillObject,
  },

  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },

  gestureZone: {
    flex: 1,
  },

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: 92,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: 'rgba(5,5,8,0.68)',
  },

  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  titleContainer: {
    flex: 1,
    gap: 4,
  },

  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  subtitle: {
    color: '#B9A8FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },

  centerControls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },

  playPauseBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(124,58,237,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },

  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25,25,30,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  skipText: {
    marginTop: -3,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: Platform.OS === 'android' ? 22 : 28,
    backgroundColor: 'rgba(5,5,8,0.84)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  currentTimeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  durationText: {
    color: '#B9B9C5',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
  },

  playingBadgeText: {
    color: '#D6D0E7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  slider: {
    width: '100%',
    height: 38,
    marginTop: 5,
    marginBottom: 5,
  },

  gestureHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },

  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  hintText: {
    color: '#A7A5B5',
    fontSize: 10,
    fontWeight: '600',
  },

  indicatorCard: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    zIndex: 5,
    minWidth: 125,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 22,
    backgroundColor: 'rgba(20,18,30,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
  },

  indicatorValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  meterTrack: {
    width: 95,
    height: 4,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  meterFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#A78BFA',
  },
});

