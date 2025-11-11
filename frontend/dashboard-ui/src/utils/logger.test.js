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

  it('suppresses console.log when configured in production', async () => {
    vi.stubEnv('MODE', 'production')
    const originalLog = console.log
    const spy = vi.fn()
    console.log = spy

    const { configureLogger } = await import('./logger')
    configureLogger()
    console.log('should be suppressed')

    expect(spy).not.toHaveBeenCalled()

    console.log = originalLog
  })
})
