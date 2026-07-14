import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    setDoc, 
    deleteDoc,
    getDoc,
    arrayUnion,
    arrayRemove,
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyClHDzTGncpd_5-Gnc4zmL3JVrXX1tiGKQ",
    authDomain: "admin-hu-874c2.firebaseapp.com",
    projectId: "admin-hu-874c2",
    storageBucket: "admin-hu-874c2.firebasestorage.app",
    messagingSenderId: "419870283564",
    appId: "1:419870283564:web:18054f24b31b52eb7b7e89"
};

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
// 1. ADMIN KOBONG (Form Laporan, Detail Anggota & Riwayat Khusus)
// -----------------------------------------------------------
const formAbsensi = document.getElementById('form-absensi');
const totalAnggotaElem = document.getElementById('total-anggota');
const daftarAnggotaElem = document.getElementById('daftar-anggota-kobong');
const tabelRiwayatKobong = document.getElementById('tabel-riwayat-kobong');

if (formAbsensi) {
    const kobongKey = namaKobong.toUpperCase();

 // -----------------------------------------------------------
// 1. ADMIN KOBONG (Form Laporan, Detail Anggota & Riwayat Khusus)
// -----------------------------------------------------------
const formAbsensi = document.getElementById('form-absensi');
const totalAnggotaElem = document.getElementById('total-anggota');
const daftarAnggotaElem = document.getElementById('daftar-anggota-kobong');
const tabelRiwayatKobong = document.getElementById('tabel-riwayat-kobong');

if (formAbsensi) {
    const kobongKey = namaKobong.toUpperCase().trim();

    // A. BACA DATA ANGGOTA KOBONG DARI FIRESTORE (MASTER_SANTRI)
    onSnapshot(doc(db, "master_santri", kobongKey), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const anggotaList = data.anggota || [];

            if (totalAnggotaElem) {
                totalAnggotaElem.innerText = `Total Santri Terdaftar: ${anggotaList.length} Orang`;
            }

            if (daftarAnggotaElem) {
                if (anggotaList.length > 0) {
                    let htmlList = '<ol style="margin: 0; padding-left: 18px;">';
                    anggotaList.forEach(nama => {
                        htmlList += `<li>${nama}</li>`;
                    });
                    htmlList += '</ol>';
                    daftarAnggotaElem.innerHTML = htmlList;
                } else {
                    daftarAnggotaElem.innerHTML = '<span style="color:#888;">Belum ada santri terdaftar di kobong ini.</span>';
                }
            }
        } else {
            if (totalAnggotaElem) totalAnggotaElem.innerText = `Belum ada data untuk Kobong "${kobongKey}".`;
            if (daftarAnggotaElem) daftarAnggotaElem.innerHTML = '<small style="color:#888;">Silakan masukkan data santri di Super Admin terlebih dahulu.</small>';
        }
    });

    // B. KIRIM LAPORAN ABSENSI
    formAbsensi.addEventListener('submit', async (e) => {
        e.preventDefault();
        const waktu = document.getElementById('waktu').value;
        const status = document.querySelector('input[name="status"]:checked').value;
        const catatan = document.getElementById('catatan').value;

        try {
            await addDoc(collection(db, "laporan_absensi"), {
                kobong: kobongKey,
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

    // C. BACA RIWAYAT LAPORAN KHUSUS KOBONG INI
    if (tabelRiwayatKobong) {
        onSnapshot(collection(db, "laporan_absensi"), (snapshot) => {
            tabelRiwayatKobong.innerHTML = '';
            let count = 0;
            const listData = [];

            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                if (item.kobong === kobongKey) {
                    listData.push(item);
                }
            });

            // Sort manual dari yang terbaru
            listData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            listData.forEach((item) => {
                count++;
                const isApproved = item.status_konfirmasi === 'Approved';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
                    <td>${item.status}</td>
                    <td>${item.catatan ? item.catatan.replace(/\n/g, '<br>') : '-'}</td>
                    <td>
                        ${isApproved 
                            ? `<span class="status-approved">✓ Terkonfirmasi</span>` 
                            : `<span style="color: #f57c00; font-weight: bold;">⏳ Pending</span>`
                        }
                    </td>
                `;
                tabelRiwayatKobong.appendChild(row);
            });

            if (count === 0) {
                tabelRiwayatKobong.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada riwayat laporan untuk kobong ini.</td></tr>`;
            }
        });
    }
}
// -----------------------------------------------------------
// 2. SUPER ADMIN (Tabel dengan Filter & Grafik)
// -----------------------------------------------------------
const tabelLaporan = document.getElementById('tabel-laporan');
const filterKobong = document.getElementById('filter-kobong');
let chartKehadiran = null;
let rawLaporanData = []; // Menyimpan temporary data laporan

if (tabelLaporan) {
    const q = query(collection(db, "laporan_absensi"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        rawLaporanData = [];
        const setKobong = new Set();

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id;
            rawLaporanData.push(data);

            if (data.kobong) {
                setKobong.add(data.kobong);
            }
        });

        // 1. Update Pilihan Dropdown Filter secara Otomatis
        if (filterKobong) {
            const selectedVal = filterKobong.value;
            filterKobong.innerHTML = `<option value="ALL">-- Semua Kobong --</option>`;
            
            Array.from(setKobong).sort().forEach(namaKobong => {
                const opt = document.createElement('option');
                opt.value = namaKobong;
                opt.innerText = `Kobong ${namaKobong}`;
                filterKobong.appendChild(opt);
            });

            filterKobong.value = selectedVal; // Pertahankan pilihan user
        }

        // 2. Render Tabel dan Grafik
        renderTabelDanGrafik();
    });

    // Event Listener saat Dropdown Filter Diganti
    if (filterKobong) {
        filterKobong.addEventListener('change', () => {
            renderTabelDanGrafik();
        });
    }
}

// FUNGSI RENDER TABEL & GRAFIK
function renderTabelDanGrafik() {
    if (!tabelLaporan) return;

    tabelLaporan.innerHTML = '';
    const selectedFilter = filterKobong ? filterKobong.value : 'ALL';

    // Filter data berdasarkan pilihan kobong
    const filteredData = rawLaporanData.filter(item => {
        if (selectedFilter === 'ALL') return true;
        return item.kobong === selectedFilter;
    });

    if (filteredData.length === 0) {
        tabelLaporan.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada laporan untuk kobong ini.</td></tr>`;
    } else {
        filteredData.forEach((item) => {
            const isApproved = item.status_konfirmasi === 'Approved';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
                <td><strong>Kobong ${item.kobong}</strong></td>
                <td>${item.status}</td>
                <td>${item.catatan ? item.catatan.replace(/\n/g, '<br>') : '-'}</td>
                <td>
                    ${isApproved 
                        ? `<span class="status-approved">✓ Terkonfirmasi</span>` 
                        : `<button class="btn-approve" onclick="konfirmasiLaporan('${item.id}')">Konfirmasi</button>`
                    }
                </td>
            `;
            tabelLaporan.appendChild(row);
        });
    }

    // Hitung Rekap Keseluruhan untuk Grafik (Grafik tetap menampilkan semua kobong)
    const rekapKobong = {};
    rawLaporanData.forEach(item => {
        if (!rekapKobong[item.kobong]) {
            rekapKobong[item.kobong] = { total: 0, lengkap: 0 };
        }
        rekapKobong[item.kobong].total += 1;
        if (item.status === 'Lengkap') {
            rekapKobong[item.kobong].lengkap += 1;
        }
    });

    renderChart(rekapKobong);
}

// -----------------------------------------------------------
// 3. PAGE DATA SANTRI (Tambah & Hapus Santri/Kobong)
// -----------------------------------------------------------
const formSantriKobong = document.getElementById('form-santri-kobong');
const containerDaftarKobong = document.getElementById('container-daftar-kobong');

if (formSantriKobong) {
    // SIMPAN / TAMBAH SANTRI BARU
    formSantriKobong.addEventListener('submit', async (e) => {
        e.preventDefault();

        const namaKobongInput = document.getElementById('nama-kobong-input').value.trim().toUpperCase();
        const daftarSantriRaw = document.getElementById('daftar-santri-input').value.trim();
        const listSantriBaru = daftarSantriRaw.split('\n').map(nama => nama.trim()).filter(nama => nama !== '');

        const docRef = doc(db, "master_santri", namaKobongInput);

        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Jika Kobong Sudah Ada: Gabungkan nama baru (arrayUnion)
                await updateDoc(docRef, {
                    anggota: arrayUnion(...listSantriBaru),
                    updatedAt: new Date()
                });
            } else {
                // Jika Kobong Baru: Buat dokumen baru
                await setDoc(docRef, {
                    nama_kobong: namaKobongInput,
                    anggota: listSantriBaru,
                    updatedAt: new Date()
                });
            }

            alert(`Berhasil memperbarui data santri Kobong ${namaKobongInput}!`);
            formSantriKobong.reset();
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        }
    });

    // DISPLAY REALTIME DAN TOMBOL HAPUS
    onSnapshot(collection(db, "master_santri"), (snapshot) => {
        containerDaftarKobong.innerHTML = '';

        if (snapshot.empty) {
            containerDaftarKobong.innerHTML = '<p class="text-center">Belum ada data santri yang dimasukkan.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const dataKobong = docSnap.data();
            const idKobong = docSnap.id;
            const anggotaList = dataKobong.anggota || [];

            const boxKobong = document.createElement('div');
            boxKobong.className = 'master-santri-box';
            boxKobong.style.marginBottom = '16px';

            let listHTML = `
                <div style="margin-bottom: 12px; overflow: hidden;">
                    <button class="btn-delete-kobong" onclick="hapusKobong('${idKobong}')">Hapus Kobong</button>
                    <h3 style="color: #2e7d32; margin: 0;">Kobong ${dataKobong.nama_kobong} (${anggotaList.length} Santri)</h3>
                </div>
                <div style="font-size: 0.9rem;">
            `;

            if (anggotaList.length === 0) {
                listHTML += `<p style="color: #888;">Belum ada anggota di kobong ini.</p>`;
            } else {
                anggotaList.forEach((nama, index) => {
                    listHTML += `
                        <div class="santri-item">
                            <span>${index + 1}. ${nama}</span>
                            <button class="btn-delete-santri" onclick="hapusSantri('${idKobong}', '${nama}')">Hapus</button>
                        </div>
                    `;
                });
            }

            listHTML += `</div>`;
            boxKobong.innerHTML = listHTML;
            containerDaftarKobong.appendChild(boxKobong);
        });
    });
}

// FUNGSI HAPUS 1 SANTRI
window.hapusSantri = async function(idKobong, namaSantri) {
    if (confirm(`Yakin ingin menghapus ${namaSantri} dari Kobong ${idKobong}?`)) {
        try {
            await updateDoc(doc(db, "master_santri", idKobong), {
                anggota: arrayRemove(namaSantri)
            });
        } catch (err) {
            alert('Gagal menghapus santri: ' + err.message);
        }
    }
};

// FUNGSI HAPUS 1 KOBONG LENGKAP
window.hapusKobong = async function(idKobong) {
    if (confirm(`Yakin ingin MENGHAPUS SELURUH data Kobong ${idKobong}?`)) {
        try {
            await deleteDoc(doc(db, "master_santri", idKobong));
        } catch (err) {
            alert('Gagal menghapus kobong: ' + err.message);
        }
    }
};
