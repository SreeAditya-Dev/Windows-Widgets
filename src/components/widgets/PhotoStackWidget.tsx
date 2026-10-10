import React from 'react';
import { PhotoStackSettings } from '../../types/widget';
import { WidgetProps, choosePhotos } from '../../widgets/shared';
import { useWidgetStore } from '../../hooks/useWidgetStore';
import { DEFAULT_CURATED_PHOTOS } from './PhotosWidget';
import Stack from '../ui/Stack';
import { Image as ImageIcon, FolderOpen } from 'lucide-react';

/** A whole folder could hold hundreds of photos; only this many become cards. */
const MAX_CARDS = 24;

export const PhotoStackWidget: React.FC<WidgetProps<PhotoStackSettings>> = ({ size, settings, onSettings, preview }) => {
  // Cards are exactly the widget's size and corner radius, so the stack lines up with its neighbours
  const radius = useWidgetStore(s => s.settings.radius);
  const custom = (settings?.customImages || []).slice(0, MAX_CARDS);
  const isCustom = custom.length > 0;
  const urls = isCustom ? custom : DEFAULT_CURATED_PHOTOS.map(p => p.url);
  const large = size === 'large';

  const handlePick = (kind: 'folder' | 'photo') => async (e: React.MouseEvent) => {
    e.stopPropagation();
    const patch = await choosePhotos(kind);
    if (patch) onSettings(patch);
  };

  const captionFor = (i: number) => ({
    category: isCustom ? (settings?.source === 'folder' && settings.sourceLabel) || 'Local Album' : DEFAULT_CURATED_PHOTOS[i].category,
    title: isCustom
      ? custom.length === 1
        ? settings?.sourceLabel || 'My Photo'
        : `Photo ${i + 1} of ${custom.length}`
      : DEFAULT_CURATED_PHOTOS[i].title
  });

  return (
    <div className="relative w-full h-full select-none group/stack">
      <Stack
        // Remount when the photo set changes so the order resets cleanly
        key={urls.join('|')}
        cards={urls.map((src, i) => {
          if (!large) return <img key={src} src={src} alt={`Photo ${i + 1}`} draggable={false} />;
          // Large cards carry their own caption, so it travels with the photo when it's thrown
          const { category, title } = captionFor(i);
          return (
            <div key={src} className="relative w-full h-full">
              <img src={src} alt={title} draggable={false} />
              <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5 pt-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none">
                <div className="text-[10px] uppercase font-bold tracking-widest text-white/60">{category}</div>
                <div className="text-[13px] font-semibold text-white drop-shadow-sm truncate">{title}</div>
              </div>
            </div>
          );
        })}
        layout={settings?.layout || 'deck'}
        visible={3}
        spread={0.5}
        radius={radius}
        frame={settings?.frame ? (large ? 7 : 5) : 0}
        // Dragging anywhere moves the widget like every other widget; a click flips to the next photo
        dragCards={false}
        sendToBackOnClick
        autoplay={!preview && !!settings?.autoplay}
        autoplayDelay={(settings?.autoplayIntervalSeconds || 8) * 1000}
        pauseOnHover
      />

      {/* Top right pickers (appear on hover): one photo, or a whole folder */}
      {!preview && (
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover/stack:opacity-100 transition-opacity z-[60]">
          <button
            onClick={handlePick('photo')}
            title="Show one photo from your PC"
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md"
          >
            <ImageIcon size={13} />
          </button>
          <button
            onClick={handlePick('folder')}
            title="Show a folder of photos from your PC"
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md"
          >
            <FolderOpen size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
