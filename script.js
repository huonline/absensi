// Import Firestore SDK via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    setDoc, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyClHDzTGncpd_5-Gnc4zmL3JVrXX1tiGKQ",
    authDomain: "admin-hu-874c2.firebaseapp.com",
    projectId: "admin-hu-874c2",
    storageBucket: "admin-hu-874c2.firebasestorage.app",
    messagingSenderId: "419870283564",
    appId: "1:419870283564:web:18054f24b31b52eb7b7e89"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Parameter URL Kobong
const urlParams = new URLSearchParams(window.location.search);
const namaKobong = urlParams.get('kobong') || 'Umum';

const headerTitle = document.getElementById('nama-kobong');
if (headerTitle) {
    headerTitle.innerText = `Laporan Absensi - Kobong ${namaKobong.toUpperCase()}`;
}

// -----------------------------------------------------------
// 1. ADMIN KOBONG (Form Laporan - Simpan ke Koleksi 'laporan_absensi')
// -----------------------------------------------------------
const formAbsensi = document.getElementById('form-absensi');
if (formAbsensi) {
    formAbsensi.addEventListener('submit', async (e) => {
        e.preventDefault();
        const waktu = document.getElementById('waktu').value;
        const status = document.querySelector('input[name="status"]:checked').value;
        const catatan = document.getElementById('catatan').value;

        try {
            await addDoc(collection(db, "laporan_absensi"), {
                kobong: namaKobong.toUpperCase(),
                waktu: waktu,
                status: status,
                catatan: catatan || '-',
                status_konfirmasi: 'Pending',
                createdAt: new Date(),
                tanggal: new Date().toLocaleDateString('id-ID'),
                jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            });

            alert('Laporan berhasil dikirim!');
            formAbsensi.reset();
        } catch (err) {
            alert('Gagal mengirim: ' + err.message);
        }
    });
}

// -----------------------------------------------------------
// 2. SUPER ADMIN (Tabel Laporan & Grafik)
// -----------------------------------------------------------
const tabelLaporan = document.getElementById('tabel-laporan');
let chartKehadiran = null;

if (tabelLaporan) {
    // Query Firestore: Urutkan dari laporan terbaru
    const q = query(collection(db, "laporan_absensi"), orderBy("createdAt", "desc"));

    // Realtime Listener Firestore
    onSnapshot(q, (snapshot) => {
        tabelLaporan.innerHTML = '';

        if (snapshot.empty) {
            tabelLaporan.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada laporan masuk.</td></tr>`;
            return;
        }

        const rekapKobong = {};

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const docId = docSnap.id;
            const isApproved = item.status_konfirmasi === 'Approved';

            // Hitung Rekap untuk Grafik
            if (!rekapKobong[item.kobong]) {
                rekapKobong[item.kobong] = { total: 0, lengkap: 0 };
            }
            rekapKobong[item.kobong].total += 1;
            if (item.status === 'Lengkap') {
                rekapKobong[item.kobong].lengkap += 1;
            }

            // Render Tabel
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
                <td><strong>Kobong ${item.kobong}</strong></td>
                <td>${item.status}</td>
                <td>${item.catatan ? item.catatan.replace(/\n/g, '<br>') : '-'}</td>
                <td>
                    ${isApproved 
                        ? `<span class="status-approved">✓ Terkonfirmasi</span>` 
                        : `<button class="btn-approve" onclick="konfirmasiLaporan('${docId}')">Konfirmasi</button>`
                    }
                </td>
            `;
            tabelLaporan.appendChild(row);
        });

        // Render Grafik
        renderChart(rekapKobong);
    });
}

// Render Grafik Chart.js
function renderChart(rekapKobong) {
    const ctx = document.getElementById('grafikKehadiran');
    if (!ctx) return;

    const labels = Object.keys(rekapKobong);
    const dataPersentase = labels.map(k => {
        const total = rekapKobong[k].total;
        const lengkap = rekapKobong[k].lengkap;
        return Math.round((lengkap / total) * 100);
    });

    if (chartKehadiran) {
        chartKehadiran.destroy();
    }

    chartKehadiran = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => `Kobong ${l}`),
            datasets: [{
                label: 'Persentase Kehadiran (%)',
                data: dataPersentase,
                backgroundColor: '#2e7d32',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' }
                }
            }
        }
    });
}

// Fungsi Konfirmasi Document Firestore
window.konfirmasiLaporan = async function(docId) {
    try {
        const docRef = doc(db, "laporan_absensi", docId);
        await updateDoc(docRef, {
            status_konfirmasi: 'Approved'
        });
    } catch (err) {
        alert('Gagal mengonfirmasi: ' + err.message);
    }
};

// -----------------------------------------------------------
// 3. PAGE DATA SANTRI (Simpan ke Dokumen Firestore 'master/santri')
// -----------------------------------------------------------
const formExcel = document.getElementById('form-excel');
const displaySantri = document.getElementById('display-santri');

if (formExcel) {
    formExcel.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dataText = document.getElementById('data-excel').value;

        try {
            await setDoc(doc(db, "master", "santri"), {
                data: dataText
            });
            alert('Data Santri berhasil disimpan!');
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        }
    });

    // Read Data Santri
    onSnapshot(doc(db, "master", "santri"), (docSnap) => {
        if (docSnap.exists()) {
            displaySantri.innerText = docSnap.data().data;
        } else {
            displaySantri.innerText = 'Belum ada data santri.';
        }
    });
}
