import {describe,expect,it} from 'vitest';
import {buildMigrationPlan} from './migration';

describe('migration dry-run',()=>{
 it('keeps legacy offers as warnings instead of deleting them',()=>{const plan=buildMigrationPlan([{key:'candidates',value:[{id:1}],updatedAt:1},{key:'offers',value:[{id:2,name:'Legacy'}],updatedAt:1}]);expect(plan.ready).toBe(true);expect(plan.issues[0]?.severity).toBe('warning')});
 it('blocks orphaned candidate references',()=>{const plan=buildMigrationPlan([{key:'candidates',value:[{id:1}],updatedAt:1},{key:'offers',value:[{id:2,candidateId:9}],updatedAt:1}]);expect(plan.ready).toBe(false);expect(plan.issues[0]?.severity).toBe('error')});
 it('uses only the newest duplicate collection',()=>{const plan=buildMigrationPlan([{key:'candidates',value:[{id:1},{id:1}],updatedAt:1},{key:'candidates',value:[{id:1}],updatedAt:2}]);expect(plan.ready).toBe(true);expect(plan.counts.candidates).toBe(1)});
});
