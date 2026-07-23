import {describe,expect,it} from 'vitest';
import {validateUmayBackup} from './backup';

describe('UMAY backup validation',()=>{
  it('accepts a valid version 1 export',()=>{
    expect(validateUmayBackup({schemaVersion:1,exportedAt:'2026-07-22T00:00:00.000Z',records:[{key:'offers',value:[],updatedAt:1}]}).valid).toBe(true);
  });
  it('rejects unsupported or incomplete backups',()=>{
    const result=validateUmayBackup({schemaVersion:2,exportedAt:'x',records:[{key:'',updatedAt:'now'}]});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
  it('warns about duplicate collection keys',()=>{
    const result=validateUmayBackup({schemaVersion:1,exportedAt:'2026-07-22T00:00:00Z',records:[{key:'offers',value:[],updatedAt:1},{key:'offers',value:[],updatedAt:2}]});
    expect(result.warnings).toContain('Tekrarlanan koleksiyon anahtarı: offers');
  });
});
