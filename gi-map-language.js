(function(){
'use strict';
const root=document.getElementById('gi-map-module');let lang='th',queued=false;
const pairs=[
['แผนที่ค่าแสง','Global Irradiance Map'],['ภาพรวมประสิทธิภาพโซลาร์ประเทศไทย','Thailand Solar Performance View'],
['← กลับ Global Irradiance Analysis','← Back to Global Irradiance Analysis'],
['ค้นหาและกรองข้อมูล','Search & filters'],['ค้นหาชื่อโครงการ...','Search project name...'],['ค้นหาโครงการ','Search projects'],
['จังหวัด','Province'],['โครงการ','Project'],['ทุกจังหวัด','All provinces'],['ทุกโครงการ','All projects'],['ภูมิภาค','Region'],
['ทั้งหมด','All'],['เหนือ','North'],['อีสาน','Northeast'],['กลาง','Central'],['ตะวันออก','East'],['ตะวันตก','West'],['ใต้','South'],
['เปรียบเทียบโครงการใกล้เคียง','Nearby Comparison'],['รัศมี','Radius'],['วิธีเปรียบเทียบ','Method'],['จำนวนโครงการขั้นต่ำ','Minimum Nearby'],
['มัธยฐาน','Median'],['ค่าเฉลี่ย','Mean'],['⚙ ตั้งค่า','⚙ Customize'],['ล้างการเลือก','Clear'],
['คลิกโครงการบนแผนที่เพื่อดูวงรัศมีและโครงการที่ถูกนำมาเปรียบเทียบ','Click a project to view its radius and comparison projects'],
['สถานะเทียบพื้นที่ใกล้เคียง','Nearby comparison status'],['ปกติ','Normal'],['เฝ้าระวัง','Watch'],['ผิดปกติ','Abnormal'],['เปรียบเทียบไม่ได้','No Comparison'],['ไม่มีข้อมูล','No Data'],
['GI เฉลี่ยที่แสดง','Average visible GI'],['เปรียบเทียบได้','Compared'],['ช่วงเวลาที่เลือก','SELECTED PERIOD'],
['ไม่พบโครงการ','No projects found'],['ไม่มีข้อมูลตรงกับตัวกรองปัจจุบัน','No data matches the current filters'],['ล้างตัวกรอง','Clear Filters'],
['ค่าแสงรายเดือน','Monthly Irradiance Timeline'],['ปี','Year'],['มีข้อมูล','Complete data'],['มีบางโครงการไม่มีข้อมูล','Partial project coverage'],
['ตั้งค่าการเปรียบเทียบพื้นที่ใกล้เคียง','Nearby Comparison Settings'],['แก้ค่าแล้วกด Apply','Change settings, then apply'],
['รัศมีเปรียบเทียบ (กม.)','Comparison Radius (km)'],['จำนวนโครงการใกล้เคียงขั้นต่ำ','Minimum Nearby Projects'],['เกณฑ์ปกติ (%)','Normal Threshold (%)'],['ผิดปกติต่ำกว่า (%)','Abnormal Below (%)'],['วิธีเปรียบเทียบ','Comparison Method'],
['นำไปใช้','Apply'],['ยกเลิก','Cancel'],['คืนค่าเริ่มต้น','Reset Default'],['รายละเอียดโครงการ','PROJECT DETAIL'],['GI โครงการ','Project GI'],['มัธยฐานพื้นที่ใกล้เคียง','Nearby Median'],['ค่าเฉลี่ยพื้นที่ใกล้เคียง','Nearby Mean'],['ความต่าง','Difference'],['กำลังติดตั้ง','Capacity'],
['พิกัดโครงการ','Project coordinates'],['ไม่มีพิกัด / จัดการพิกัด','Missing / manage coordinates'],['ปิด ×','Close ×'],['← รายการ','← List'],['ดู / แก้ไข','View / edit'],['เพิ่มพิกัด','Add coordinates'],['บันทึกพิกัด','Save coordinates'],
['เฉพาะโครงการไม่มี Lat/Long','Only projects without Lat/Long'],['ไม่พบโครงการตามตัวกรอง','No projects match the filters'],['Admin เท่านั้นที่เพิ่ม/แก้ไขพิกัดได้','Only admins can add or edit coordinates'],
['ไม่มีพิกัดยังคงอยู่ในรายการ · การบันทึกใช้สิทธิ์ Admin','Projects without coordinates remain listed · Admin access required to save'],
['หนึ่งบรรทัดต่อจุด: Latitude, Longitude · จุดแรกเป็นหมุดหลัก · แสดงทุกจุดเมื่อเลือกโครงการ','One point per line: Latitude, Longitude · First point is primary · All points appear when selected'],
['กำลังบันทึก…','Saving…'],['GI เป็นค่าร่วมทั้งโครงการ','GI is shared across this project'],
['ซ่อนตัวกรอง','Hide filters'],['แสดงตัวกรอง','Show filters'],['ซ่อนสรุป','Hide summary'],['แสดงสรุป','Show summary'],['ซ่อนเดือน','Hide months'],['แสดงเดือน','Show months'],
['สูง','High'],['ปานกลาง','Medium'],['ไม่เพียงพอ','Insufficient']
];
const dictionary=new Map();pairs.forEach(pair=>pair.forEach(s=>dictionary.set(s,pair)));
const thMonths=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],enMonths=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
thMonths.forEach((m,i)=>{dictionary.set(m,[m,enMonths[i]]);dictionary.set(enMonths[i],[m,enMonths[i]])});
const fullTH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],fullEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function translate(value){const trimmed=value.trim(),pair=dictionary.get(trimmed);if(pair)return value.replace(trimmed,pair[lang==='en'?1:0]);
 let out=value;fullTH.forEach((m,i)=>{out=out.replace(lang==='en'?m:fullEN[i],lang==='en'?fullEN[i]:m)});
 const count=out.match(/^(\d+) (projects|โครงการ)$/);if(count)out=count[1]+' '+(lang==='en'?'projects':'โครงการ');return out;
}
function apply(){queued=false;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){if(node.parentElement.closest('script,style,[data-map-language],.gimap-marker-label b,.gimap-peer b,.gimap-location-row b,.gimap-detail h3,.gimap-hover-card h4'))continue;const value=translate(node.nodeValue);if(value!==node.nodeValue)node.nodeValue=value}
 root.querySelectorAll('input[placeholder]').forEach(input=>{const value=translate(input.placeholder);if(value!==input.placeholder)input.placeholder=value});
 document.documentElement.lang=lang;const label=lang==='th'?'TH / EN':'EN / TH';if(button.textContent!==label)button.textContent=label;button.setAttribute('aria-label',lang==='th'?'เปลี่ยนเป็นภาษาอังกฤษ':'Switch to Thai');
}
const button=document.createElement('button');button.className='gimap-btn';button.dataset.mapLanguage='';button.onclick=()=>{lang=lang==='th'?'en':'th';apply()};root.querySelector('.gimap-view-controls').append(button);
const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(apply)}});observer.observe(root,{childList:true,subtree:true,characterData:true});apply();
addEventListener('pagehide',()=>observer.disconnect(),{once:true});
window.GIMapLanguage={destroy:()=>observer.disconnect(),set(value){lang=value==='en'?'en':'th';apply()},get:()=>lang};
})();
