# Bizning Qarzlar Boshqaruvi (Our Debt Management)

Ushbu hujjat kompaniyaning tashqi kreditorlar (ta'minotchilar, xizmat ko'rsatuvchilar) oldidagi qarzlari boshqarilishi va ularning mijoz qarzlaridan farqini tushuntiradi.

## 1. Asosiy Logika (OurDebt Model)

`OurDebt` modeli kompaniyaning majburiyatlarini kuzatib boradi. Uning ishlash prinsipi quyidagicha:
- **Kreditor (Creditor):** Qarz olingan shaxs yoki tashkilot nomi (`creditorName`).
- **Boshlang'ich miqdor:** Qarz birinchi marta olingandagi summa (`initialAmount`).
- **Joriy qarz:** Hozirgi kunda to'lanishi kerak bo'lgan qoldiq (`currentDebt`).
- **Avans (Haq):** Agar biz qarzimizdan ko'p to'lasak, ortiqcha summa `advanceBalance` sifatida saqlanadi.

## 2. To'lov va Qarz Qo'shish (Payments & Additions)

Bizning qarzlarda `payments` massivi ikki xil maqsadga xizmat qiladi:
1.  **PAYMENT (To'lov):** Biz tomondan qilingan to'lov. Bunda kassa (`CashAccount`) balansi kamayadi (`OUT` direction) va qarzimiz kamayadi.
2.  **DEBT (Qarz qo'shish):** O'sha kreditorga yangi qarz qo'shilishi (masalan, yana mahsulot oldik). Bunda qoldiq qarz ko'payadi.

## 3. Bizning Qarzlar (OurDebt) vs Mijoz Qarzlari (Debt)

Ikki bo'lim ham qarzlar bilan ishlasa-da, ularning o'rtasida muhim farqlar bor:

| Xususiyat | Mijoz Qarzlari (Debts) | Bizning Qarzlar (OurDebts) |
| :--- | :--- | :--- |
| **Asosiy sub'ekt** | Client (Mijoz) | Creditor (Kreditor) |
| **Qarzning kelib chiqishi** | Avtomatik (Invoice'dan) yoki qo'lda | Faqat qo'lda (Hozircha) |
| **Pul oqimi yo'nalishi** | **IN (Kirim):** Mijoz to'laganda | **OUT (Chiqim):** Biz to'laganimizda |
| **Maqsad** | Daromadni va tushumni nazorat qilish | Xarajatlarni va majburiyatlarni nazorat qilish |
| **FIFO Logikasi** | Juda qattiq (Eski fakturalarni yopish) | Sodda (Umumiy balansni kamaytirish) |
| **Haq (Advance)** | Mijozning bizdagi haqi | Bizning kreditor oldidagi haqimiz |

## 4. Texnik Holat (Current State)

Hozirgi kunda "Bizning qarzlar" bo'limi quyidagi holatda:
- **UI:** `react-spreadsheet` asosida ishlaydi, bu esa Excel ko'rinishida tezkor tahrirlash imkonini beradi.
- **Kassa bilan bog'liqlik:** To'lov qilinganda `CashFlow` yaratiladi va tanlangan kassadan pul chiqib ketadi.
- **Haqni ishlatish:** Yangi qarz qo'shilganda, agar bizda haq (`advanceBalance`) bo'lsa, u birinchi bo'lib ishlatiladi.
- **Refaktoring:** Mijozlar qarziga o'xshab, bu yerda ham "Qarz to'lovi" va "Haq to'lovi" (avansni qaytarish yoki ishlatish) tushunchalari joriy qilingan.

## 5. Xulosa
`OurDebt` bo'limi kompaniya moliyaviy barqarorligini tushunish uchun muhim. U orqali biz kimga qancha berishimiz kerakligini va bizning "haqimiz" qayerda ekanligini aniq ko'rib turamiz.
