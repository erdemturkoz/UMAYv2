import {useEffect,useRef,useState} from 'react';
import {api,ws} from '@appdeploy/client';

export type UmaySetter<T>=(value:T|((current:T)=>T))=>void;
function readLocal<T>(localKey:string,seed:T):T{try{const raw=localStorage.getItem(localKey);return raw?JSON.parse(raw):seed}catch{return seed}}

export function useUmayCollection<T>(serverKey:string,localKey:string,seed:T):[T,UmaySetter<T>]{
 const[state,setState]=useState<T>(()=>readLocal(localKey,seed)),loaded=useRef(false),connectionId=useRef<string|null>(null),suppressSave=useRef(false);
 useEffect(()=>{let active=true;const conn=ws.connect();conn.onMessage(message=>{const p=message?.payload;if(p?.entity_type==='umay_data'&&p?.entity_id===serverKey&&active){suppressSave.current=true;setState(p.data.value as T);try{localStorage.setItem(localKey,JSON.stringify(p.data.value))}catch{}}});conn.ready.then(async()=>{if(!active)return;connectionId.current=conn.connectionId;if(conn.connectionId)await api.post('/api/subscriptions',{entity_type:'umay_data',entity_id:serverKey,connection_id:conn.connectionId})}).catch(()=>{});api.get('/api/data/'+encodeURIComponent(serverKey)).then(async response=>{if(!active)return;if(response.data.found){suppressSave.current=true;setState(response.data.value as T);try{localStorage.setItem(localKey,JSON.stringify(response.data.value))}catch{}}else{await api.put('/api/data/'+encodeURIComponent(serverKey),{value:readLocal(localKey,seed),connection_id:connectionId.current})}loaded.current=true}).catch(()=>{loaded.current=true});return()=>{active=false;if(connectionId.current)api.post('/api/subscriptions/remove',{entity_type:'umay_data',entity_id:serverKey,connection_id:connectionId.current}).catch(()=>{});conn.disconnect()}},[serverKey,localKey]);
 useEffect(()=>{try{localStorage.setItem(localKey,JSON.stringify(state))}catch{}if(!loaded.current)return;if(suppressSave.current){suppressSave.current=false;return}const timer=setTimeout(()=>api.put('/api/data/'+encodeURIComponent(serverKey),{value:state,connection_id:connectionId.current}).catch(()=>{}),250);return()=>clearTimeout(timer)},[serverKey,localKey,state]);
 return[state,setState];
}

export async function downloadUmayData(){const response=await api.get('/api/data/export'),blob=new Blob([JSON.stringify(response.data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='UMAYv2-veri-yedegi-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url)}

