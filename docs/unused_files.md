# Foydalanilmayotgan fayllar (Unused Files Report)

Ushbu hujjat loyihadagi hozirgi kunda ishlatilmayotgan yoki eskirgan (obsolete) fayllarni o'z ichiga oladi. Loyihani tozalashda ushbu fayllarni xavfsiz o'chirib tashlash yoki arxivlash mumkin.

## Backend (Server)

### 1. Marshrutlar (Routes)
Ushbu marshrutlar `server/src/index.js` faylida ro'yxatdan o'tkazilmagan, shuning uchun ularga API so'rovlarini yuborib bo'lmaydi.

- `server/src/routes/inventory.js`
- `server/src/routes/payroll.js`
- `server/src/routes/workers.js`
- `server/src/routes/softHanks.js` (Frontend'da boshqaruv sahifasi yo'q)
- `server/src/routes/hardHanks.js` (Frontend'da boshqaruv sahifasi yo'q)
- `server/src/routes/dyehouses.js` (Frontend'da ishlatilmaydi)
- `server/src/routes/transfers.js` (Frontend'da ishlatilmaydi)
- `server/src/routes/dyehouseProcesses.js` (Frontend'da faqat ma'lumot ko'rish uchun ishlatiladi)

### 2. Kontrollerlar (Controllers)
Ushbu kontrollerlar faqat yuqoridagi ishlatilmayotgan marshrutlarda chaqirilgan.

- `server/src/controllers/inventoryController.js`
- `server/src/controllers/payrollController.js`
- `server/src/controllers/workerController.js`
- `server/src/controllers/softHankController.js`
- `server/src/controllers/hardHankController.js`
- `server/src/controllers/dyehouseController.js`
- `server/src/controllers/transferController.js`
- `server/src/controllers/dyehouseProcessController.js`

### 3. Modellar (Models)
Ushbu modellar yo umuman import qilinmagan, yoki faqat ishlatilmayotgan kontrollerlarda ishlatilgan.

- `server/src/models/Payroll.js`
- `server/src/models/Worker.js`
- `server/src/models/DyedToBase.js`
- `server/src/models/SoftHank.js`
- `server/src/models/HardHank.js`
- `server/src/models/Dyehouse.js`
- `server/src/models/SmallBaseTransfer.js` (Faqat `softHankController` va `transferController`da ishlatilgan)
- `server/src/models/DyehouseProcess.js`

---

## Frontend (Client)

### 1. Sahifalar (Pages)
Ushbu sahifalar `src/App.tsx` faylidagi `Routes` ro'yxatiga kiritilmagan, shuning uchun ularga URL orqali kirish imkoni yo'q.

- `src/pages/AccountsPage.tsx`
- `src/pages/DocumentationPage.tsx`
- `src/pages/InventoryPage.tsx`
- `src/pages/PayrollPage.tsx`
- `src/pages/WorkersPage.tsx`

*Eslatma: SoftHanks, HardHanks, Dyehouses va Transfers uchun umuman sahifalar mavjud emas.*

### 2. Servislar (Services)
Ushbu servislar faqat yuqoridagi ishlatilmayotgan sahifalarda yoki faqat modal oynalarda (ma'lumot ko'rish uchun) ishlatilgan.

- `src/services/payrollService.ts`
- `src/services/workerService.ts`
- `src/services/inventoryService.ts`
- `src/services/softHankService.ts` (Faqat `BatchRelationsModal`da)
- `src/services/hardHankService.ts` (Faqat `BatchRelationsModal`da)
- `src/services/dyehouseService.ts` (Hech qayerda ishlatilmaydi)
- `src/services/transferService.ts` (Hech qayerda ishlatilmaydi)
- `src/services/dyehouseProcessService.ts` (Faqat `BatchRelationsModal`da)

### 3. Komponentlar (Components)
- `src/components/RoleRoute.tsx` (`App.tsx` yoki boshqa joylarda import qilinmagan)

---

## Xulosa
Loyihani modernizatsiya qilish jarayonida yangi funksiyalar qo'shilgan (masalan, `cash-flow` bo'limi) va eski bo'limlar (masalan, `payroll`, `workers`, `inventory`) o'rnini bosgan yoki olib tashlangan. Yuqoridagi fayllar loyiha hajmini kamaytirish va tushunarsizliklarni oldini olish uchun o'chirib tashlanishi tavsiya etiladi.
