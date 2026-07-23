import {describe,expect,it} from 'vitest';
import {baseCollectionKey,isAllowedCollectionKey} from './collections';

describe('UMAY collection boundary',()=>{
  it('accepts production and isolated environment keys',()=>{
    expect(isAllowedCollectionKey('offers')).toBe(true);
    expect(isAllowedCollectionKey('qa:offers')).toBe(true);
    expect(baseCollectionKey('development:candidates')).toBe('candidates');
  });
  it('rejects arbitrary database keys',()=>{
    expect(isAllowedCollectionKey('users')).toBe(false);
    expect(isAllowedCollectionKey('qa:unknown')).toBe(false);
  });
});
