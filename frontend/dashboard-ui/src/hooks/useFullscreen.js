import { useState, useEffect } from 'react';

/**
 * Hook to detect if the application is in fullscreen mode
 * @returns {boolean} isFullscreen - true if in fullscreen mode
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Check if already in fullscreen on mount
    const checkFullscreenState = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    // Initial check
    checkFullscreenState();

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      checkFullscreenState();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return isFullscreen;
}

