import { describe, it, expect } from 'vitest';
import { REACTION_EMOJIS } from '../src/types.js';
import type {
  SessionRole,
  ConnectionState,
  SyncEvent,
  CoReadingConfig,
  InviteData,
  JoinResult,
  CoReadingState,
} from '../src/types.js';

describe('Co-reading types', () => {
  it('exports REACTION_EMOJIS with correct structure', () => {
    expect(REACTION_EMOJIS).toHaveLength(6);
    for (const item of REACTION_EMOJIS) {
      expect(item).toHaveProperty('emoji');
      expect(item).toHaveProperty('label');
      expect(typeof item.emoji).toBe('string');
      expect(typeof item.label).toBe('string');
    }
  });

  it('SessionRole accepts narrator and listener', () => {
    const narrator: SessionRole = 'narrator';
    const listener: SessionRole = 'listener';
    expect(narrator).toBe('narrator');
    expect(listener).toBe('listener');
  });

  it('ConnectionState accepts all valid states', () => {
    const states: ConnectionState[] = [
      'disconnected',
      'connecting',
      'connected',
      'reconnecting',
      'failed',
    ];
    expect(states).toHaveLength(5);
  });

  it('SyncEvent can be constructed with required fields', () => {
    const event: SyncEvent = {
      type: 'page_change',
      payload: { page: 2 },
      sender: 'narrator',
      timestamp: Date.now(),
    };
    expect(event.type).toBe('page_change');
    expect(event.sender).toBe('narrator');
  });

  it('JoinResult can represent success', () => {
    const result: JoinResult = {
      success: true,
      token: 'lk-token',
      livekitUrl: 'wss://lk.example.com',
      storyId: 'story-1',
    };
    expect(result.success).toBe(true);
  });

  it('JoinResult can represent failure', () => {
    const result: JoinResult = {
      success: false,
      error: 'expired',
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('expired');
  });
});
