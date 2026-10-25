export interface LocalMedia {
  id: string;
  title: string;
  uri: string;
  duration: number;
  size: number;
  type: 'video' | 'audio';
  album: string;
  artist: string;
  genre: string;
}
