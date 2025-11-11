const isDevelopment = import.meta.env.MODE !== 'production';

const noop = () => {};

export const logger = {
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

export function configureLogger() {
  if (!isDevelopment) {
    console.log = noop;
    console.debug = noop;
    console.info = noop;
  }
}
