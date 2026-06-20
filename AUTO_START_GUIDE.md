# MUTex - Avtomatik Ishga Tushirish Qo'llanmasi

Ushbu qo'llanma loyihani Windows tizimida **terminalsiz (fonda)** va **yagona portda** avtomatik ishga tushirishni sozlashni o'rgatadi.

## Amaldagi Holat
Barcha zaruriy fayllar va sozlamalar allaqachon amalga oshirildi:
1.  **Server:** Backend (`server/src/index.js`) frontend fayllarini tarqatish va SPA routing uchun sozlangan.
2.  **Skriptlar:** `start_app.bat` va `launcher.vbs` fayllari yaratilgan.

## Ishga tushirish qadamlari

### 1. Frontendni Build qilish
Agar hali qilmagan bo'lsangiz, frontendni build qiling:
```bash
npm run build
```
Bu `dist` papkasini yaratadi, server aynan shu papkadagi fayllarni ishlatadi.

### 2. Avtomatik ishga tushirishni sozlash (Startup)
Kompyuter yonganda dastur o'zi ishga tushishi uchun:
1.  Klaviatura orqali `Win + R` tugmalarini bosing.
2.  Ochilgan oynaga `shell:startup` deb yozing va `Enter`ni bosing.
3.  Loyiha papkasidagi (`E:\2026\mutex`) `launcher.vbs` faylini toping.
4.  Uni **sichqonchaning o'ng tugmasi** bilan Startup papkasiga sudrab o'ting va **"Create shortcuts here"** (Yorliq yaratish) ni tanlang.

### 3. Tekshirish
Kompyuterni qayta ishga tushiring yoki `launcher.vbs` faylini ikki marta bosing.
- Brauzerda: `http://localhost:5000` manziliga kiring.
- Task Manager'da: `node.exe` jarayoni ishlayotganiga ishonch hosil qiling.

## Muhim Eslatmalar
- **Port:** Endi frontend ham, backend ham `5000` portida ishlaydi.
- **Terminal:** Qora oyna chiqmaydi, dastur fonda ishlaydi.
- **To'xtatish:** Agar dasturni to'xtatmoqchi bo'lsangiz, Task Manager orqali `node.exe` jarayonini "End Task" qiling.

---
*Savollar yoki muammolar yuzaga kelsa, ishlab chiquvchiga murojaat qiling.*
