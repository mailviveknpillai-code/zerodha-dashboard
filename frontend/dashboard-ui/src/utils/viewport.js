// utils/viewport.js
export function setRealViewportHeight() {
  const update = () => {
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--real-vh', `${vh}px`);
  };

  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
}
