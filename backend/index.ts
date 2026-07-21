import {db,error,json,router} from '@appdeploy/sdk';
import {notifySubscribers,realtimeSubscriptionRoutes} from './realtime-subscribers';

const TABLE='umay_data';
type DataRecord={id:string;key:string;value:unknown;updatedAt:number};

async function findRecord(key:string):Promise<DataRecord|null>{
 const {items}=await db.list(TABLE,{limit:1000});
 const matches=(items as DataRecord[]).filter(item=>item.key===key).sort((a,b)=>b.updatedAt-a.updatedAt);
 return matches[0]||null;
}

export const handler=router({
 'GET /api/_healthcheck':[async()=>json({message:'Success'})],
 'GET /api/data/export':[async()=>{const {items}=await db.list(TABLE,{limit:1000});return json({schemaVersion:1,exportedAt:new Date().toISOString(),records:(items as DataRecord[]).map(({key,value,updatedAt})=>({key,value,updatedAt}))})}],
 'GET /api/data/:key':[async(ctx)=>{const record=await findRecord(ctx.params.key);return json(record?{found:true,value:record.value,updatedAt:record.updatedAt}:{found:false})}],
 'PUT /api/data/:key':[async(ctx)=>{const body=(ctx.body||{}) as {value?:unknown;connection_id?:string};if(!Object.prototype.hasOwnProperty.call(body,'value'))return error('value is required',400);const current=await findRecord(ctx.params.key),updatedAt=Date.now();if(current){const [ok]=await db.update(TABLE,[{id:current.id,record:{key:ctx.params.key,value:body.value,updatedAt}}]);if(!ok)return error('Data could not be updated',500)}else{const [id]=await db.add(TABLE,[{key:ctx.params.key,value:body.value,updatedAt}]);if(!id)return error('Data could not be created',500)}const payload={key:ctx.params.key,value:body.value,updatedAt};await notifySubscribers('umay_data',ctx.params.key,payload,body.connection_id);return json(payload)}],
 ...realtimeSubscriptionRoutes,
});
