// Import Firebase SDK (menggunakan CDN ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. KONEKSI KE FIREBASE (Ganti dengan config milikmu dari Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyClHDzTGncpd_5-Gnc4zmL3JVrXX1tiGKQ",
  authDomain: "admin-hu-874c2.firebaseapp.com",
  projectId: "admin-hu-874c2",
  storageBucket: "admin-hu-874c2.firebasestorage.app",
  messagingSenderId: "419870283564",
  appId: "1:419870283564:web:18054f24b31b52eb7b7e89",
  measurementId: "G-BG04LH1DKD"
};

// Inisialisasi Firebase & Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. DETEKSI NAMA KOBONG DARI URL PARAMETER (misal: ?kobong=A)
const urlParams = new URLSearchParams(window.location.search);
const namaKobong = urlParams.get('kobong') || 'Umum';

// Jika di halaman Admin Kobong, ubah Judul otomatis
const headerTitle = document.getElementById('nama-kobong');
if (headerTitle) {
    headerTitle.innerText = `Laporan Absensi - Kobong ${namaKobong.toUpperCase()}`;
}

// -----------------------------------------------------------
// LOGIKA 1: ADMIN KOBONG (Kirim Laporan)
// -----------------------------------------------------------
const formAbsensi = document.getElementById('form-absensi');

if (formAbsensi) {
    formAbsensi.addEventListener('submit', (e) => {
        e.preventDefault();

        const waktu = document.getElementById('waktu').value;
        const status = document.querySelector('input[name="status"]:checked').value;
        const catatan = document.getElementById('catatan').value;

        // Simpan ke Firebase Realtime Database
        push(ref(db, 'laporan_absensi'), {
            kobong: namaKobong.toUpperCase(),
            waktu: waktu,
            status: status,
            catatan: catatan || '-',
            status_konfirmasi: 'Pending',
            tanggal: new Date().toLocaleDateString('id-ID'),
            jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }).then(() => {
            alert('Laporan berhasil dikirim!');
            formAbsensi.reset();
        }).catch((err) => {
            alert('Gagal mengirim laporan: ' + err.message);
        });
    });
}

// -----------------------------------------------------------
// LOGIKA 2: SUPER ADMIN (Baca Laporan & Master Santri)
// -----------------------------------------------------------
const tabelLaporan = document.getElementById('tabel-laporan');
const formExcel = document.getElementById('form-excel');
const displaySantri = document.getElementById('display-santri');

// Realtime listener untuk membaca laporan yang masuk
if (tabelLaporan) {
    onValue(ref(db, 'laporan_absensi'), (snapshot) => {
        tabelLaporan.innerHTML = '';
        const data = snapshot.val();

        if (!data) {
            tabelLaporan.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada laporan masuk.</td></tr>`;
            return;
        }

        // Tampilkan data dari database
        Object.keys(data).reverse().forEach((key) => {
            const item = data[key];
            const isApproved = item.status_konfirmasi === 'Approved';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
                <td><strong>Kobong ${item.kobong}</strong></td>
                <td>${item.status}</td>
                <td>${item.catatan.replace(/\n/g, '<br>')}</td>
                <td>
                    ${isApproved 
                        ? `<span class="status-approved">✓ Terkonfirmasi</span>` 
                        : `<button class="btn-approve" onclick="konfirmasiLaporan('${key}')">Konfirmasi</button>`
                    }
                </td>
            `;
            tabelLaporan.appendChild(row);
        });
    });
}

// Fungsi Konfirmasi Laporan oleh Super Admin
window.konfirmasiLaporan = function(idLaporan) {
    update(ref(db, `laporan_absensi/${idLaporan}`), {
        status_konfirmasi: 'Approved'
    });
};

// Simpan & Tampilkan Master Data Santri
if (formExcel) {
    formExcel.addEventListener('submit', (e) => {
        e.preventDefault();
        const dataText = document.getElementById('data-excel').value;

        update(ref(db, 'master_data'), {
            santri: dataText
        }).then(() => {
            alert('Data Santri berhasil disimpan!');
        });
    });

    // Ambil data santri secara realtime
    onValue(ref(db, 'master_data/santri'), (snapshot) => {
        if (snapshot.exists()) {
            displaySantri.innerText = snapshot.val();
        } else {
            displaySantri.innerText = 'Belum ada data santri.';
        }
    });
}
