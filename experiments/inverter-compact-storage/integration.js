// Isolated preview only. Existing import, calculations and .iaw save stay active.
async function compactPreviewEnvelope(){
 const chunks=[];
 for(let i=0;i<state.daily.length;i+=25000){chunks.push(InverterCompact.packDaily(state.daily.slice(i,i+25000)));await browserYield(0);}
 const {daily,...metadata}=state;
 return {format:'InverterCompactPreview',version:1,metadata,chunks};
}
async function compactPreviewRestore(envelope){
 if(envelope?.format!=='InverterCompactPreview'||envelope.version!==1||!Array.isArray(envelope.chunks)||!envelope.metadata||!Array.isArray(envelope.metadata.monthly))throw Error('Invalid compact test file');
 // Decode completely before replacing current data: invalid files leave state untouched.
 const daily=[];
 for(const chunk of envelope.chunks){const decoded=InverterCompact.unpackDaily(chunk);for(const r of decoded)daily.push(r);await browserYield(0);}
 const restored={...envelope.metadata,daily};
 state=restored;clearDailyUiState();clearMonthlyUiState();await recalcDailyQueued();setupDailySelection(true);renderAll();
 return daily.length;
}
async function saveCompactPreview(){
 const button=$('compactPreviewSave');button.disabled=true;
 try{const envelope=await compactPreviewEnvelope();const zip=new JSZip();zip.file('compact.json',JSON.stringify(envelope));const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Inverter_Compact_Test_'+new Date().toISOString().slice(0,10)+'.iactest';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast(tr('Compact test file saved; keep the original .iaw backup.','บันทึกไฟล์ทดลองแล้ว กรุณาเก็บไฟล์ .iaw เดิมไว้ด้วย'));}
 catch(e){alert(e.message);}finally{button.disabled=false;}
}
async function openCompactPreview(file){
 const zip=await JSZip.loadAsync(file),entry=zip.file('compact.json');if(!entry)throw Error('compact.json missing');
 return compactPreviewRestore(JSON.parse(await entry.async('string')));
}
window.InverterCompactPreview={pack:compactPreviewEnvelope,restore:compactPreviewRestore,open:openCompactPreview};
{
 const save=document.createElement('button');save.id='compactPreviewSave';save.type='button';save.textContent='Compact Test · Save';save.title='Experimental storage adapter; no database connection';save.onclick=saveCompactPreview;
 const open=document.createElement('button');open.type='button';open.textContent='Compact Test · Open';
 const input=document.createElement('input');input.type='file';input.accept='.iactest';input.hidden=true;open.onclick=()=>input.click();input.onchange=async()=>{try{if(input.files[0]){await openCompactPreview(input.files[0]);toast(tr('Compact test file opened','เปิดไฟล์ทดลองแล้ว'));}}catch(e){alert(e.message);}finally{input.value='';}};
 $('sideSave').after(save,open,input);
 const banner=document.createElement('div');banner.className='card-sub';banner.style.cssText='padding:6px 12px;font-weight:600';banner.textContent='COMPACT STORAGE TEST v1 · ข้อมูลยังไม่เชื่อมฐานข้อมูล';document.querySelector('.topbar').after(banner);
}
