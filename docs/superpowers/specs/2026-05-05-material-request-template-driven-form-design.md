# Design Spec: Template-Driven Single Material Request Form

## Overview
Halaman `/dashboard/materials/request/single` akan diubah dari form statis menjadi form dinamis yang mengikuti blueprint KPN Corporate Material Blueprint section `3.2.1` sampai `3.2.12`.

Pemicu utama perubahan field adalah `material group`, bukan `plant` atau `storage location`. Setelah user memilih `material group`, backend akan mengembalikan schema form yang sudah digabung dari:

- master material group
- subgroup material untuk group terpilih
- request field rules
- template field rules
- metadata UI tambahan

Frontend kemudian hanya merender form berdasarkan schema tersebut.

## Goals
- Menampilkan field `Specification` sesuai template blueprint untuk material group terpilih.
- Membatasi opsi `Sub Material Group` sesuai `Material Group`.
- Menghindari hardcode field template di frontend.
- Menjadikan backend sebagai source of truth untuk struktur form, urutan field, label, helper, dan validasi dasar.
- Tetap memakai rule template dan validator yang sudah ada di backend saat ini.

## Non-Goals
- Belum membahas submit final request material ke workflow approval.
- Belum mengubah flow step awal `plant` dan `storage location` selain meneruskan nilainya sebagai context/default request fields.
- Belum mendesain ulang seluruh tampilan halaman di luar kebutuhan renderer dinamis.

## Current Context
Saat ini:

- Step awal di `SingleRequestPage.jsx` sudah mengambil `plant` dan `storageLocation`.
- Komponen `SingleMaterialForm.jsx` masih statis dan belum membaca template backend.
- Backend sudah memiliki endpoint dan rule penting:
  - `GET /material/groups/dropdown`
  - `GET /material/subgroups/:groupId/dropdown`
  - `GET /material/groups/:materialGroupCode/template`
  - `POST /material/groups/:materialGroupCode/template-description-previews`
  - `POST /material/template-validations`
- Backend juga sudah memiliki 12 definisi template yang cocok dengan blueprint section `3.2.1` sampai `3.2.12`.

Gap utama:

- response template backend belum berbentuk schema form siap-render
- frontend belum memiliki renderer dinamis untuk field `Specification`
- metadata UI seperti label override, placeholder, dan helper belum dikelola secara terpusat

## Blueprint Mapping
Blueprint section `3.2.1` sampai `3.2.12` sudah sejalan dengan template yang ada di backend:

1. Mechanical Component
2. Electrical Component
3. Equipment / Machinery
4. Process / Plant Equipment
5. Piping System
6. Chemical & Consumables
7. Packaging & Product Material
8. Construction / Civil Material
9. Office & General Supplies
10. Vehicle & Transportation
11. Capital Equipment
12. General / Miscellaneous

Artinya arah perubahan bukan membuat kategori template baru dari nol, tetapi menyusun contract backend dan renderer frontend agar template tersebut benar-benar mengendalikan form.

## Proposed Architecture
Pendekatan yang dipakai adalah backend-driven schema dengan sedikit elemen metadata UI di database.

### High-Level Flow
1. User memilih `plant` dan `storage location` pada step awal.
2. User masuk ke form material.
3. Frontend memuat daftar `material group`.
4. Setelah `material group` dipilih, frontend meminta schema form ke backend.
5. Backend melakukan resolusi:
   - material group master
   - subgroup list untuk group terpilih
   - template yang terhubung ke material group
   - request field rules
   - template field rules
   - metadata UI
6. Backend mengembalikan payload schema siap-render.
7. Frontend merender ulang section `Basic Info` dan `Specification` berdasarkan payload tersebut.
8. Saat field template berubah, frontend dapat memanggil preview/validation endpoint untuk menghasilkan `material_description` otomatis.

### Source Of Truth
Backend menjadi source of truth untuk:

- field yang tampil
- urutan field
- field wajib atau tidak
- field locked atau editable
- label tampilan
- helper/tooltip
- validasi rule template
- pembentukan `material_description`

Frontend hanya memegang:

- state nilai field
- state loading dan error
- renderer komponen MUI berdasarkan schema
- validasi ringan sebelum submit

## API Design
Disarankan membuat endpoint baru agar contract endpoint template lama tidak rusak.

### Recommended Endpoint
`GET /material/groups/:materialGroupCode/form-schema`

Versi awal endpoint ini dipicu oleh `materialGroupCode` saja. `plant` dan `storage location` tetap dibawa oleh frontend sebagai context nilai request field, tetapi bukan selector template.

### Response Shape
```json
{
  "materialGroup": {
    "id": 1,
    "code": "905",
    "name": "Mechanical Component"
  },
  "template": {
    "templateId": 1,
    "templateCode": "MECHANICAL_COMPONENT",
    "templateName": "Mechanical Component"
  },
  "subgroups": [
    {
      "id": 10,
      "code": "905-01",
      "name": "Example Subgroup",
      "item_group_id": 1
    }
  ],
  "sections": [
    {
      "key": "basic_info",
      "title": "Basic Info",
      "fields": []
    },
    {
      "key": "specification",
      "title": "Specification",
      "fields": []
    }
  ]
}
```

### Field Shape
```json
{
  "fieldKey": "part_number",
  "displayLabel": "Part Number",
  "section": "specification",
  "inputComponent": "text",
  "required": true,
  "locked": false,
  "visible": true,
  "placeholder": "Masukkan part number",
  "helperText": "Diawali P/N",
  "tooltipText": "Field akan ikut membentuk Material Description",
  "validationRuleType": "PREFIX",
  "prefixValue": "P/N",
  "maxLength": 40,
  "defaultValue": null
}
```

### Composition Rules
Schema endpoint akan menggabungkan:

- `materialGroup` dari `mat_item_group`
- `subgroups` dari `mat_item_sub_group`
- `requestFields` dari `mat_request_field_rules`
- `templateFields` dari `mat_template_field_rules + mat_field_master`
- `uiMeta` dari metadata UI baru

Backend juga bertanggung jawab menyusun field ke dalam `sections` final, sehingga frontend tidak perlu memiliki logika hardcode untuk memisahkan field `Basic Info`, `Specification`, atau section lain yang mungkin ditambahkan nanti.

### Fallback Behavior
Jika metadata UI belum tersedia untuk field tertentu, backend harus fallback ke:

- `field_label` dari `mat_request_field_rules`
- `field_name_id` dari `mat_field_master`
- `rule_detail` dari `mat_template_field_rules`
- `notes` dari `mat_request_field_rules`

Ini memastikan form tetap bisa dirender walaupun metadata baru belum lengkap.

## Database Adjustment
Penyesuaian database dibuat kecil dan aman.

### Existing Tables To Keep
- `mat_template_master`
- `mat_template_group_map`
- `mat_template_field_rules`
- `mat_request_field_rules`
- `mat_field_master`

### Recommended New Table
`mat_field_ui_meta`

### Purpose
Menyimpan metadata UI tanpa mencampur rule bisnis utama dengan kebutuhan tampilan.

### Proposed Columns
- `field_ui_meta_id`
- `field_id`
- `display_label`
- `placeholder_text`
- `helper_text`
- `tooltip_text`
- `input_component`
- `example_value`
- `created_at`
- `updated_at`

### Why New Table
- memisahkan metadata UI dari rule bisnis
- aman untuk override label yang berbeda antar kebutuhan tampilan
- mudah diisi bertahap hanya untuk field yang memang butuh penyesuaian

### Minimal Use
Tahap awal, metadata UI cukup dipakai untuk field yang memang butuh wording lebih cocok dengan blueprint, misalnya:

- `material_spec_bahan`
- `type_bentuk`
- `brand_merek`
- field yang di blueprint memakai istilah berbeda dari nama internal

## Frontend Design

### SingleRequestPage Responsibilities
- tetap mengelola step awal `plant` dan `storageLocation`
- meneruskan nilai tersebut ke form sebagai context
- menyimpan state level halaman:
  - `selectedMaterialGroup`
  - `selectedSubMaterialGroup`
  - `formSchema`
  - `requestFieldValues`
  - `templateFieldValues`

### SingleMaterialForm Responsibilities
- memuat daftar material group
- meminta schema saat material group berubah
- menampilkan loading, empty state, dan error state
- merender field berdasarkan `sections`
- men-disable `Sub Material Group` sampai schema tersedia
- mereset field terkait saat group berubah

### UI Rules
- `Material Group` selalu tampil terlebih dahulu.
- `Sub Material Group` hanya tampil aktif setelah `Material Group` valid dipilih.
- Section `Specification` tidak statis; field dirender berdasarkan schema response.
- `Material Description` ditampilkan sebagai hasil otomatis ketika field source-nya `COMPUTED_TEMPLATE`.
- Field locked dirender read-only.
- Field hidden tidak dirender.

## State Reset Behavior
Saat `material group` berubah:

- reset `subMaterialGroup`
- reset semua nilai `templateFieldValues`
- reset hasil `materialDescription`
- reset error validasi lama
- minta schema baru dari backend

Saat `subMaterialGroup` berubah:

- tidak mengubah template aktif
- hanya mengubah nilai field subgroup terpilih

Saat field template berubah:

- update local state
- trigger preview/validation terkontrol untuk update `materialDescription`

## Validation Design

### Frontend Validation
Frontend hanya menangani validasi ringan:

- required state
- max length visual
- disabled state
- hint prefix atau placeholder

### Backend Validation
Backend tetap validator final melalui endpoint validasi template.

Payload validasi dipisah jelas:
```json
{
  "materialGroupCode": "905",
  "requestFields": {
    "plant": "AC00",
    "storage_location": "LC01",
    "base_unit_of_measure": "EA"
  },
  "templateValues": {
    "part_number": "P/N 123",
    "material_name": "GASKET",
    "type_bentuk": "SW",
    "size_dimension": "2IN",
    "material_spec_bahan": "STEEL",
    "model": "SWG",
    "brand_merek": "KPN"
  }
}
```

### Material Description
`material_description` tidak lagi dianggap field manual biasa.

Perilaku yang diinginkan:

- nilainya dibentuk dari urutan field template aktif
- mengikuti rule validator backend
- auto uppercase melalui normalizer backend
- error ditampilkan jika hasil akhir melebihi 40 karakter

## Error Handling

### Template Not Found
Jika material group tidak memiliki template:

- backend mengembalikan 404 atau error terstruktur
- frontend menampilkan pesan jelas
- section `Specification` tidak dirender

### Empty Subgroup
Jika subgroup untuk material group kosong:

- dropdown `Sub Material Group` tetap tampil
- tampilkan empty state seperti `No subgroup available`

### Missing UI Metadata
Jika metadata UI tidak ditemukan:

- gunakan fallback label/helper
- jangan gagalkan render form

## Testing Strategy

### Backend Tests
- schema endpoint mengembalikan template yang benar untuk material group tertentu
- schema endpoint menggabungkan subgroup + request fields + template fields + ui meta
- fallback berjalan saat `mat_field_ui_meta` kosong
- material group berbeda menghasilkan field specification berbeda

### Frontend Tests
- memilih material group A merender field set A
- mengganti ke material group B menghapus field lama dan merender field set B
- `Sub Material Group` dimuat ulang sesuai group baru
- `Material Description` ikut berubah saat template values berubah
- error state tampil saat schema gagal dimuat

### Minimum Integration Coverage
- 1 skenario `Mechanical Component`
- 1 skenario `Electrical Component`
- 1 skenario pergantian group dari template A ke template B

## Implementation Notes For Later Planning
Kemungkinan file yang akan disentuh saat implementasi:

- `src/pages/dashboard/SingleRequestPage.jsx`
- `src/components/request-material/SingleMaterialForm.jsx`
- backend route/controller/model untuk schema endpoint baru
- migration baru untuk `mat_field_ui_meta`

Ini hanya referensi planning, bukan daftar final implementasi.

## Risks
- Jika metadata UI diisi terlalu banyak sejak awal, scope bisa melebar.
- Jika frontend masih menyimpan banyak mapping hardcode, manfaat backend-driven schema berkurang.
- Jika preview dipanggil terlalu sering tanpa debounce atau kontrol, UX bisa terasa lambat.

## Recommended Scope For First Implementation
1. Tambah endpoint schema baru.
2. Tambah metadata UI minimal.
3. Ubah frontend single request form menjadi renderer dinamis.
4. Sambungkan preview/validation untuk `material_description`.
5. Tambah test backend dan frontend untuk minimal dua template utama.

## Acceptance Criteria
- User memilih `material group` lalu field `Specification` berubah sesuai template blueprint yang terhubung ke group itu.
- `Sub Material Group` hanya menampilkan subgroup dari group terpilih.
- Frontend tidak lagi mengandalkan daftar field specification statis.
- `Material Description` terbentuk dari template rule backend.
- Bila metadata UI belum lengkap, form tetap bisa dirender dengan fallback.
