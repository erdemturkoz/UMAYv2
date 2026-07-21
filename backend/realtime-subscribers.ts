import {db,error,json,ws} from '@appdeploy/sdk';
const TABLE='entity_subscriptions';
type Sub={id:string;entity_type:string;entity_id:string;connection_id:string;created_at:number};
async function all():Promise<Sub[]>{const {items}=await db.list(TABLE,{limit:1000});return items as Sub[]}
export async function removeSubscriptionsByConnection(connectionId:string){const ids=(await all()).filter(x=>x.connection_id===connectionId).map(x=>x.id);if(ids.length)await db.delete(TABLE,ids)}
async function add(entity_type:string,entity_id:string,connection_id:string){const exists=(await all()).some(x=>x.entity_type===entity_type&&x.entity_id===entity_id&&x.connection_id===connection_id);if(!exists)await db.add(TABLE,[{entity_type,entity_id,connection_id,created_at:Date.now()}])}
async function remove(entity_type:string,entity_id:string,connection_id:string){const ids=(await all()).filter(x=>x.entity_type===entity_type&&x.entity_id===entity_id&&x.connection_id===connection_id).map(x=>x.id);if(ids.length)await db.delete(TABLE,ids)}
export async function notifySubscribers(entityType:string,entityId:string,payload:unknown,exclude?:string){const ids=Array.from(new Set((await all()).filter(x=>x.entity_type===entityType&&x.entity_id===entityId&&x.connection_id!==exclude).map(x=>x.connection_id)));if(ids.length)await ws.send(ids,{v:1,type:'entity.update',payload:{entity_type:entityType,entity_id:entityId,data:payload}})}
export const realtimeSubscriptionRoutes={
 'POST /api/subscriptions':[async({body})=>{const b=(body||{}) as Record<string,string>;if(!b.entity_type||!b.entity_id||!b.connection_id)return error('subscription fields required',400);await add(b.entity_type,b.entity_id,b.connection_id);return json({ok:true})}],
 'POST /api/subscriptions/remove':[async({body})=>{const b=(body||{}) as Record<string,string>;if(!b.entity_type||!b.entity_id||!b.connection_id)return error('subscription fields required',400);await remove(b.entity_type,b.entity_id,b.connection_id);return json({ok:true})}],
};
