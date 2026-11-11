# XBRZKI.ID — Portofolio Muhammad Rizky Anjani (Kiki)

Website portofolio satu halaman untuk Full-Stack Developer, dibuat dengan **HTML, CSS, dan JavaScript biasa** (tanpa framework, tanpa proses build). Tema hitam dan hijau, dengan animasi hero, catur 3D, dan kuda api 3D.

Lokasi: Jambi, Indonesia · Kontak: muhammadrizkyanjani712@gmail.com · Instagram: @xb.rzki

---

## 1. Fitur

| Bagian | Isi |
|---|---|
| **Hero** | Tulisan PORTFOLIO raksasa, foto, statistik, tombol *Explore my work*. Animasi masuk dan efek saat di-scroll |
| **Works** | Kartu proyek dengan filter dan pencarian. Klik kartu untuk membuka jendela detail (bisa berisi video) |
| **Tech stack** | Deretan logo teknologi bergerak, tombol *View all* |
| **Credentials** | Daftar sertifikat dan piagam. Klik baris untuk membuka foto sertifikat (lightbox) |
| **Every Move Has A Purpose** | Catur 3D holografik yang bisa dimainkan (puzzle mat dalam 7 langkah), dengan partikel hijau di dalam bagian itu saja |
| **About** | Pendidikan, toolkit, proses kerja dengan garis timeline yang terisi saat di-scroll, panel kutipan |
| **Experience** | Riwayat kerja yang bisa dibuka-tutup dan daftar pencapaian |
| **Contact** | Email, telepon, Instagram, **kuda api 3D** (WebGL), dan formulir *Tell me about your project* |
| **Umum** | Tombol *Motion on/off*, bar progres scroll, tampilan HP (navbar kecil + menu burger) |

---

## 2. Struktur folder

```
iskiie-replica-v2/
├── index.html              ← halaman utama (semua isi teks ada di sini)
├── README.md               ← file ini
├── css/
│   ├── style.css           ← gaya utama seluruh halaman (desktop + HP)
│   ├── chess.css           ← gaya khusus papan catur
│   └── horse.css           ← gaya khusus kuda api 3D
├── js/
│   ├── main.js             ← logika umum (menu, filter proyek, tombol, animasi muncul)
│   ├── hero.js             ← animasi hero (tulisan PORTFOLIO, foto, scroll)
│   ├── chess.js            ← catur 3D (modul ES, memakai three.js + chess.js)
│   └── horse.js            ← kuda api 3D (WebGL murni, tanpa library)
└── assets/
    ├── img/
    │   ├── logo.png            ← logo di navbar
    │   ├── hero-portrait.png   ← foto hero (PNG transparan)
    │   ├── kuda.jfif           ← foto kuda api (latar hitam)
    │   ├── projeck-1.jpg       ← gambar proyek 1
    │   ├── project-2.png       ← gambar proyek 2
    │   └── project-3.png       ← gambar proyek 3
    ├── sertifikat/
    │   ├── cisco-essentials.jpg
    │   ├── futsal-2024.png
    │   ├── catur-agripolyfest.webp
    │   └── catur-online.jfif
    ├── vidio/
    │   └── roblox_report_automation.mp4
    └── cv/
        └── cv.jpg
```

> `css/` dan `js/` harus berada **sejajar dengan `index.html`**, bukan di dalam `assets/`.

---

## 3. Cara menjalankan

1. Buka folder proyek di **VS Code**.
2. Pasang ekstensi **Live Server** (Ritwick Dey).
3. Klik kanan `index.html` → **Open with Live Server**. Alamatnya: `http://127.0.0.1:5500`.
4. **Wajib ada koneksi internet** (lihat bagian 4).

Jangan membuka `index.html` dengan klik dua kali (alamat `file://`). Catur 3D dan kuda api membaca file lain, dan browser akan memblokirnya. Selalu pakai Live Server atau hosting.

Setelah mengubah CSS atau JS dan tampilan belum berubah, tekan **Ctrl + F5** untuk membersihkan cache.

---

## 4. Yang dimuat dari internet

| Sumber | Dipakai untuk |
|---|---|
| Google Fonts | Anton, Barlow Condensed, DM Sans, Caveat, Caveat Brush |
| cdn.jsdelivr.net | three.js 0.160.0 dan chess.js 1.0.0 (untuk catur 3D) |
| cdn.simpleicons.org | logo teknologi (tech stack dan toolkit) |

Kalau internet mati: teks tetap tampil dengan font cadangan, tetapi **catur 3D tidak muncul** dan logo teknologi kosong. Kuda api tetap jalan karena tidak memakai library luar.

---

## 5. Cara mengubah isi

### Nama dan domain
Di `index.html`, bagian bawah:
```js
window.SITE = {
  name: "Kiki",
  domain: "xbrzki.id"
};
```
Semua tempat bertanda `data-site-name` dan `data-site-domain` ikut berubah.

### Teks
Semua teks ada langsung di `index.html`. Cari kata yang ingin diganti dengan **Ctrl + F**.

### Foto hero
Ganti `assets/img/hero-portrait.png`. Pakai PNG **tanpa latar** (transparan), bagian bawah foto memudar otomatis.

### Proyek
Setiap proyek adalah satu `<article class="project-card">` di bagian Works. Isi jendela detailnya diatur lewat atribut:
`data-title`, `data-meta`, `data-role`, `data-desc`, `data-link`, `data-link-label`, dan `data-video` (opsional).
Gambar proyek otomatis dicoba dengan beberapa akhiran (`.jpg`, `.png`, `.webp`, dan lainnya), dan `projeck-1` (salah ketik) juga dikenali.

### Sertifikat
Taruh foto di `assets/sertifikat/`. Setiap baris di bagian Credentials punya `data-cert="assets/sertifikat/NAMA.jpg"`. Akhiran file (`.jpg/.png/.webp/.jfif`) dicoba otomatis, jadi `catur-online.jfif` tetap terbaca.
Angka besar di bagian itu diatur oleh `data-total="7"`. Ubah angkanya sesuai jumlah sertifikat.
Sertifikat berupa **PDF tidak bisa ditampilkan** di jendela itu, ubah dulu menjadi gambar.

### Kutipan, judul, dan paragraf catur
- Judul dan paragraf kiri: bagian `production-copy` di `index.html`.
- Kutipan di kartu catur: `quote:` di bagian atas `js/chess.js`.

### Kuda api
Di bagian atas `js/horse.js`:
```js
var CFG = { win:[0.20,0.80], depth:0.24, tilt:0.36, embers:90, flame:1.0 };
```
- `depth` — seberapa timbul relief 3D
- `tilt` — seberapa miring saat disentuh mouse
- `embers` — jumlah bara
- `flame` — kekuatan goyangan api

Foto dicari otomatis di `assets/img/` dengan nama `kuda-api`, `kuda_api`, `kuda`, `horse`, `fire-horse`, atau `contact-preview`. Gunakan foto **berlatar hitam** supaya tidak berbingkai.

### Warna dan font
Di `css/style.css`, bagian paling atas:
```css
--green: #16c65d;
--font: "DM Sans", ...;
--display: "Barlow Condensed", ...;
```

---

## 6. Tampilan HP

Blok HP berada di akhir `css/style.css` (`@media (max-width: 760px)`), memuat:
- navbar kecil dengan tulisan **XBRZKI.ID** dan menu burger,
- hero dengan foto dan statistik di kanan,
- panel kutipan hijau (versi HP memakai paragraf `class="q-m"`, versi laptop `class="q-d"`),
- kuda api dan catur yang menyesuaikan lebar layar.

---

## 7. Masalah umum

| Gejala | Penyebab / solusi |
|---|---|
| Halaman polos tanpa gaya | `css/style.css` tidak ditemukan. Pastikan folder `css/` sejajar dengan `index.html` |
| Papan catur tidak muncul | Tidak ada internet, atau dibuka lewat `file://`. Pakai Live Server dan buka F12 → Console untuk melihat pesan error |
| Kuda api tidak muncul / muncul pesan petunjuk | Foto tidak ditemukan di `assets/img/`. Cek namanya, lihat daftar di bagian 5 |
| Kuda api punya kotak/bingkai | Latar fotonya bukan hitam pekat |
| Gambar proyek kosong | Nama file tidak cocok. Ubah nama file atau `src` di `index.html` |
| Foto sertifikat "belum ditemukan" | Cek nama dan folder: `assets/sertifikat/` |
| Video proyek tidak jalan | Pastikan `assets/vidio/roblox_report_automation.mp4` ada (perhatikan ejaan `vidio`) |
| Ekstensi file tidak terlihat di Windows | File Explorer → View → centang **File name extensions**, supaya tidak terjadi `nama.jpg.jpg` |
| Perubahan tidak tampil | Tekan **Ctrl + F5** |

---

## 8. Teknologi

HTML5 · CSS3 (container queries, `clip-path`, `color-mix`) · JavaScript · three.js 0.160 (catur 3D) · chess.js 1.0 (aturan catur) · WebGL (kuda api) · Google Fonts · Simple Icons

---

© 2026 Muhammad Rizky Anjani — XBRZKI.ID. Seluruh hak dilindungi.