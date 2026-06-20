# Moliya Bo'limi Logikasi (Finance Logic Report)

Ushbu hujjat Mutex CRM tizimidagi moliya bo'limining ishlash prinsiplari, qarzlar hisob-kitobi va pul oqimi (cash flow) logikasini tushuntiradi.

## 1. Asosiy Komponentlar

Moliya tizimi quyidagi 5 ta asosiy modelga tayanadi:

1.  **CashAccount (Kassa/Hisob):** Pul saqlanadigan joylar (Naqd pul, Bank, Karta va h.k.).
2.  **CashFlow (Pul oqimi):** Har bir kirim va chiqim tranzaksiyasining batafsil tarixi.
3.  **Invoice (Faktura):** Mijozga sotilgan mahsulotlar ro'yxati va umumiy hisob.
4.  **Debt (Mijoz qarzi):** Har bir faktura yoki alohida sabab bilan bog'liq mijoz qarzi.
5.  **OurDebt (Bizning qarzimiz):** Ta'minotchilar yoki boshqa kreditorlar oldidagi qarzlarimiz.

---

## 2. Mijozlar Qarzi va Faktura Logikasi

### 2.1. Qarzning shakllanishi
Mijozga mahsulot sotilganda (`Invoice` yaratilganda), tizim avtomatik ravishda `Debt` (Qarz) yozuvini yaratadi.
- **Faktura summasi** = Mijozning umumiy qarzi.
- **Boshlang'ich to'lov:** Faktura yaratish jarayonida mijoz ma'lum miqdorda to'lov qilishi mumkin. Bu to'lov faktura balansini va mos ravishda qarz miqdorini kamaytiradi.

### 2.2. To'lovlarni qabul qilish
Mijoz qarzini ikki xil usulda to'lashi mumkin:
1.  **Faktura bo'yicha:** Muayyan bir faktura uchun to'lov qilish.
2.  **Umumiy qarz bo'yicha:** Mijozning barcha qarzlarini yopish uchun umumiy summa berish (tizim eng eski qarzdan boshlab avtomatik yopib chiqadi - *FIFO prinsipi*).

### 2.3. Avans (Haq) tizimi
Agar mijoz qarzidan ko'p pul to'lasa, ortiqcha summa mijozning **Advance Balance (Avans)** hisobiga o'tadi. Keyingi safar faktura yaratilganda, tizim birinchi bo'lib ushbu avans hisobidan qarzni yopishga harakat qiladi.

---

## 3. Kompaniya Qarzlari (Bizning qarzlar)

### 3.1. Qarzni ro'yxatga olish
`OurDebt` modeli orqali kompaniya kimdan qancha qarz ekanligi yozib boriladi. Bu asosan xomashyo sotib olish yoki boshqa xarajatlar uchun ishlatiladi.

### 3.2. To'lov qilish
Kompaniya qarzni to'laganda, `CashAccount`dan pul chiqib ketadi (`OUT` direction) va `OurDebt`ning joriy qarzi kamayadi.
- **Haq (Advance):** Agar biz qarzimizdan ko'p to'lasak, bu summa bizning "haqimiz" (advance) sifatida saqlanadi. Kelgusida shu kreditorga yangi qarz qo'shilsa, avans birinchi bo'lib ishlatiladi.

---

## 4. Kassa va Pul Oqimi (Cash Flow)

Har qanday pul harakati (Kirim yoki Chiqim) uchun **CashFlow** yozuvi yaratiladi.

### 4.1. Tranzaksiya turlari
- **IN (Kirim):** Faktura to'lovi, Mijoz qarzini qaytarishi, Avans olish.
- **OUT (Chiqim):** Ta'minotchiga to'lov, Bizning qarzni qaytarishimiz, Umumiy xarajatlar, Ishchilar oyligi.

### 4.2. Hisoblar (Accounts)
Har bir tranzaksiya aniq bir kassa (`accountId`) bilan bog'lanadi. Tranzaksiya amalga oshganda, kassadagi `currentBalance` avtomatik yangilanadi.

### 4.3. Valyuta va Kurs
Tizim asosan **USD** va **UZS** valyutalarida ishlaydi.
- So'mda qilingan to'lovlar o'sha vaqtdagi **Kurs (Rate)** bo'yicha hisoblanadi.
- Qarzlarning asosiy hisob-kitobi (balance) ko'p hollarda USD ekvivalentida yuritiladi (ayniqsa mijoz qarzlarida).

---

## 5. Texnik Bog'liqliklar (Zanjir)

Moliya logikasi zanjir ko'rinishida ishlaydi:
1.  **Invoice** -> `Debt` yaratadi.
2.  **Payment** -> `Debt`ni yangilaydi -> `Invoice`ni yangilaydi -> `Client` qarzini yangilaydi -> `CashAccount` balansini yangilaydi -> `CashFlow` yaratadi.

Ushbu zanjir uzilmasligi uchun barcha amallar **Database Transactions (withTransaction)** ichida bajariladi. Agar birorta qadamda xatolik bo'lsa, butun zanjir bekor qilinadi (Rollback).

---

## 6. Xulosa
Loyihaning moliya qismi juda qattiq nazorat qilingan. Har bir tiyinning qayerdan kelgani va qayerga ketgani `CashFlow` orqali kuzatiladi. Mijozlar va bizning qarzlar alohida-alohida, lekin o'xshash logika (Advance/Debt) asosida boshqariladi.
