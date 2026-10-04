(function(){
'use strict';
const root=document.getElementById('gi-map-module');let lang='th',queued=false;
const pairs=[
['เปรียบเทียบจาก Average ตารางหลัก','Comparison using table Average'],
['ตารางนี้ใช้ Average ตามตารางหลัก ส่วนสถานะบนแผนที่ใช้วิธีเดิม','This table uses the main table Average. Map statuses retain the original method.'],
['ค่าอ้างอิง','Reference'],['ความคลาดเคลื่อนจาก Average','Difference from Average'],['ความคลาดเคลื่อนเดิม','Original difference'],
['ข้อมูลไม่เพียงพอ หรือค่าอ้างอิงเป็นศูนย์','Insufficient data or zero reference'],
["เกณฑ์สถานะหมายถึงอะไร?","What do the status thresholds mean?"],
["เปรียบเทียบค่าแสงกับโครงการใกล้เคียง ไม่ใช่ช่วง Normal range ที่ใช้คัดวันในตาราง","Compares GI against nearby projects, not the Normal range used to select valid table days."],
["ปกติ (สีเขียว)","Normal (green)"],
["เฝ้าระวัง (สีส้ม)","Watch (orange)"],
["ผิดปกติ (สีแดง)","Abnormal (red)"],
["ค่าติดลบหมายถึงแสงต่ำกว่าค่าอ้างอิง ค่าบวกหมายถึงสูงกว่า ระบบนี้แจ้งเตือนด้านค่าต่ำเท่านั้น ค่าสูงยังต้องตรวจความสมเหตุสมผลของเซนเซอร์","Negative means GI is below the reference; positive means above. These statuses flag low GI only. High readings still require a sensor plausibility check."],
["ตัวอย่าง: ค่าอ้างอิง 4 และ GI โครงการ 3.6 จะต่าง −10% แล้วใช้เกณฑ์ด้านบนตัดสินสถานะ","Example: reference GI 4 and project GI 3.6 give −10%. Apply the thresholds above to determine the status."],
["สีเทาหมายถึงข้อมูลไม่พอสำหรับเปรียบเทียบ ไม่ได้แปลว่าค่าแสงผิดปกติ เกณฑ์สีเปลี่ยนตามค่าที่กำหนดในตั้งค่า","Grey means insufficient comparison data, not abnormal irradiance. Colour thresholds follow the current settings."],
["วิธีเปรียบเทียบทำงานอย่างไร?","How does comparison work?"],
["— ใช้ค่ากลาง ลดผลกระทบจากค่าแสงที่สูงหรือต่ำผิดปกติ เหมาะเป็นค่าเริ่มต้น เช่น 3, 4, 8 → 4","— Uses the middle value and limits the influence of unusually high or low readings. Recommended default. Example: 3, 4, 8 → 4"],
["— รวมค่าแสงแล้วหารจำนวนจุด ทุกจุดมีน้ำหนักเท่ากัน แต่ไวต่อค่าผิดปกติ เช่น 3, 4, 8 → 5","— Adds readings and divides by the number of sites. Equal weight per site, but sensitive to outliers. Example: 3, 4, 8 → 5"],
["เลือกจุดในรัศมีที่กำหนด พิกัดซ้ำรวมเป็นจุดเดียว และไม่นับพิกัดเดียวกับโครงการที่เลือก ต้องมีข้อมูลวันเดียวกันครบจำนวนจุดขั้นต่ำ","Uses sites within the selected radius. Duplicate coordinates count as one site; the selected site is excluded. The minimum site count must have readings on the same day."],
["ความต่าง (%) = (GI โครงการ ÷ GI อ้างอิง − 1) × 100 ใช้เฉพาะวันที่เปรียบเทียบได้ หากข้อมูลไม่พอจะแสดง “เปรียบเทียบไม่ได้” ไม่ใช่ “ผิดปกติ”","Difference (%) = (project GI ÷ reference GI − 1) × 100, using comparable days only. Insufficient data means “No Comparison”, not “Abnormal”."],
["ค่า GI บนหมุดใช้ Average ตามตาราง ส่วนสถานะเทียบพื้นที่ใกล้เคียงใช้ข้อมูลเฉพาะวันที่เปรียบเทียบได้ จึงอาจใช้จำนวนวันต่างกัน","Marker GI follows the table Average. Nearby status uses comparable days only, so the day counts may differ."],
["Median ลดผลจากค่าผิดปกติ · Mean ให้น้ำหนักทุกจุดเท่ากัน","Median limits outlier influence · Mean gives equal weight to each site"],
['แสดงค่า GI ทั้งหมด','Show all GI values'],['โครงการในกลุ่ม','Projects in this group'],
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
const provinceTH=['ไม่ระบุ','กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'],provinceEN=['Not specified','Bangkok','Krabi','Kanchanaburi','Kalasin','Kamphaeng Phet','Khon Kaen','Chanthaburi','Chachoengsao','Chon Buri','Chai Nat','Chaiyaphum','Chumphon','Chiang Rai','Chiang Mai','Trang','Trat','Tak','Nakhon Nayok','Nakhon Pathom','Nakhon Phanom','Nakhon Ratchasima','Nakhon Si Thammarat','Nakhon Sawan','Nonthaburi','Narathiwat','Nan','Bueng Kan','Buri Ram','Pathum Thani','Prachuap Khiri Khan','Prachin Buri','Pattani','Phra Nakhon Si Ayutthaya','Phayao','Phang Nga','Phatthalung','Phichit','Phitsanulok','Phetchaburi','Phetchabun','Phrae','Phuket','Maha Sarakham','Mukdahan','Mae Hong Son','Yasothon','Yala','Roi Et','Ranong','Rayong','Ratchaburi','Lop Buri','Lampang','Lamphun','Loei','Si Sa Ket','Sakon Nakhon','Songkhla','Satun','Samut Prakan','Samut Songkhram','Samut Sakhon','Sa Kaeo','Saraburi','Sing Buri','Sukhothai','Suphan Buri','Surat Thani','Surin','Nong Khai','Nong Bua Lam Phu','Ang Thong','Amnat Charoen','Udon Thani','Uttaradit','Uthai Thani','Ubon Ratchathani'];
provinceTH.forEach((name,i)=>{dictionary.set(name,[name,provinceEN[i]]);dictionary.set(provinceEN[i],[name,provinceEN[i]])});
const thMonths=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],enMonths=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
thMonths.forEach((m,i)=>{dictionary.set(m,[m,enMonths[i]]);dictionary.set(enMonths[i],[m,enMonths[i]])});
const fullTH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],fullEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function translate(value){const trimmed=value.trim(),pair=dictionary.get(trimmed);if(pair)return value.replace(trimmed,pair[lang==='en'?1:0]);
 const counted=trimmed.match(/^(.*?) (\(\d+\))$/);if(counted){const pair=dictionary.get(counted[1]);if(pair)return (lang==='en'?pair[1]:pair[0])+' '+counted[2];}
 let out=value;fullTH.forEach((m,i)=>{out=out.replace(lang==='en'?m:fullEN[i],lang==='en'?fullEN[i]:m)});
 const count=out.match(/^(\d+) (projects|โครงการ)$/);if(count)out=count[1]+' '+(lang==='en'?'projects':'โครงการ');return out;
}
function apply(){queued=false;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){if(node.parentElement.closest('script,style,[data-map-language],.gimap-marker-label b,.gimap-peer b,.gimap-location-row b,.gimap-detail h3,.gimap-hover-card h4,[data-cluster-project] span'))continue;const value=translate(node.nodeValue);if(value!==node.nodeValue)node.nodeValue=value}
 root.querySelectorAll('input[placeholder]').forEach(input=>{const value=translate(input.placeholder);if(value!==input.placeholder)input.placeholder=value});
 document.documentElement.lang=lang;const label=lang==='th'?'TH / EN':'EN / TH';if(button.textContent!==label)button.textContent=label;button.setAttribute('aria-label',lang==='th'?'เปลี่ยนเป็นภาษาอังกฤษ':'Switch to Thai');
}
const button=document.createElement('button');button.className='gimap-btn';button.dataset.mapLanguage='';button.onclick=()=>{lang=lang==='th'?'en':'th';apply()};root.querySelector('.gimap-view-controls').append(button);
const observer=new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(apply)}});observer.observe(root,{childList:true,subtree:true,characterData:true});apply();
addEventListener('pagehide',()=>observer.disconnect(),{once:true});
window.GIMapLanguage={destroy:()=>observer.disconnect(),set(value){lang=value==='en'?'en':'th';apply()},get:()=>lang};
})();

