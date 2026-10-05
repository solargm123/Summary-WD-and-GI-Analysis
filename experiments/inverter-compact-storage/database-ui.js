// Preview-only connection. No automatic data upload or replacement on page load.
let inverterDb=null,inverterDbRole=null,inverterDbBusy=false;
async function inverterLoadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Cannot load '+src));document.head.append(s);});}
async function inverterConnectDb(){
 if(location.protocol==='file:')throw Error('เปิดหน้าทดลองออนไลน์เพื่อใช้การเข้าสู่ระบบเดิม / Open the online preview to use Main Center sign-in.');
 if(!window.supabase)await inverterLoadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js');
 if(!window.SolarCloud)await inverterLoadScript(new URL('cloud-core.js',location.href).href);
 const session=await SolarCloud.session();if(!session)throw Error('กรุณาเข้าสู่ระบบที่ Main Center ก่อน แล้วเปิดหน้าทดลองอีกครั้ง');
 const membership=await SolarCloud.membership();inverterDbRole=membership.role;inverterDb=InverterDatabase.create(SolarCloud.getClient(),membership.workspace_id,InverterCompact);
 $('inverterDbStatus').textContent='Connected · '+membership.role;
 $('inverterDbSave').disabled=!['admin','editor'].includes(membership.role);$('inverterDbLoad').disabled=false;
 return inverterDb;
}
async function inverterDbRun(action){
 if(inverterDbBusy)return;inverterDbBusy=true;const buttons=['inverterDbConnect','inverterDbSave','inverterDbLoad'].map($);buttons.forEach(b=>b.disabled=true);
 try{
  const db=inverterDb||await inverterConnectDb();
  if(action==='save'){
   if(!state.daily.length)throw Error('กรุณาเปิดไฟล์ .iaw หรือ Import Report ก่อน');
   if(!['admin','editor'].includes(inverterDbRole))throw Error('บัญชีนี้อ่านได้อย่างเดียว');
   if(!await SolarCloud.confirmDialog('บันทึกข้อมูลอินเวอร์เตอร์','เพิ่มเฉพาะรายการใหม่ ข้อมูลซ้ำจะข้าม หากค่าต่างกันจะหยุด ไม่แก้ข้อมูล WD/GI/PR กรุณาเก็บ .iaw สำรองไว้ด้วย',{confirmText:'บันทึก'}))return;
   const result=await db.save(state,(done,total)=>$('inverterDbStatus').textContent=`Saving ${done.toLocaleString()}/${total.toLocaleString()}`);
   $('inverterDbStatus').textContent=`Added ${result.added.toLocaleString()} · unchanged ${result.skipped.toLocaleString()}`;
  }else if(action==='load'){
   if(state.daily.length&&!await SolarCloud.confirmDialog('เปิดข้อมูลจากฐานข้อมูล','แทนที่ข้อมูลในหน้าทดลองนี้ กรุณาบันทึก .iaw หากยังมีข้อมูลที่ไม่ได้บันทึก',{confirmText:'เปิดข้อมูล'}))return;
   const loaded=await db.load(count=>$('inverterDbStatus').textContent=`Loading ${count.toLocaleString()} rows`);
   if(!loaded.daily.length)throw Error('ยังไม่มีข้อมูลอินเวอร์เตอร์ในฐานข้อมูล เปิด .iaw แล้วบันทึกจากหน้าทดลองก่อน');
   const metadata=loaded.metadata||{...state,monthly:[]};delete metadata.daily;
   const chunks=[];for(let i=0;i<loaded.daily.length;i+=25000){chunks.push(InverterCompact.packDaily(loaded.daily.slice(i,i+25000)));await browserYield(0);}
   await compactPreviewRestore({format:'InverterCompactPreview',version:1,metadata,chunks});
   $('inverterDbStatus').textContent=`Loaded ${loaded.daily.length.toLocaleString()} · รอจับคู่ ${loaded.unmatched.length} ชื่อ`;
  }
 }catch(e){$('inverterDbStatus').textContent='Error · '+e.message;alert(e.message+'\nหากบันทึกหยุดระหว่างทาง รายการที่สำเร็จแล้วจะยังอยู่และนำเข้าซ้ำได้โดยไม่เพิ่มซ้ำ');}
 finally{inverterDbBusy=false;$('inverterDbConnect').disabled=false;$('inverterDbSave').disabled=!inverterDb||!['admin','editor'].includes(inverterDbRole);$('inverterDbLoad').disabled=!inverterDb;}
}
{
 const panel=document.createElement('div');panel.className='card-sub';panel.style.cssText='padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
 panel.innerHTML='<button type="button" class="btn small" id="inverterDbConnect">Connect Solar DB</button><button type="button" class="btn small" id="inverterDbSave" disabled>Save to DB</button><button type="button" class="btn small" id="inverterDbLoad" disabled>Open from DB</button><span id="inverterDbStatus">ยังไม่เชื่อมต่อ · ไม่อัปโหลดอัตโนมัติ</span>';
 document.querySelector('.topbar').after(panel);
 $('inverterDbConnect').onclick=()=>inverterDbRun('connect');$('inverterDbSave').onclick=()=>inverterDbRun('save');$('inverterDbLoad').onclick=()=>inverterDbRun('load');
}
