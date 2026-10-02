// Product photo slideshow for the product popup / page: shows each photo
// whole (never cropped), with arrows, dots, swipe and a photo counter; it
// auto-advances until the shopper interacts with it. Tapping a photo opens a
// full-screen viewer with the same navigation.
import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Dialog, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';

const AUTOPLAY_MS = 4000;
const roundBtn = {
  bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
};

// Left/right swipe on touch screens.
function useSwipe(onPrev, onNext) {
  const start = useRef(null);
  return {
    onTouchStart: (e) => { start.current = e.touches[0].clientX; },
    onTouchEnd: (e) => {
      if (start.current == null) return;
      const dx = e.changedTouches[0].clientX - start.current;
      start.current = null;
      if (Math.abs(dx) > 40) (dx > 0 ? onPrev : onNext)();
    },
  };
}

function Arrows({ count, onPrev, onNext, dark }) {
  if (count < 2) return null;
  const sx = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
    ...(dark ? { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } } : roundBtn),
  };
  return (
    <>
      <IconButton aria-label="Previous photo" size="small" onClick={(e) => { e.stopPropagation(); onPrev(); }} sx={{ ...sx, left: 8 }}>
        <ChevronLeftIcon />
      </IconButton>
      <IconButton aria-label="Next photo" size="small" onClick={(e) => { e.stopPropagation(); onNext(); }} sx={{ ...sx, right: 8 }}>
        <ChevronRightIcon />
      </IconButton>
    </>
  );
}

function Dots({ count, index, onPick }) {
  if (count < 2) return null;
  return (
    <Box sx={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0.75, zIndex: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          onClick={(e) => { e.stopPropagation(); onPick(i); }}
          sx={{
            width: i === index ? 16 : 7, height: 7, borderRadius: 4, cursor: 'pointer', transition: 'all 0.25s',
            bgcolor: i === index ? 'primary.main' : 'rgba(0,0,0,0.25)',
          }}
        />
      ))}
    </Box>
  );
}

export default function ProductImageGallery({ images, alt, height = { xs: 260, sm: 340 }, rounded = false }) {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const count = images.length;
  const key = images.join('|');

  useEffect(() => { setIndex(0); setAutoplay(true); }, [key]);
  useEffect(() => {
    if (!autoplay || viewerOpen || count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay, viewerOpen, count]);

  // Any manual navigation stops the autoplay.
  const go = (i) => { setAutoplay(false); setIndex(((i % count) + count) % count); };
  const prev = () => go(index - 1);
  const next = () => go(index + 1);
  const swipe = useSwipe(prev, next);
  const counter = count > 1 && (
    <Typography
      variant="caption"
      sx={{ position: 'absolute', top: 10, left: 10, px: 1, py: 0.25, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', zIndex: 2 }}
    >
      {index + 1} / {count}
    </Typography>
  );

  return (
    <>
      <Box
        {...swipe}
        onMouseEnter={() => setAutoplay(false)}
        sx={{ position: 'relative', bgcolor: 'grey.100', borderRadius: rounded ? 2 : 0, overflow: 'hidden' }}
      >
        <Box
          component="img"
          src={images[index]}
          alt={count > 1 ? `${alt} (${index + 1} of ${count})` : alt}
          onClick={() => { setAutoplay(false); setViewerOpen(true); }}
          sx={{ width: '100%', height, objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
        />
        {counter}
        <Arrows count={count} onPrev={prev} onNext={next} />
        <Dots count={count} index={index} onPick={go} />
        <IconButton
          onClick={() => { setAutoplay(false); setViewerOpen(true); }}
          aria-label="View full image" size="small"
          sx={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, ...roundBtn }}
        >
          <ZoomOutMapIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Full-screen viewer: arrows / swipe to move, tap the photo background or X to close. */}
      <Dialog open={viewerOpen} onClose={() => setViewerOpen(false)} fullScreen PaperProps={{ sx: { bgcolor: '#000' } }}>
        <Box
          {...swipe}
          onClick={() => setViewerOpen(false)}
          sx={{
            position: 'relative', width: '100%', height: '100%', p: { xs: 1, sm: 3 }, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          }}
        >
          <Box
            component="img" src={images[index]} alt={alt}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
          <Arrows count={count} onPrev={prev} onNext={next} dark />
          {count > 1 && (
            <Typography sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', color: '#fff' }}>
              {index + 1} / {count}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={() => setViewerOpen(false)} aria-label="Close image"
          sx={{ position: 'fixed', top: 16, right: 16, ...roundBtn }}
        >
          <CloseIcon />
        </IconButton>
      </Dialog>
    </>
  );
}
