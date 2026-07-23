import type {ReactNode} from 'react';
import {Save,X} from 'lucide-react';
import {RuleDraft,RuleEditor as LegacyRuleEditor} from './PricingExtras';

type Props={draft:RuleDraft;role:string;onChange:(draft:RuleDraft)=>void;onClose:()=>void;onSave:()=>void};
const money=(value:number)=>Math.round(value).toLocaleString('tr-TR')+' TL';

export default function NoteRuleEditor(props:Props){
  const {draft,role,onChange,onClose,onSave}=props;
  if(draft.type==='card')return <LegacyRuleEditor {...props}/>;
  const mode=draft.noteMode||'TOTAL_RATE';
  const timing=draft.firstInstallmentTiming||'AFTER_30_DAYS';
  const downPayment=Math.min(Math.max(0,draft.minimumDownPayment||0),Math.max(0,draft.simulationBase));
  const principal=Math.max(0,draft.simulationBase-downPayment);
  const rate=Math.max(0,draft.noteRate||0)/100;
  const count=Math.max(1,draft.noteInstallment||1);
  const financed=mode==='CASH'?principal:mode==='TOTAL_RATE'?principal*(1+rate):mode==='MONTHLY_SIMPLE'?principal*(1+rate*count):mode==='MONTHLY_COMPOUND'?principal*Math.pow(1+rate,count):Math.max(0,(draft.fixedTotal||0)-downPayment);
  const difference=Math.max(0,financed-principal);
  const total=downPayment+financed;
  const installment=Math.floor(financed/count);
  const lastInstallment=Math.round(financed-installment*(count-1));
  const timingLabel=timing==='REGISTRATION'?'Kayıt tarihinde':timing==='CUSTOM_DATE'?(draft.firstInstallmentDate||'Tarih seçilmedi'):'30 gün sonra';
  const set=<K extends keyof RuleDraft>(key:K,value:RuleDraft[K])=>onChange({...draft,[key]:value});
  const modeLabel=mode==='CASH'?'Peşin fiyatına':mode==='TOTAL_RATE'?'Toplam vade farkı':mode==='MONTHLY_SIMPLE'?'Aylık basit vade farkı':mode==='MONTHLY_COMPOUND'?'Aylık bileşik vade farkı':'Sabit vadeli toplam';
  return <div className='fixed inset-0 z-[130] bg-black/45 p-0 md:p-5'>
    <div className='mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden bg-[#f5f6f8] md:rounded-[28px]'>
      <header className='flex items-center justify-between border-b bg-white p-5'><div><p className='text-[10px] uppercase tracking-[.14em] text-black/35'>Senetli ödeme kuralı</p><h2 className='text-[21px] font-semibold'>{draft.id?'Senet Kuralını Düzenle':'Yeni Senet Kuralı'}</h2></div><button onClick={onClose} aria-label='Kapat'><X size={20}/></button></header>
      <div className='grid flex-1 overflow-hidden lg:grid-cols-[1fr_360px]'>
        <main className='overflow-y-auto p-5'>
          <section className='grid gap-3 rounded-[20px] border bg-sky-50/55 p-4 sm:grid-cols-2'>
            <Field label='Kayıt Adı *'><input value={draft.name} onChange={e=>set('name',e.target.value)} className='input'/></Field>
            <Field label='Şube'><select disabled={role!=='Kurucu'} value={role==='Kurucu'?draft.branch:'İzmit'} onChange={e=>set('branch',e.target.value)} className='input'><option>Tüm Şubeler</option><option>İzmit</option><option>Körfez</option></select></Field>
            <Field label='Başlangıç *'><input type='date' value={draft.start} onChange={e=>set('start',e.target.value)} className='input'/></Field>
            <Field label='Bitiş *'><input type='date' value={draft.end} onChange={e=>set('end',e.target.value)} className='input'/></Field>
          </section>
          <section className='mt-4 grid gap-3 rounded-[20px] border bg-amber-50/60 p-4 sm:grid-cols-2'>
            <Field label='Simülasyon Baz Tutarı'><input type='number' min='0' value={draft.simulationBase} onChange={e=>set('simulationBase',Number(e.target.value))} className='input'/></Field>
            <Field label='Taksit Sayısı'><select value={count} onChange={e=>set('noteInstallment',Number(e.target.value))} className='input'>{Array.from({length:12},(_,i)=><option key={i+1}>{i+1}</option>)}</select></Field>
            <Field label='Hesaplama Biçimi'><select value={mode} onChange={e=>set('noteMode',e.target.value as RuleDraft['noteMode'])} className='input'><option value='CASH'>Peşin fiyatına</option><option value='TOTAL_RATE'>Toplam vade farkı (%)</option><option value='MONTHLY_SIMPLE'>Aylık basit vade farkı (%)</option><option value='MONTHLY_COMPOUND'>Aylık bileşik vade farkı (%)</option><option value='FIXED'>Sabit vadeli toplam</option></select></Field>
            {mode!=='CASH'&&mode!=='FIXED'?<Field label={mode==='TOTAL_RATE'?'Toplam Vade Farkı (%)':'Aylık Vade Farkı (%)'}><input type='number' min='0' step='0.01' value={draft.noteRate} onChange={e=>set('noteRate',Number(e.target.value))} className='input'/></Field>:mode==='FIXED'?<Field label='Vadeli Satış Toplamı'><input type='number' min='0' value={draft.fixedTotal} onChange={e=>set('fixedTotal',Number(e.target.value))} className='input'/></Field>:<div/>}
            <Field label='Minimum Peşinat'><input type='number' min='0' max={draft.simulationBase} value={draft.minimumDownPayment} onChange={e=>set('minimumDownPayment',Number(e.target.value))} className='input'/></Field>
            <Field label='İlk Taksit Zamanı'><select value={timing} onChange={e=>set('firstInstallmentTiming',e.target.value as RuleDraft['firstInstallmentTiming'])} className='input'><option value='REGISTRATION'>Kayıt tarihinde</option><option value='AFTER_30_DAYS'>30 gün sonra</option><option value='CUSTOM_DATE'>Özel tarih</option></select></Field>
            {timing==='CUSTOM_DATE'&&<Field label='İlk Taksit Tarihi *'><input type='date' value={draft.firstInstallmentDate||''} onChange={e=>set('firstInstallmentDate',e.target.value)} className='input'/></Field>}
            <div className='col-span-full rounded-xl border bg-white p-3 text-[10px] text-black/55'>{mode==='CASH'?'Vade farkı uygulanmaz; peşinat sonrası kalan tutar taksitlere bölünür.':mode==='TOTAL_RATE'?'Girilen toplam vade farkı peşinat düşüldükten sonra kalan borca bir defa uygulanır.':mode==='FIXED'?'Öğrencinin ödeyeceği nihai vadeli toplam doğrudan belirlenir.':'Aylık yöntem gelişmiş hesaplama olarak peşinat sonrası kalan borca uygulanır.'}</div>
          </section>
          <label className='mt-4 flex items-center justify-between rounded-xl border bg-white p-4 text-[11px]'>Aktif olarak kullan<input type='checkbox' checked={draft.active} onChange={e=>set('active',e.target.checked)}/></label>
        </main>
        <aside className='overflow-y-auto border-l bg-white p-5'><p className='text-[10px] font-bold uppercase tracking-[.14em] text-black/35'>Canlı Senet Simülasyonu</p><div className='mt-4 rounded-[22px] bg-[#17191c] p-5 text-white'><h3 className='text-[17px] font-semibold'>{draft.name||'Yeni Senet Kuralı'}</h3><p className='mt-1 text-[11px] text-white/45'>{modeLabel}</p></div><div className='mt-4 rounded-[18px] bg-amber-50 p-4 text-[11px]'><Row label='Peşin fiyat' value={money(draft.simulationBase)}/><Row label='Peşinat' value={money(downPayment)}/><Row label='Finanse edilen tutar' value={money(principal)}/><Row label='Vade farkı' value={(rate*100).toLocaleString('tr-TR')+'% · '+money(difference)}/><Row label='Vadeli toplam' value={money(total)} strong/><Row label='Ödeme dağılımı' value={count===1?money(lastInstallment):`${count-1} × ${money(installment)} + son ${money(lastInstallment)}`}/><Row label='İlk taksit' value={timingLabel}/></div><p className='mt-3 text-[9px] text-black/40'>Kuruş ve yuvarlama farkı otomatik olarak son taksite eklenir.</p></aside>
      </div>
      <footer className='flex justify-between border-t bg-white p-4'><button onClick={onClose} className='rounded-xl border px-4 py-2.5 text-[11px]'>İptal</button><button onClick={onSave} className='rounded-xl bg-black px-5 py-2.5 text-[11px] text-white'><Save size={13} className='mr-2 inline'/>Senet Kuralını Kaydet</button></footer>
    </div>
  </div>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className='text-[11px] font-semibold'>{label}{children}</label>}
function Row({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className='flex justify-between gap-3 border-b border-black/5 py-2 last:border-0'><span>{label}</span><b className={'text-right '+(strong?'text-[13px]':'')}>{value}</b></div>}

