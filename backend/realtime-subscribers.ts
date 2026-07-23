import {db,error,json,requireAuth,ws} from '@appdeploy/sdk';
const TABLE='entity_subscriptions';
type Sub={id:string;entity_type:string;entity_id:string;connection_id:string;user_id?:string;created_at:number};
async function all():Promise<Sub[]>{const items:Sub[]=[];let nextToken:string|undefined;do{const page=await db.list<Sub>(TABLE,{limit:1000,...(nextToken?{nextToken}:{})});items.push(...page.items as Sub[]);nextToken=page.nextToken}while(nextToken);return items}
export async function removeSubscriptionsByConnection(connectionId:string){const ids=(await all()).filter(x=>x.connection_id===connectionId).map(x=>x.id);if(ids.length)await db.delete(TABLE,ids)}
async function add(user_id:string,entity_type:string,entity_id:string,connection_id:string){const exists=(await all()).some(x=>x.user_id===user_id&&x.entity_type===entity_type&&x.entity_id===entity_id&&x.connection_id===connection_id);if(!exists)await db.add(TABLE,[{user_id,entity_type,entity_id,connection_id,created_at:Date.now()}])}
async function remove(user_id:string,entity_type:string,entity_id:string,connection_id:string){const ids=(await all()).filter(x=>x.user_id===user_id&&x.entity_type===entity_type&&x.entity_id===entity_id&&x.connection_id===connection_id).map(x=>x.id);if(ids.length)await db.delete(TABLE,ids)}
// Never put collection values on the socket. The authenticated GET route applies
// the current membership, branch and ownership filter after every change signal.
export async function notifySubscribers(entityType:string,entityId:string,updatedAt:number,exclude?:string){const ids=Array.from(new Set((await all()).filter(x=>Boolean(x.user_id)&&x.entity_type===entityType&&x.entity_id===entityId&&x.connection_id!==exclude).map(x=>x.connection_id)));if(ids.length)await ws.send(ids,{v:1,type:'entity.changed',payload:{entity_type:entityType,entity_id:entityId,updatedAt}})}
export function realtimeSubscriptionRoutes(hasAccess:(userId:string,entityType:string,entityId:string)=>Promise<boolean>){return{
 'POST /api/subscriptions':[requireAuth(),async(ctx:any)=>{const b=(ctx.body||{}) as Record<string,string>;if(!b.entity_type||!b.entity_id||!b.connection_id)return error('subscription fields required',400);if(!await hasAccess(ctx.user!.userId,b.entity_type,b.entity_id))return error('Subscription access denied',403);await add(ctx.user!.userId,b.entity_type,b.entity_id,b.connection_id);return json({ok:true})}],
 'POST /api/subscriptions/remove':[requireAuth(),async(ctx:any)=>{const b=(ctx.body||{}) as Record<string,string>;if(!b.entity_type||!b.entity_id||!b.connection_id)return error('subscription fields required',400);await remove(ctx.user!.userId,b.entity_type,b.entity_id,b.connection_id);return json({ok:true})}],
}}
