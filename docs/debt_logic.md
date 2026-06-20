# Qarzlar Boshqaruvi va To'lov Logikasi (Debt Management & Payment Logic)

Ushbu hujjat tizimdagi qarzlar bo'limi, mijozlarning batafsil qarz tarixi (ledger) va to'lovlarni qabul qilish logikasini tushuntiradi.

## 1. Qarzning shakllanishi (Invoicdan Debtga)

Yangi faktura (`Invoice`) yaratilganda, agar u to'liq to'lanmasa, tizim avtomatik ravishda `Debt` modelida yozuv yaratadi:
- **Bog'liqlik:** `Debt` yozuvi `invoiceNo` orqali faktura bilan bog'lanadi.
- **Dastlabki holat:** `amount` (fakturaning jami summasi) va `currentDebt` (to'lanishi kerak bo'lgan qoldiq) qiymatlari saqlanadi.
- **Mijoz balansi:** Bir vaqtning o'zida `Client` modelidagi `currentDebt` qiymati ham oshiriladi.

## 2. Qarzlar Sahifasi (Debts Page)

Bu sahifa barcha qarzdor mijozlarning umumiy ro'yxatini ko'rsatadi.
- **Summary:** Jami qarzlar va jami avanslar (haqlar) summasi ko'rsatiladi.
- **Qidiruv:** Mijoz nomi yoki telefoni bo'yicha qidirish imkoniyati.
- **Yangi qarz:** Fakturaga bog'lanmagan, qo'lda kiritiladigan qarzlarni yaratish imkoniyati (`reasonType: MANUAL`).

## 3. Mijozning Batafsil Qarz Sahifasi (ClientDebtDetailPage)

Bu sahifa mijoz bilan bo'lgan barcha moliyaviy munosabatlar tarixini (Ledger) ko'rsatadi.

### 3.1. Spreadsheet (Jadval) Logikasi
Sahifa `react-spreadsheet` kutubxonasidan foydalanib, foydalanuvchiga Excel ko'rinishida ma'lumotlarni tahrirlash va qo'shish imkonini beradi:
- **Kirim/Chiqim:** Bir jadvalda ham qarzlar (DEBT), ham to'lovlar (PAYMENT) ko'rinadi.
- **Qoldiq (Balance After):** Har bir tranzaksiyadan keyingi qoldiq avtomatik hisoblanadi.

### 3.2. To'lovlarni Qabul Qilish (Distribution Logic)
Mijoz qarzini to'laganda, tizim quyidagi murakkab logikani bajaradi:
1.  **FIFO (First-In-First-Out):** To'lov summasi mijozning eng eski qarzlaridan boshlab yopib chiqiladi (`recordClientDebtPayment` funksiyasi).
2.  **Kassa yangilanishi:** Tanlangan `CashAccount` balansi oshiriladi.
3.  **CashFlow:** Har bir yopilgan qarz uchun alohida pul oqimi yozuvi yaratiladi.
4.  **Advance Balance:** Agar to'langan summa barcha qarzlardan oshib ketsa, qoldiq mijozning `advanceBalance` (haqi) hisobiga o'tkaziladi.

### 3.3. Tahrirlash va Sinxronizatsiya
Agar jadvalda birorta to'lov yoki qarz summasi o'zgartirilsa:
- **Backend Sync:** Tizim bog'langan `CashFlow`, `Invoice`, `Debt` va `Client` balanslarini qayta hisoblab chiqadi.
- **Rate (Kurs):** So'mda qilingan to'lovlar uchun kurs o'zgartirilsa, USD ekvivalenti qayta hisoblanadi.

## 4. Barcha Qarzlarni Ko'rish (AllDebtsLedger)

Bu qism barcha mijozlarning qarz va to'lovlarini bitta umumiy "Kassa kitobi" (Ledger) ko'rinishida jamlaydi.
- **Filtrlar:** Sana oralig'i va muayyan kassa (account) bo'yicha filtrlash.
- **Chop etish:** Barcha operatsiyalarni qog'ozga chiqarish yoki Excelga eksport qilish uchun qulay format.

## 5. Texnik Amallar Zanjiri (Transaction Workflow)

Mijoz qarz to'laganda backendda quyidagi ketma-ketlik bajariladi:
1.  `Debt` modelidagi `payments` massiviga yangi to'lov qo'shiladi.
2.  `Debt`ning `currentDebt` miqdori kamaytiriladi.
3.  Bog'langan `Invoice`ning `paid` summasi oshiriladi va `balance` kamaytiriladi.
4.  `Client`ning umumiy `currentDebt` balansi kamaytiriladi.
5.  `CashAccount` balansi oshiriladi.
6.  `CashFlow` yozuvi yaratiladi.

Bu barcha amallar **Database Transaction** ichida bajariladi, ya'ni birortasi xato bo'lsa, hech qaysi o'zgarish saqlanmaydi.

## 6. Xulosa
Qarzlar bo'limi shunchaki ro'yxat emas, balki barcha moliyaviy operatsiyalarni o'zaro bog'laydigan markaziy nuqtadir. Tizim avtomatik ravishda qoldiqlarni hisoblaydi va inson xatosini kamaytirish uchun barcha modellar orasidagi sinxronizatsiyani ta'minlaydi.
