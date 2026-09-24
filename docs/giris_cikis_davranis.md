# Giriş / Çıkış Davranışı

## Tasarım İlkesi

Üyelerin büyük çoğunluğunun teknolojik okuryazarlığı düşüktür.
**Telefon numarası yalnızca ilk girişte bir kez girilir.** Sonraki her açılışta otomatik giriş yapılır.

---

## Senaryolar

| Durum | Davranış |
|---|---|
| İlk kullanım | Telefon numarası formu gösterilir |
| Uygulamayı kapat → tekrar aç | Telefon formu yok — otomatik giriş ✅ |
| Çıkış butonu → aynı sekme açık | Telefon formu gösterilir (kasıtlı) |
| Çıkış butonu → browser'ı kapat → tekrar aç | Telefon formu yok — otomatik giriş ✅ |
| Telefon numarası sistemden silinirse | `fm_hatirla_tel` temizlenir, telefon formu gösterilir |

---

## Teknik Detay

- `localStorage.fm_hatirla_tel` — ilk başarılı girişte kaydedilir; çıkışta **silinmez**
- `localStorage.fm_oturum` — aktif oturum; çıkışta temizlenir
- `sessionStorage.fm_cikis` — kasıtlı çıkış bayrağı; aynı sekme açık kaldıkça otomatik girişi engeller; sekme/browser kapatılınca otomatik temizlenir
- Çıkış: `router.replace('/')` kullanılır — `router.push` kullanılmaz; push geçmişte `/bugun` bırakır ve Android geri tuşuyla yeniden otomatik giriş tetikler

## Android Chrome'da "Kapatma" Farkı

- **Home tuşu / minimize:** Sekme aynı kalır, `sessionStorage` korunur → Çıkış yaptıysanız form görünmeye devam eder
- **Recents'ten kaydırarak kapatmak:** Browser tamamen kapanır, `sessionStorage` temizlenir → Sonraki açılışta otomatik giriş
