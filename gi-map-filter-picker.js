(function(){
'use strict';
const root=document.getElementById('gi-map-module');if(!root)return;
const style=document.createElement('style');style.textContent=`
#gi-map-module .gimap-picker-button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:var(--card,#fff);color:var(--text);font:600 12px 'Bai Jamjuree',sans-serif;text-align:left;cursor:pointer}
#gi-map-module .gimap-picker-button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#gi-map-module .gimap-picker-button:hover{border-color:#709bbf;background:#edf4fa}
#gi-map-module .gimap-picker-overlay{position:absolute;inset:0;z-index:3200;background:#172c4266;display:flex;align-items:center;justify-content:center;padding:20px}
#gi-map-module .gimap-picker-dialog{width:min(440px,100%);max-height:calc(100% - 40px);display:flex;flex-direction:column;background:#fff;color:#172a3a;border:1px solid #d9e3ec;border-radius:20px;box-shadow:0 24px 70px #14283d40;padding:18px;gap:14px}
#gi-map-module .gimap-picker-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:16px;font-weight:700}
#gi-map-module .gimap-picker-close{border:1px solid #d9e3ec;border-radius:10px;background:#f5f8fb;color:#172a3a;padding:5px 10px;font:inherit;cursor:pointer}
#gi-map-module .gimap-picker-search{width:100%;padding:11px 12px;border:1px solid #d9e3ec;border-radius:12px;background:#f5f8fb;color:#172a3a;font:600 13px 'Bai Jamjuree',sans-serif}
#gi-map-module .gimap-picker-options{overflow:auto;min-height:0;max-height:50vh;display:flex;flex-direction:column;gap:5px;scrollbar-width:thin}
#gi-map-module .gimap-picker-option{display:flex;justify-content:space-between;gap:12px;border:1px solid transparent;border-radius:10px;padding:10px 12px;background:#fff;color:#253b4c;text-align:left;font:600 13px 'Bai Jamjuree',sans-serif;cursor:pointer}
#gi-map-module .gimap-picker-option:hover{background:#f0f5fa}
#gi-map-module .gimap-picker-option[aria-selected=true]{background:#e8f1fa;border-color:#9cbbd7;color:#21577f}
`;root.append(style);
let overlay=null,trigger=null;
const en=()=>window.GIMapLanguage?.get()==='en';
function close(){overlay?.remove();overlay=null;trigger?.setAttribute('aria-expanded','false');trigger?.focus();}
function open(select,button,kind){
 close();trigger=button;button.setAttribute('aria-expanded','true');
 overlay=document.createElement('div');overlay.className='gimap-picker-overlay';
 const dialog=document.createElement('section');dialog.className='gimap-picker-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',en()?(kind==='province'?'Select province':'Select project'):(kind==='province'?'เลือกจังหวัด':'เลือกโครงการ'));
 const head=document.createElement('div');head.className='gimap-picker-head';const title=document.createElement('span');title.textContent=dialog.getAttribute('aria-label');const cancel=document.createElement('button');cancel.className='gimap-picker-close';cancel.type='button';cancel.textContent='×';cancel.setAttribute('aria-label',en()?'Close':'ปิด');cancel.onclick=close;head.append(title,cancel);
 const search=document.createElement('input');search.className='gimap-picker-search';search.type='search';search.placeholder=en()?'Search…':'ค้นหา…';search.setAttribute('aria-label',search.placeholder);
 const list=document.createElement('div');list.className='gimap-picker-options';list.setAttribute('role','listbox');
 function render(){list.replaceChildren();const query=search.value.trim().toLocaleLowerCase();for(const option of select.options){if(query&&!option.textContent.toLocaleLowerCase().includes(query))continue;const row=document.createElement('button');row.type='button';row.className='gimap-picker-option';row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.value===select.value));const label=document.createElement('span');label.textContent=option.textContent;const check=document.createElement('span');check.textContent=option.value===select.value?'✓':'';row.append(label,check);row.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));close();};list.append(row);}if(!list.children.length){const empty=document.createElement('p');empty.textContent=en()?'No matches':'ไม่พบรายการ';list.append(empty);}}
 search.oninput=render;dialog.append(head,search,list);overlay.append(dialog);overlay.onclick=e=>{if(e.target===overlay)close();};overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){const nodes=[...dialog.querySelectorAll('button,input')],first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};root.append(overlay);render();search.focus();
}
for(const kind of ['province','project']){const select=root.querySelector('[data-role="'+kind+'"]');if(!select)continue;select.hidden=true;select.style.display='none';const button=document.createElement('button');button.type='button';button.className='gimap-picker-button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.dataset.picker=kind;const label=document.createElement('span'),arrow=document.createElement('span');arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');button.append(label,arrow);select.after(button);function sync(){const value=select.selectedOptions[0]?.textContent||'';if(label.textContent!==value)label.textContent=value;}button.onclick=()=>open(select,button,kind);select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{childList:true,subtree:true,characterData:true});sync();}
})();
