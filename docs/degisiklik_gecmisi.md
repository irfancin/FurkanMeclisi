# Değişiklik Geçmişi

## v1.71 — 2026-09-26

### Zikir Grubu Düzeltmeleri

**Sorun 1: Günlük Rapor — Negatif "Bugün Okumayan" (-12)**

Zikir gruplarında `donem_atamalari` tablosunda kayıt bulunmaz (cüz ataması yapılmaz).
`rapor/route.ts` toplam üye sayısını `liste.length` ile hesaplıyordu; `liste` ise
`donem_atamalari`'ndan oluşturuluyordu. Bu nedenle:
- `toplam = 0` → "Toplam Üye: 0"
- `okuyanlar = 12` (okuma_kayitlari'ndan — doğru)
- `0 - 12 = -12` → "Bugün Okumayan: -12"

**Düzeltme:** `src/app/api/admin/rapor/route.ts`
- Grup tipi DB'den çekilir (`gruplar.grup_tipi`)
- Zikir grubunda `liste` doğrudan `kullanicilar` tablosundan, `cuz_no=0` ile oluşturulur
- `toplam = uyeler.length` (gerçek üye sayısı)

---

**Sorun 2: Manuel Kayıt — "Bu üyenin dönem ataması bulunamadı."**

`manuel-kayit/route.ts` POST handler, `donem_atamalari`'nda kayıt bulunmaması durumunda
hata döndürüyordu. Zikir üyeleri için bu tablo her zaman boştur.

Aynı şekilde GET handler `cuz_lar: []` döndürdüğünden ekranda "Toplam 0 kayıt" yazıyordu.

**Düzeltme:** `src/app/api/admin/manuel-kayit/route.ts`
- POST: `donem_atamalari` boşsa grup tipi kontrol edilir; Zikir ise `cuz_no=0` kullanılır
- GET: `zikir: true` bayrağı yanıta eklenir

**Frontend:** `src/app/admin/manuel-kayit/page.tsx`
- `zikir: true` geldiğinde "Cüz: X" yerine "Zikir" gösterilir
- Özet satırında "Toplam N kayıt" doğru hesaplanır (Zikir = `gunSayisi × 1`)

---

## v1.70 — 2026-09-24

- Üye silme düzeltmesi
- Manuel Kayıt sayfası eklendi

## v1.69 — 2026-09-24

- Android geri tuşu düzeltmesi: `router.replace` + `fm_cikis` flag
