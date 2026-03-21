import { describe, expect, it } from 'bun:test';
import { createShutdownController } from './shutdown.js';

describe('createShutdownController', () => {
  it('returns a controller with the expected interface', () => {
    const controller = createShutdownController();
    expect(controller).toHaveProperty('signal');
    expect(controller).toHaveProperty('install');
    expect(controller).toHaveProperty('uninstall');
    expect(controller).toHaveProperty('isShuttingDown');
  });

  it('isShuttingDown is false initially', () => {
    const controller = createShutdownController();
    expect(controller.isShuttingDown).toBe(false);
  });

  it('signal is not aborted initially', () => {
    const controller = createShutdownController();
    expect(controller.signal.aborted).toBe(false);
  });

  it('signal is an AbortSignal instance', () => {
    const controller = createShutdownController();
    expect(controller.signal).toBeInstanceOf(AbortSignal);
  });

  it('uninstall is idempotent', () => {
    const controller = createShutdownController();
    controller.install();
    // Calling uninstall multiple times should not throw
    controller.uninstall();
    controller.uninstall();
    controller.uninstall();
  });

  it('install is idempotent', () => {
    const controller = createShutdownController();
    // Calling install multiple times should not throw or register duplicate handlers
    controller.install();
    controller.install();
    controller.uninstall();
  });

  it('accepts custom message option', () => {
    const controller = createShutdownController({ message: 'Stopping...' });
    // Should create without error
    expect(controller.isShuttingDown).toBe(false);
  });

  it('accepts onShutdown callback option', () => {
    const controller = createShutdownController({ onShutdown: () => {} });
    expect(controller.isShuttingDown).toBe(false);
  });

  it('uninstall before install is safe', () => {
    const controller = createShutdownController();
    // Should not throw even though install was never called
    controller.uninstall();
  });
});
