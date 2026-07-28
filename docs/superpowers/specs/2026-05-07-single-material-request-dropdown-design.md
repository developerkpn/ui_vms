# Single Material Request Dropdown Design

**Date:** 2026-05-07

**Context**

Halaman `single` material request di `src/components/request-material/SingleMaterialForm.jsx` menampilkan dua field pilihan:

- `Material Group` menggunakan `TextField` dengan mode `select`
- `Sub Material Group` menggunakan `Select`

Saat ini daftar pilihan pada kedua field terasa terlalu tinggi sehingga menutupi area form terlalu banyak. Kebutuhan pengguna adalah mempertahankan pola pilih-only, tanpa input ketik, sambil membuat suggestion/dropdown muncul di bawah field dan terasa lebih pendek.

**Goal**

Merapikan pengalaman memilih `Material Group` dan `Sub Material Group` dengan:

- tetap menggunakan dropdown pilih-only
- memastikan menu dropdown muncul dari bawah field
- membatasi tinggi daftar agar hanya menampilkan beberapa item sebelum scroll

**Non-Goals**

- Tidak mengganti field menjadi `Autocomplete`
- Tidak menambahkan fitur pencarian/typing
- Tidak mengubah logic fetch data, schema loading, atau pengelompokan subgroup
- Tidak mengubah payload submit atau validasi form

**Chosen Approach**

Pendekatan yang dipilih adalah mempertahankan komponen yang ada lalu menambahkan konfigurasi menu dropdown bersama untuk dua field tersebut.

Desain implementasi:

1. Tambahkan satu konstanta konfigurasi menu, misalnya `compactDropdownMenuProps`, di dalam `SingleMaterialForm.jsx`.
2. Gunakan konfigurasi ini pada:
   - `TextField` `Material Group` melalui `SelectProps.MenuProps`
   - `Select` `Sub Material Group` melalui prop `MenuProps`
3. Atur perilaku menu agar:
   - ter-attach ke bawah field
   - membuka dari bagian atas menu
   - memakai tinggi maksimum yang ringkas, sekitar 5 sampai 6 item terlihat lalu scroll
   - tidak mengubah interaksi pilih-only yang sekarang

**UI Behavior**

- Saat user membuka `Material Group`, daftar pilihan tampil tepat di bawah text field.
- Saat user membuka `Sub Material Group`, daftar pilihan tampil tepat di bawah select field.
- Bila jumlah item melebihi tinggi maksimum, daftar menjadi scrollable di dalam menu.
- Item yang panjang tetap terbaca seperti sekarang; perubahan fokus pada posisi dan tinggi menu, bukan isi label.

**Implementation Notes**

- Gunakan pola MUI `MenuProps` dan `PaperProps`.
- Gunakan `anchorOrigin` vertikal `bottom` dan `transformOrigin` vertikal `top`.
- Gunakan `variant: "menu"` agar menu tidak memposisikan diri berdasarkan item terpilih.
- Gunakan `PaperProps.sx.maxHeight` dengan nilai ringkas yang tetap nyaman pada desktop.
- Bila perlu, tambahkan `mt` kecil pada paper menu agar ada jarak visual tipis dari field.

**Files Affected**

- Modify: `C:/Applications/Project/WORK/vms/ui_vms/src/components/request-material/SingleMaterialForm.jsx`

**Testing Strategy**

- Verifikasi manual di `https://localhost:3000/dashboard/materials/request/single`
- Cek `Material Group` membuka dropdown di bawah field
- Cek tinggi dropdown lebih pendek dan scroll tetap bekerja
- Cek `Sub Material Group` mengikuti perilaku yang sama setelah `Material Group` dipilih
- Cek tidak ada regresi pada pemilihan nilai dan submit form

**Risks**

- Perilaku anchor MUI bisa sedikit berbeda antara `TextField select` dan `Select`, jadi kedua field perlu diuji manual.
- Jika label item sangat panjang, tinggi menu yang lebih pendek bisa meningkatkan kebutuhan scroll, tetapi ini sesuai kebutuhan pengguna.

**Acceptance Criteria**

- `Material Group` tetap pilih-only
- `Sub Material Group` tetap pilih-only
- Kedua dropdown membuka ke bawah field
- Kedua dropdown memiliki tinggi menu yang lebih pendek dibanding kondisi saat ini
- Scroll pada menu tetap berfungsi
- Logic form yang ada tetap berjalan tanpa perubahan perilaku data

---

## Amendment — 2026-07-28 (Ticket IBE-003)

Ticket IBE-003 meminta `Material Group` dan `Sub Material Group` mengikuti perilaku
field `Base UoM`, yaitu bisa dicari dengan mengetik. Permintaan ini membalik sebagian
keputusan di atas. Bagian di atas tidak dihapus supaya konteks keputusan 2026-05-07
tetap terbaca; yang berlaku sekarang adalah amendment ini.

**Reversal 1 — Non-Goal "Tidak mengganti field menjadi `Autocomplete`"**

Sudah tidak berlaku. Kedua field sekarang memakai MUI `Autocomplete` lewat komponen
baru `src/components/common/SearchableSelect.jsx`, sama seperti `Base UoM`.
`TextField select` dan `Select` tidak lagi dipakai untuk dua field ini.

**Reversal 2 — Non-Goal "Tidak menambahkan fitur pencarian/typing"**

Sudah tidak berlaku, dan inilah inti IBE-003. Kedua field sekarang bisa difilter
dengan mengetik. Konsekuensinya kedua field jadi clearable (ada tombol clear khas
`Autocomplete`), persis seperti `Base UoM`. Meng-clear `Material Group` mereset
schema, subgroup, dan field specification — jalur yang sama dengan memilih group lain.

**Reversal 3 — `compactDropdownMenuProps` dihapus**

Chosen Approach di atas menambahkan `compactDropdownMenuProps` (`anchorOrigin`,
`transformOrigin`, `variant: "menu"`, `PaperProps.sx.maxHeight: 260`) di
`SingleMaterialForm.jsx`. Konstanta itu khusus `Menu` milik `Select` dan tidak
berlaku di `Autocomplete`, jadi sudah dihapus karena kedua pemakainya hilang.

Kebutuhan asli 2026-05-07 — daftar tampil di bawah field dan tidak terlalu tinggi —
tetap terpenuhi: `Autocomplete` memang selalu menempel di bawah field, dan listbox
default MUI dibatasi `40vh` lalu scroll. Bedanya tinggi maksimum bukan lagi 260px
melekat, tapi mengikuti default `Autocomplete` supaya konsisten dengan `Base UoM`.

**Tambahan yang bukan reversal — urutan kategori Sub Material Group**

Pengelompokan brand untuk material group `901*` tetap ada, pindah dari
`ListSubheader` ke `groupBy` milik `Autocomplete`. Karena `groupBy` bikin header baru
setiap kali nilai group berubah saat menyusuri daftar, options wajib diurutkan per
kategori lebih dulu. Urutan kategori sekarang tetap
(`Acuator (Brand)` → `Solenoid Valve (Brand)` → `Other`), sebelumnya mengikuti
kategori mana yang kebetulan muncul pertama di response API.

**Files Affected (IBE-003)**

- Add: `src/components/common/SearchableSelect.jsx`
- Modify: `src/components/request-material/SingleMaterialForm.jsx`
- Modify: `src/pages/dashboard/SingleMaterialForm.rework.test.cjs`

**Acceptance Criteria (IBE-003)**

- `Material Group` bisa dicari dengan mengetik
- `Sub Material Group` bisa dicari dengan mengetik
- Kedua field tampil dan berperilaku sama dengan `Base UoM`
- Pengelompokan brand pada material group `901*` tetap muncul dengan header
- Value yang sudah tersimpan tetap ter-preselect di mode rework dan view
- Payload submit dan validasi tidak berubah
