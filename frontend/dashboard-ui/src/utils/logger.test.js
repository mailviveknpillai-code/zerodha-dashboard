import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('logger utility', () => {
  it('delegates to console methods in non-production mode', async () => {
    vi.stubEnv('MODE', 'test')
    const { logger } = await import('./logger')

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.debug('hello')
    logger.warn('attention')

    expect(debugSpy).toHaveBeenCalledWith('hello')
    expect(warnSpy).toHaveBeenCalledWith('attention')

    debugSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('logger initializes automatically on import', async () => {
    vi.stubEnv('MODE', 'production')
    const logger = await import('./logger')
    
    // Logger should be available and initialized
    expect(logger.default).toBeDefined()
    expect(typeof logger.default.info).toBe('function')
    expect(typeof logger.default.debug).toBe('function')
    expect(typeof logger.default.warn).toBe('function')
    expect(typeof logger.default.error).toBe('function')
  })
})
