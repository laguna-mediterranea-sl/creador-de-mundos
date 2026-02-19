import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorldEngineContext } from '../src/context.js';
import { createTestWrapper } from './test-utils.js';

describe('useWorldEngineContext', () => {
  it('should return context value when inside provider', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useWorldEngineContext(), { wrapper });

    expect(result.current.engine).toBeDefined();
    expect(result.current.theme).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should throw when used outside provider', () => {
    expect(() => {
      renderHook(() => useWorldEngineContext());
    }).toThrow('must be used within a <WorldViewer> component');
  });
});
