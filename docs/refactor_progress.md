# Loyihani Qayta Qurish (Refactoring) Progress

Ushbu hujjat loyihani refaktoring qilish jarayonidagi barcha o'zgarishlarni kuzatib borish uchun xizmat qiladi. Har bir qadam `docs/debt_logic.md` dagi mantiqqa tayangan holda amalga oshiriladi.

## O'zgarishlar Tarixi

| Sana | O'zgarish Tavsifi | Holat | Izoh |
| :--- | :--- | :--- | :--- |
| 17.06.2026 | DebtsDetailPage spreadsheet va chop etish qismida "Qarz" -> "Oldi", "To'lov" -> "Berdi" ga o'zgartirildi | Bajarildi | Foydalanuvchi uchun tushunarliroq nomlash |
| 17.06.2026 | "Turi" ustuni olib tashlandi va Oldi/Berdi qiymatiga qarab avtomatik tur aniqlash logikasi joriy qilindi | Bajarildi | Ma'lumot kiritishni soddalashtirish |
| 17.06.2026 | Spreadsheet UI: "Izoh" ustuni kengaytirildi, "Qoldiq" ustuni kichraytirildi | Bajarildi | UI yaxshilanishi va qulaylik |
| 17.06.2026 | Spreadsheet UI: Oldi, Berdi, Hisob, Kurs, Qoldiq ustunlari bir xil o'lchamga keltirildi, Izoh ustuni esa qolgan barcha bo'sh joyni egallaydigan qilindi | Bajarildi | Jadval ko'rinishini optimal taqsimlash |
| 17.06.2026 | Tahrirlash paytida izohning takrorlanishi (Duplicate Note) bugi tuzatildi | Bajarildi | Ma'lumotlar yaxlitligini ta'minlash |
| 17.06.2026 | UI Accessibility: Barcha button, input va selektorlar "large" o'lchamiga o'tkazildi, layout kengaytirildi | Bajarildi | Yoshi katta foydalanuvchilar uchun qulaylik |
| 17.06.2026 | Tahrirlashni track qilishdagi xatolik tuzatildi (Note comparison bug) | Bajarildi | "Saqlash" buttoni faqat haqiqiy o'zgarishda chiqadi |
| 17.06.2026 | Backend `updateDebtPayment` refaktoring qilindi (Haq/Avans qo'llab-quvvatlash) | Bajarildi | Tahrirlash paytida moliyaviy aniqlik ta'minlandi |
| 17.06.2026 | `debtController.js` dagi duplikatsiyalar va syntax errorlar tozalandi | Bajarildi | Server barqarorligi tiklandi |
| 17.06.2026 | Backend `createDebt` xronologiyasi va Frontend `ledgerEntries` tartiblash logikasi muvofiqlashtirildi | Bajarildi | Xronologik ketma-ketlik ta'minlandi |
| 17.06.2026 | "isEdited" feature: Tahrirlangan qatorlarni sariq rang (bg-yellow-100) bilan ajratish (Debts & CashFlow) | Bajarildi | Tahrirlangan ma'lumotlarni vizual aniqlash |
