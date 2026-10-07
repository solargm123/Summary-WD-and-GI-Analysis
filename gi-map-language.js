(function(){
'use strict';
const root=document.getElementById('gi-map-module');let lang='th',queued=false;
const pairs=[
['แผนที่ถนน','Street map'],['ภาพดาวเทียม','Satellite'],
['ดูการคำนวณ','Calculation details'],['ค่าจริง = Average ของโครงการที่ตรวจ','Actual = selected project Average'],['ใช้ Average ของโครงการอ้างอิง B','Uses reference project B Average'],['ไม่รวมโครงการที่กำลังตรวจ · พิกัดซ้ำรวมเป็นหนึ่งจุดโดยใช้ Median ภายในจุด','Excludes the inspected project · Duplicate coordinates form one site using its internal Median'],['ค่าเกณฑ์ที่ระบบใช้','Reference used by the system'],['ข้อมูลไม่พอ จึงยังไม่ใช้ผลคำนวณเป็นเกณฑ์','Insufficient data: the candidate result is not used as a reference'],['ตัวเลขแสดง 6 ตำแหน่ง · คำนวณด้วยค่าจริงก่อนปัดเศษ','Values shown to 6 decimals · Calculated before rounding'],['ตัวกรองตารางไม่เปลี่ยนสมาชิกที่ใช้คำนวณ','Table filters do not change calculation members'],
['กรองจาก Average · เรียงระยะทางใกล้ไปไกล','Filter by Average · Nearest first'],
['ระดับความต่าง','Difference level'],['ทิศทางความต่าง','Difference direction'],['เขียว','Green'],['ส้ม','Orange'],['แดง','Red'],['ข้อมูลไม่พอ','Insufficient data'],['สูงกว่าค่าอ้างอิง','Higher than reference'],['ต่ำกว่าค่าอ้างอิง','Lower than reference'],['กรองจาก Average · เรียงความต่างมากไปน้อย','Filter by Average · Largest difference first'],['ไม่มีโครงการตรงกับตัวกรอง','No projects match these filters'],
['โครงการอ้างอิง: ใช้ Average ของ B เทียบทุกโครงการในรัศมีของ B ไม่ใช้จำนวนจุดขั้นต่ำ','Reference project: uses B’s Average for all projects within B’s radius. Minimum nearby count does not apply.'],
["โครงการอ้างอิง", "Reference project"],
["GI โครงการอ้างอิง", "Reference project GI"],
["1 โครงการอ้างอิง", "1 reference project"],
["โครงการอ้างอิง — เทียบทุกโครงการในรัศมี", "Reference project — compare all projects within its radius"],
["เลือกโครงการอ้างอิง", "Select reference project"],
["ค้นหาโครงการอ้างอิง", "Search reference project"],
["อยู่นอกรัศมีของโครงการอ้างอิง", "Outside the reference project radius"],
["โครงการอ้างอิงไม่มีข้อมูลหรือพิกัดในช่วงที่เลือก กรุณาเลือกใหม่ในตั้งค่า", "Reference project has no data or coordinates for this period. Select another in settings."],
["โครงการอ้างอิงไม่มีข้อมูลในช่วงที่เลือก", "Reference project has no data for this period"],
["โครงการนี้เป็นค่าอ้างอิง", "This project is the reference"],
["โครงการนี้เป็นค่าอ้างอิง ไม่ประเมินเทียบกับตัวเอง", "This project is the reference; it is not evaluated against itself"],
["เทียบกับโครงการอ้างอิงที่เลือก", "Compared with the selected reference project"],
["กรุณาเลือกโครงการอ้างอิงที่มีข้อมูลและพิกัด", "Select a reference project with data and coordinates"],
["เลือก B ครั้งเดียว เทียบทุกโครงการในรัศมีของ B ไม่ใช้จำนวนจุดขั้นต่ำ และไม่เปลี่ยน B อัตโนมัติเมื่อข้อมูลหาย", "Select B once to compare all projects within B’s radius. Minimum nearby count does not apply. B is never replaced automatically when data is missing."],
['ค่าจริง = Average ของโครงการที่ตรวจ · ค่าประมาณการ = ค่าจากวิธีเปรียบเทียบที่เลือก (Median / Mean / โครงการอ้างอิง)','Actual = selected project Average · Estimate = selected comparison method (Median / Mean / Reference project)'],
['ค่าอ้างอิง Average','Average reference'],['ค่าอ้างอิงเดิม','Original GI reference'],
["ขอบเขตต่ำ (%)", "Lower boundary (%)"],
["ขอบเขตสูง (%)", "Upper boundary (%)"],
["สูงกว่า", "Higher"],
["ต่ำกว่า", "Lower"],
["เท่ากัน", "Equal"],
["ค่าเดิม", "Original GI"],
["ระยะทาง", "Distance"],
["เปอร์เซ็นต์ไม่มีเครื่องหมายบวกลบ ใช้คำว่า สูงกว่า / ต่ำกว่า / เท่ากัน เพื่อบอกทิศทาง ตรวจทั้งค่าแสงสูงและต่ำ", "The percentage has no sign. Higher / Lower / Equal indicates direction. Both high and low GI are checked."],
["ตัวอย่าง: ค่าอ้างอิง 4 และ GI โครงการ 3.6 จะต่าง 11.11% ต่ำกว่า", "Example: GI 3.6 compared with reference 4 gives an 11.11% difference (lower)."],
["Average: ค่าเฉลี่ยตามตารางหลัก · ค่าเดิม: ค่าแสงเฉพาะวันที่เทียบกันได้", "Average: main table average · Original GI: readings on comparable days"],
["แถบสีเทียบกับค่าอ้างอิงของแต่ละวิธี ไม่ใช่สถานะส่วนตัวของจุดใกล้เคียง", "Bars compare each reading with its method reference, not the nearby site’s own map status."],
["ไม่มีข้อมูลจุดเปรียบเทียบในเดือนที่เลือก", "No comparison site data in the selected month"],
["ขอบเขตสูงต้องมากกว่าขอบเขตต่ำ และขอบเขตต่ำต้องไม่ติดลบ", "Upper boundary must exceed the lower boundary; the lower boundary must be nonnegative."],
["ค่าแสงเฉลี่ยรายวันของเดือน (Average)", "Monthly average daily irradiance (Average)"],
["ใช้ค่า Average จากตารางหลัก ค่านี้ใช้คำนวณความต่างและสีสถานะบนแผนที่", "Uses the main table Average for both the percentage difference and map status colours."],
["โครงการ", "Project"],
["Average (kWh/m²/วัน)", "Average (kWh/m²/day)"],
["ค่าอ้างอิงจากจุดใกล้เคียง", "Reference from nearby sites"],
["ความต่างจากจุดใกล้เคียง", "Difference from nearby sites"],
["ข้อมูลไม่เพียงพอ หรือค่าโครงการเป็นศูนย์", "Insufficient data or zero project GI"],
["คำนวณจากค่าแสงรายวัน เฉพาะวันที่มีข้อมูลตรงกันครบจำนวนจุดขั้นต่ำ คำนวณตามข้อมูลปัจจุบันเพื่อเทียบวิธีเดิม ไม่ใช่ประวัติที่บันทึกไว้ และไม่ใช้กำหนดสีสถานะ", "Calculated from raw daily readings on days with enough matching nearby sites. Recalculated from current data for comparison, not a saved historical snapshot. Does not determine map colours."],
["ความต่างตามวิธีเดิม", "Difference using original method"],
["คู่มืออ่านค่าแสงและสถานะ", "Guide to irradiance and status"],
["Average คือผลรวมค่าแสงของวันที่ผ่านเกณฑ์ในตารางหลัก หารด้วยจำนวนวันที่ผ่านเกณฑ์ ไม่ใช่ผลรวมค่าแสงทั้งเดือน วันนอกช่วง Normal range จะนับเมื่อยืนยันค่ารายวันแล้ว การตรวจแล้วรายเดือนไม่ได้ปลด Alarm รายวัน", "Average is the sum of valid daily GI values divided by the number of valid days in the main table, not the monthly total. Out-of-range days count only after daily value confirmation. Monthly review does not clear daily alarms."],
["ค่าอ้างอิงนำ Average ของจุดใกล้เคียงในรัศมีที่ตั้งไว้มาหา Median หรือ Mean พิกัดซ้ำรวมเป็นหนึ่งจุด และใช้ Median ของ Average ภายในจุดนั้น ต้องมีจุดครบขั้นต่ำ วันที่นำมาเฉลี่ยอาจต่างกันในแต่ละโครงการ", "The reference uses Median or Mean of nearby site Averages within the selected radius. Duplicate coordinates count as one site, using the median of Averages at that site. The minimum site count is required. Valid days may differ between projects."],
["ความต่าง (%) = |Average โครงการ − ค่าอ้างอิง| ÷ Average โครงการ × 100 เช่น 3.6 เทียบ 4 ได้ 11.11% ต่ำกว่า และ 4.4 เทียบ 4 ได้ 9.09% สูงกว่า", "Difference (%) = |project Average − reference| / project Average × 100. 3.6 versus 4 gives 11.11% lower; 4.4 versus 4 gives 9.09% higher."],
["เกณฑ์เริ่มต้น: ไม่เกิน 5% สีเขียว, มากกว่า 5% ถึง 10% สีส้ม, มากกว่า 10% สีแดง หากข้อมูลไม่พอหรือค่าโครงการเป็นศูนย์จะแสดงสีเทา เกณฑ์เปลี่ยนได้ในตั้งค่า สีนี้เป็นการเทียบพื้นที่ใกล้เคียง ไม่ใช่เกณฑ์คำนวณ PR", "Default thresholds: at most 5% is green; above 5% through 10% is orange; above 10% is red. Insufficient data or a zero project GI is grey. Thresholds can be changed in settings. These colours compare nearby sites and do not define PR eligibility."],
["วิธีใช้งาน: เลือกปีและเดือน → เลือกโครงการ → ดู Average และความต่าง → ดูค่าเดิมข้าง Average เพื่อเทียบข้อมูลก่อนคัดวัน ทั้งสองคอลัมน์ใช้สมการค่าสัมบูรณ์เดียวกัน การแก้ค่าแสงและยืนยันรายวันในตารางหลักมีผลต่อ Average", "Select year and month → select a project → read Average and difference. The Original GI column shows readings on comparable days. Both columns use the same absolute percentage formula. Daily GI edits and confirmations in the main table affect Average."],
['เปรียบเทียบจาก Average ตารางหลัก','Comparison using table Average'],
['ข้อมูลไม่เพียงพอ หรือค่าโครงการเป็นศูนย์','Insufficient data or zero project GI'],
["เกณฑ์สถานะหมายถึงอะไร?","What do the status thresholds mean?"],
["เปรียบเทียบค่าแสงกับโครงการใกล้เคียง ไม่ใช่ช่วง Normal range ที่ใช้คัดวันในตาราง","Compares GI against nearby projects, not the Normal range used to select valid table days."],
["ปกติ (สีเขียว)","Normal (green)"],
["เฝ้าระวัง (สีส้ม)","Watch (orange)"],
["ผิดปกติ (สีแดง)","Abnormal (red)"],
["สีเทาหมายถึงข้อมูลไม่พอสำหรับเปรียบเทียบ ไม่ได้แปลว่าค่าแสงผิดปกติ เกณฑ์สีเปลี่ยนตามค่าที่กำหนดในตั้งค่า","Grey means insufficient comparison data, not abnormal irradiance. Colour thresholds follow the current settings."],
["วิธีเปรียบเทียบทำงานอย่างไร?","How does comparison work?"],
["— ใช้ค่ากลาง ลดผลกระทบจากค่าแสงที่สูงหรือต่ำผิดปกติ เหมาะเป็นค่าเริ่มต้น เช่น 3, 4, 8 → 4","— Uses the middle value and limits the influence of unusually high or low readings. Recommended default. Example: 3, 4, 8 → 4"],
["— รวมค่าแสงแล้วหารจำนวนจุด ทุกจุดมีน้ำหนักเท่ากัน แต่ไวต่อค่าผิดปกติ เช่น 3, 4, 8 → 5","— Adds readings and divides by the number of sites. Equal weight per site, but sensitive to outliers. Example: 3, 4, 8 → 5"],
["เลือกจุดในรัศมีที่กำหนด พิกัดซ้ำรวมเป็นจุดเดียว และไม่นับพิกัดเดียวกับโครงการที่เลือก ต้องมี Average ในเดือนที่เลือกครบจำนวนจุดขั้นต่ำ","Uses sites within the selected radius. Duplicate coordinates count as one site; the selected site is excluded. The minimum site count must have table Averages for the selected month."],
["ความต่าง (%) = |GI โครงการ − GI อ้างอิง| ÷ GI โครงการ × 100 ใช้ Average ของเดือนที่เลือก หากข้อมูลไม่พอจะแสดง “เปรียบเทียบไม่ได้” ไม่ใช่ “ผิดปกติ”","Difference (%) = |project GI − reference GI| ÷ project GI × 100, using table Averages for the selected month. Insufficient data means “No Comparison”, not “Abnormal”."],
["ค่า GI บนหมุดใช้ Average ตามตาราง สถานะเทียบพื้นที่ใกล้เคียงใช้ Average เดียวกัน วันที่ผ่านเกณฑ์อาจต่างกันในแต่ละโครงการ","Marker GI follows the table Average. Nearby status uses the same table Averages. Valid day counts may differ between projects."],
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
['รัศมีเปรียบเทียบ (กม.)','Comparison Radius (km)'],['จำนวนโครงการใกล้เคียงขั้นต่ำ','Minimum Nearby Projects'],['เกณฑ์ปกติ (%)','Lower boundary (%)'],['ผิดปกติต่ำกว่า (%)','Upper boundary (%)'],['วิธีเปรียบเทียบ','Comparison Method'],
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
 let out=value;out=out.replace(lang==='en'?'โครงการอ้างอิง: ':'Reference project: ',lang==='en'?'Reference project: ':'โครงการอ้างอิง: ');fullTH.forEach((m,i)=>{out=out.replace(lang==='en'?m:fullEN[i],lang==='en'?fullEN[i]:m)});
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

