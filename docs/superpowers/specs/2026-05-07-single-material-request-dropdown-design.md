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
