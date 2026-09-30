import React, { useState, useEffect } from 'react';
import { PhotosSettings } from '../../types/widget';
import { WidgetProps } from '../../widgets/shared';
import { Image as ImageIcon, FolderOpen } from 'lucide-react';

// Built-in curated high-res scenic photos inspired by Apple macOS Sonoma / Sequoia wallpapers
const DEFAULT_CURATED_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    title: 'Yosemite Valley',
    category: 'Memories'
  },
  {
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    title: 'Foggy Forest Ridge',
    category: 'Nature'
  },
  {
    url: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1200&q=80',
    title: 'Alpine Turquoise Lake',
    category: 'Featured'
  },
  {
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
    title: 'Sunlight Through Redwoods',
    category: 'Memories'
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    title: 'Pacific Coastline',
    category: 'Featured'
  }
];

export const PhotosWidget: React.FC<WidgetProps<PhotosSettings>> = ({ settings, onSettings }) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photosList, setPhotosList] = useState<string[]>(settings?.customImages || []);

  useEffect(() => {
    setPhotosList(settings?.customImages || []);
    setPhotoIndex(0);
  }, [settings?.customImages]);

  const cycleSeconds = settings?.cycleIntervalSeconds || 20;

  // Auto-cycle photos
  useEffect(() => {
    const totalCount = photosList.length > 0 ? photosList.length : DEFAULT_CURATED_PHOTOS.length;
    const timer = setInterval(() => {
      setPhotoIndex(prev => (prev + 1) % totalCount);
    }, cycleSeconds * 1000);

    return () => clearInterval(timer);
  }, [photosList.length, cycleSeconds]);

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    const totalCount = photosList.length > 0 ? photosList.length : DEFAULT_CURATED_PHOTOS.length;
    setPhotoIndex(prev => (prev + 1) % totalCount);
  };

  const handleSelectFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.electronAPI) {
      const images = await window.electronAPI.openDirectoryDialog();
      if (images && images.length > 0) {
        setPhotosList(images);
        setPhotoIndex(0);
        onSettings({ customImages: images });
      }
    }
  };

  const isCustom = photosList.length > 0;
  const currentPhotoUrl = isCustom
    ? photosList[photoIndex % photosList.length]
    : DEFAULT_CURATED_PHOTOS[photoIndex % DEFAULT_CURATED_PHOTOS.length].url;

  const currentTitle = isCustom
    ? `Photo ${photoIndex + 1} of ${photosList.length}`
    : DEFAULT_CURATED_PHOTOS[photoIndex % DEFAULT_CURATED_PHOTOS.length].title;

  const currentCategory = isCustom
    ? 'Local Album'
    : DEFAULT_CURATED_PHOTOS[photoIndex % DEFAULT_CURATED_PHOTOS.length].category;

  return (
    <div
      onClick={handleNextPhoto}
      className="relative w-full h-full overflow-hidden select-none group/photo bg-black"
    >
      {/* Photo with Ken Burns pan & zoom effect */}
      <div
        key={currentPhotoUrl}
        className="absolute inset-0 bg-cover bg-center animate-fade-in"
        style={{
          backgroundImage: `url("${currentPhotoUrl}")`,
          animation: settings?.effect === 'static' ? undefined : 'kenburns 30s ease-in-out infinite alternate'
        }}
      />

      {/* Subtle Apple gradient shadow scrim at bottom for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

      {/* Top right folder picker button (appears on hover) */}
      <button
        onClick={handleSelectFolder}
        title="Select photo folder from PC"
        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md opacity-0 group-hover/photo:opacity-100 transition-opacity z-10"
      >
        <FolderOpen size={14} />
      </button>

      {/* Bottom left Apple-style photo metadata glass pill */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-white/60">
            {currentCategory}
          </div>
          <div className="text-[13px] font-semibold text-white drop-shadow-sm truncate">
            {currentTitle}
          </div>
        </div>

        {/* Small icon indicator */}
        <div className="text-white/40 group-hover/photo:text-white/80 transition-colors">
          <ImageIcon size={14} />
        </div>
      </div>
    </div>
  );
};
