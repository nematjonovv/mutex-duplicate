# MUTex - Korxona Boshqaruv Tizimi

MUTex - bu ishlab chiqarish korxonalari uchun mo'ljallangan, omborxona, sotuv, moliya va hisobotlarni boshqarish tizimi.

## Asosiy Imkoniyatlar
- **Ombor boshqaruvi:** Partiyalar (batch), tayyor mahsulotlar va xomashyo hisobi.
- **Sotuv va Faktura:** Avtomatik faktura yaratish, shtrix-kod skanerlash, qarzlar hisobi.
- **Moliya:** Kassa va bank hisoblari, pul oqimi (cash flow) tahlili.
- **Hisobotlar:** Kundalik, oylik va yillik tahliliy hisobotlar.
- **Xavfsizlik:** Rolga asoslangan kirish (RBAC) va xavfsizlik sozlamalari.

## Texnologiyalar
- **Frontend:** React, TypeScript, Ant Design, Tailwind CSS.
- **Backend:** Node.js, Express, Socket.io (real-time yangilanishlar).
- **Ma'lumotlar bazasi:** MongoDB (Mongoose).

## Ishga Tushirish

### Talablar
- Node.js (v16+)
- MongoDB

### O'rnatish
1.  Kutubxonalarni o'rnatish:
    ```bash
    # Root papkada
    npm install
    # Server papkasida
    cd server && npm install
    ```
2.  `.env` fayllarini sozlash (`.env.example` namunasi asosida).

### Development rejimi
```bash
# Frontend (Alohida terminalda)
npm run dev

# Backend (Alohida terminalda)
cd server && npm start
```

### Production rejimi (Tavsiya etiladi)
Production rejimi uchun frontend build qilinadi va server orqali yagona portda ishga tushiriladi:
1.  Build qilish: `npm run build`
2.  Serverni ishga tushirish: `cd server && npm start`
3.  Brauzerda: `http://localhost:5000`

## Avtomatik va Terminalsiz Ishlatish
Windows tizimida dasturni fonda va avtomatik ishga tushirish uchun [AUTO_START_GUIDE.md](./AUTO_START_GUIDE.md) qo'llanmasi bilan tanishib chiqing.

## Litsenziya
MUTex xususiy loyiha hisoblanadi.
