# FusionSolar Cloud Workspace — คู่มือติดตั้ง

## ไฟล์ที่ต้องอยู่ใน GitHub Repository เดียวกัน

- `index.html`
- `working-day-analysis.html`
- `global-irradiance-analysis.html`
- `cloud-core.js`

ไฟล์ `supabase-setup.sql` ใช้ติดตั้งฐานข้อมูลเท่านั้น ไม่จำเป็นต้องเผยแพร่บน GitHub Pages

## 1. ติดตั้งฐานข้อมูล

1. เปิด Supabase Dashboard ของ Project
2. ไปที่ `SQL Editor`
3. กด `New query`
4. เปิดไฟล์ `supabase-setup.sql` และคัดลอกทั้งหมด
5. วางใน SQL Editor แล้วกด `Run`
6. ต้องเห็นผลลัพธ์ `Success. No rows returned`

SQL จะสร้าง Workspace ชื่อ `BGPL Solar Engineering` และกำหนด `solargm123@gmail.com` เป็น Admin คนแรก หากไม่พบบัญชีนี้ใน `Authentication > Users` คำสั่งจะหยุดและแจ้งข้อผิดพลาด

## 2. ตั้งค่า Authentication

ที่ `Authentication > Providers > Email`:

- เปิด Email provider
- เปิด Confirm Email
- ปิด Anonymous sign-ins
- หลังมี Admin แล้ว ให้ปิด Allow new users to sign up

ที่ `Authentication > URL Configuration`:

- Site URL: `https://solargm123.github.io/Summary-WD-and-GI-Analysis/`
- Redirect URL: `https://solargm123.github.io/Summary-WD-and-GI-Analysis/**`

## 3. อัปโหลดไฟล์ขึ้น GitHub

ตรวจชื่อไฟล์ให้ตรงทุกตัวอักษร โดยเฉพาะ:

```text
working-day-analysis.html
```

ไม่ควรใช้ชื่อ `working-day-analysis(1).html` เพราะ Link จาก Workspace ใช้ชื่อมาตรฐานที่ไม่มี `(1)`

Commit ไฟล์ทั้ง 4 ไฟล์ แล้วรอ GitHub Pages Deploy สำเร็จ

## 4. ทดสอบ Admin

1. เปิด `https://solargm123.github.io/Summary-WD-and-GI-Analysis/`
2. Login ด้วย `solargm123@gmail.com`
3. ตรวจว่า Role แสดง `ADMIN`
4. สร้างงาน Working Day หนึ่งงาน
5. อัปโหลด Excel และรอข้อความ `บันทึกแล้ว`
6. กลับ Workspace แล้วเปิดงานเดิม ข้อมูลต้องกลับมาครบ
7. ทำซ้ำกับ Global Irradiance

## 5. เพิ่มสมาชิก

1. สร้างหรือ Invite ผู้ใช้ที่ `Supabase > Authentication > Users`
2. Login ด้วย Admin ที่หน้าเว็บไซต์
3. กด `สมาชิกและสิทธิ์`
4. ใส่ Email เดียวกับบัญชีที่สร้างไว้
5. เลือก Admin, Editor หรือ Viewer

ห้ามเพิ่มผู้ใช้งานทั่วไปเป็น Supabase Organization/Project Member เพราะเป็นสิทธิ์เข้าหน้าจัดการหลังบ้าน ไม่ใช่สิทธิ์เข้าแอป

## 6. ทดสอบสิทธิ์

- Admin: สร้าง แก้ไข Archive งาน และจัดการ Role
- Editor: สร้างและแก้ไขงาน แต่จัดการสมาชิกหรือ Archive ไม่ได้
- Viewer: เปิดดู กรอง ดู Formula/กราฟ และ Export ได้ แต่บันทึกหรือแก้ค่าต้นทางไม่ได้

## 7. Conflict Protection

หากเปิดงานเดียวกันสองเครื่องและมีการบันทึกจากอีกเครื่อง ระบบจะแสดงว่า `มีข้อมูลใหม่` หรือ `Conflict` ให้กด `Reload` ก่อนแก้ไขต่อ ระบบจะไม่เขียนทับ Version ใหม่โดยอัตโนมัติ

## 8. ข้อมูลที่จัดเก็บ

ระบบไม่อัปโหลดไฟล์ Excel ต้นฉบับ เก็บเฉพาะชื่อไฟล์ ข้อมูลรายวันที่ใช้จริง ค่าที่ผู้ใช้แก้ การตั้งค่า Method/Loss/Note และ Activity Log

## ข้อควรระวัง

- ห้ามใส่ `Secret Key`, `service_role`, Database Password หรือ Connection String ในไฟล์บน GitHub
- `cloud-core.js` ใช้เฉพาะ Publishable Key ซึ่งต้องทำงานร่วมกับ RLS ที่สร้างโดย SQL
- Free Plan ไม่มี Automatic Backup ควร Export สำรองฐานข้อมูลเป็นระยะก่อนใช้งานเป็นงานหลัก
