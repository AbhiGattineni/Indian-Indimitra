// Ported from Indimitra's StoreImageSlider: autoplaying banner with fade+slide
// transition, hover-reveal arrows, dot indicators, and a bottom gradient
// overlay carrying the store's address/description.
import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const AUTOPLAY_INTERVAL = 4000;

export default function StoreImageSlider({ images = [], storeAddress, storeDescription }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [slideDirection, setSlideDirection] = useState('next');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);

  const hasImages = images.length > 0;

  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!hasImages || images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setSlideDirection('next');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        setIsTransitioning(false);
      }, 300);
    }, AUTOPLAY_INTERVAL);
  }, [hasImages, images.length]);

  useEffect(() => {
    if (!isHovered) startAutoplay();
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isHovered, startAutoplay]);

  const navigate = (direction) => {
    setSlideDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) =>
        direction === 'next'
          ? prev === images.length - 1 ? 0 : prev + 1
          : prev === 0 ? images.length - 1 : prev - 1
      );
      setIsTransitioning(false);
    }, 300);
    if (!isHovered) startAutoplay();
  };

  const handleDotClick = (index) => {
    if (index === currentIndex) return;
    setSlideDirection(index > currentIndex ? 'next' : 'prev');
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
    if (!isHovered) startAutoplay();
  };

  const overlay = (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        px: { xs: 2, sm: 3 },
        pb: { xs: 1.5, sm: 2 },
        pt: { xs: 4, sm: 5 },
      }}
    >
      {storeAddress && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <LocationOnIcon sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }} />
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.9)', fontSize: { xs: '0.8rem', sm: '0.88rem' }, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
          >
            {storeAddress}
          </Typography>
        </Box>
      )}
      {storeDescription && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: { xs: '0.75rem', sm: '0.82rem' },
            mt: 0.25,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: { xs: 'normal', sm: 'nowrap' },
          }}
        >
          {storeDescription}
        </Typography>
      )}
    </Box>
  );

  if (!hasImages) {
    return (
      <Paper
        elevation={2}
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 160, sm: 200, md: 220 },
          mb: { xs: 2, sm: 3 },
          borderRadius: 3,
          overflow: 'hidden',
          background: (t) => `linear-gradient(135deg, ${t.palette.grey[50]} 0%, ${t.palette.grey[300]} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StorefrontOutlinedIcon sx={{ fontSize: 40, color: 'rgba(0,0,0,0.2)', mb: 0.5 }} />
        <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.35)' }}>
          Offers &amp; promotions coming soon
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={2}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: 180, sm: 220, md: 260 },
        mb: { xs: 2, sm: 3 },
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        '&:hover .slider-arrow': { opacity: 1 },
      }}
    >
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <img
          src={images[currentIndex]}
          alt={`Store banner ${currentIndex + 1}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning
              ? `translateX(${slideDirection === 'next' ? '30px' : '-30px'})`
              : 'translateX(0)',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {overlay}

        {images.length > 1 && (
          <>
            <IconButton
              className="slider-arrow"
              onClick={() => navigate('prev')}
              size="small"
              sx={{
                position: 'absolute', left: 4, top: '40%', transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.5)', opacity: 0,
                transition: 'opacity 0.2s ease, background-color 0.2s ease',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.8)' },
                zIndex: 4, p: 0.5,
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              className="slider-arrow"
              onClick={() => navigate('next')}
              size="small"
              sx={{
                position: 'absolute', right: 4, top: '40%', transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.5)', opacity: 0,
                transition: 'opacity 0.2s ease, background-color 0.2s ease',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.8)' },
                zIndex: 4, p: 0.5,
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </>
        )}

        {images.length > 1 && (
          <Box
            sx={{
              position: 'absolute', bottom: { xs: 40, sm: 48 }, left: '50%',
              transform: 'translateX(-50%)', display: 'flex', gap: 0.75, zIndex: 4,
            }}
          >
            {images.map((_, index) => (
              <Box
                key={index}
                onClick={() => handleDotClick(index)}
                sx={{
                  width: currentIndex === index ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: currentIndex === index ? 'common.white' : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: currentIndex === index ? 'common.white' : 'rgba(255, 255, 255, 0.75)',
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
