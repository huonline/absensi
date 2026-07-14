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

// -----------------------------------------------------------
// BACA PARAMETER URL KOBONG
// -----------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const rawKobong = urlParams.get('kobong') || '';
const namaKobong = decodeURIComponent(rawKobong).trim().toUpperCase();

const headerTitle = document.getElementById('nama-kobong');
if (headerTitle) {
    if (namaKobong) {
        headerTitle.innerText = `Laporan Absensi - Kobong ${namaKobong}`;
    } else {
        headerTitle.innerText = `Laporan Absensi Kobong`;
    }
}

// -----------------------------------------------------------
// 1. ADMIN KOBONG (Form Laporan, Detail Pengurus & Riwayat)
// -----------------------------------------------------------
const formAbsensi = document.getElementById('form-absensi');
const detailPengurusElem = document.getElementById('detail-pengurus');
const totalAnggotaElem = document.getElementById('total-anggota');
const daftarAnggotaElem = document.getElementById('daftar-anggota-kobong');
const tabelRiwayatKobong = document.getElementById('tabel-riwayat-kobong');

if (formAbsensi) {
    if (namaKobong) {
        // A. BACA DATA PENGURUS & ANGGOTA DARI FIRESTORE
        onSnapshot(doc(db, "master_santri", namaKobong), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const anggotaList = data.anggota || [];

                if (detailPengurusElem) {
                    detailPengurusElem.innerHTML = `
                        <strong>Ketua:</strong> ${data.ketua || '-'}<br>
                        <strong>Wakil:</strong> ${data.wakil || '-'}
                    `;
                }

                if (totalAnggotaElem) {
                    totalAnggotaElem.innerText = `Daftar Anggota (${anggotaList.length} Santri):`;
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
                        daftarAnggotaElem.innerHTML = '<span style="color:#888;">Belum ada anggota terdaftar.</span>';
                    }
                }
            } else {
                if (detailPengurusElem) detailPengurusElem.innerText = `Data Kobong "${namaKobong}" belum diinput di Super Admin.`;
                if (daftarAnggotaElem) daftarAnggotaElem.innerHTML = '';
            }
        });
    }

    // B. KIRIM LAPORAN ABSENSI
    formAbsensi.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!namaKobong) {
            alert('Gagal mengirim: Nama kobong tidak terdeteksi di URL!');
            return;
        }

        const namaPelapor = document.getElementById('nama-pelapor').value.trim();
        const waktu = document.getElementById('waktu').value;
        const status = document.querySelector('input[name="status"]:checked').value;
        const catatan = document.getElementById('catatan').value.trim();

        try {
            await addDoc(collection(db, "laporan_absensi"), {
                kobong: namaKobong,
                nama: namaPelapor,
                waktu: waktu,
                status: status,
                catatan: catatan || '-',
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
    if (tabelRiwayatKobong && namaKobong) {
        onSnapshot(collection(db, "laporan_absensi"), (snapshot) => {
            tabelRiwayatKobong.innerHTML = '';
            const listData = [];

            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                if (item.kobong === namaKobong) {
                    listData.push(item);
                }
            });

            listData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            if (listData.length === 0) {
                tabelRiwayatKobong.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada riwayat laporan untuk kobong ini.</td></tr>`;
            } else {
                listData.forEach((item) => {
                    const row = document.createElement('tr');
                   row.innerHTML = `
    <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
    <td><strong>Kobong ${item.kobong}</strong></td>
    <td>${item.nama || '-'}</td>
    <td style="white-space: pre-line;">${item.catatan || '-'}</td>
    <td><span style="color: #2e7d32; font-weight: bold;">${item.status}</span></td>
`;
                    tabelRiwayatKobong.appendChild(row);
                });
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
let rawLaporanData = [];

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

        if (filterKobong) {
            const selectedVal = filterKobong.value;
            filterKobong.innerHTML = `<option value="ALL">-- Lihat Semua Kobong --</option>`;
            
            Array.from(setKobong).sort().forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.innerText = `Kobong ${k}`;
                filterKobong.appendChild(opt);
            });

            filterKobong.value = selectedVal;
        }

        renderTabelDanGrafik();
    });

    if (filterKobong) {
        filterKobong.addEventListener('change', () => {
            renderTabelDanGrafik();
        });
    }
}

function renderTabelDanGrafik() {
    if (!tabelLaporan) return;

    tabelLaporan.innerHTML = '';
    const selectedFilter = filterKobong ? filterKobong.value : 'ALL';

    const filteredData = rawLaporanData.filter(item => {
        if (selectedFilter === 'ALL') return true;
        return item.kobong === selectedFilter;
    });

    if (filteredData.length === 0) {
        tabelLaporan.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada laporan untuk kobong ini.</td></tr>`;
    } else {
        filteredData.forEach((item) => {
            const row = document.createElement('tr');
           row.innerHTML = `
    <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
    <td><strong>Kobong ${item.kobong}</strong></td>
    <td>${item.nama || '-'}</td>
    <td style="white-space: pre-line;">${item.catatan || '-'}</td>
    <td><span style="color: #2e7d32; font-weight: bold;">${item.status}</span></td>
`;
            tabelLaporan.appendChild(row);
        });
    }

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

// -----------------------------------------------------------
// 3. PAGE DATA SANTRI (Ketua, Wakil, Anggota)
// -----------------------------------------------------------
const formSantriKobong = document.getElementById('form-santri-kobong');
const containerDaftarKobong = document.getElementById('container-daftar-kobong');

if (formSantriKobong) {
    formSantriKobong.addEventListener('submit', async (e) => {
        e.preventDefault();

        const namaKobongInput = document.getElementById('nama-kobong-input').value.trim().toUpperCase();
        const ketuaInput = document.getElementById('ketua-input').value.trim();
        const wakilInput = document.getElementById('wakil-input').value.trim();
        const daftarSantriRaw = document.getElementById('daftar-santri-input').value.trim();
        const listSantriBaru = daftarSantriRaw.split('\n').map(nama => nama.trim()).filter(nama => nama !== '');

        const docRef = doc(db, "master_santri", namaKobongInput);

        try {
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    ketua: ketuaInput,
                    wakil: wakilInput,
                    anggota: arrayUnion(...listSantriBaru),
                    updatedAt: new Date()
                });
            } else {
                await setDoc(docRef, {
                    nama_kobong: namaKobongInput,
                    ketua: ketuaInput,
                    wakil: wakilInput,
                    anggota: listSantriBaru,
                    updatedAt: new Date()
                });
            }

            alert(`Berhasil menyimpan data Kobong ${namaKobongInput}!`);
            formSantriKobong.reset();
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        }
    });

    onSnapshot(collection(db, "master_santri"), (snapshot) => {
        containerDaftarKobong.innerHTML = '';

        if (snapshot.empty) {
            containerDaftarKobong.innerHTML = '<p class="text-center">Belum ada data kobong yang dimasukkan.</p>';
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
                    <h3 style="color: #2e7d32; margin: 0;">Kobong ${dataKobong.nama_kobong}</h3>
                    <p style="margin: 4px 0; font-size: 0.85rem; color: #1b5e20;">
                        <strong>Ketua:</strong> ${dataKobong.ketua || '-'} | <strong>Wakil:</strong> ${dataKobong.wakil || '-'}
                    </p>
                </div>
                <div style="font-size: 0.9rem;">
                    <strong>Anggota (${anggotaList.length} Santri):</strong>
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

window.hapusKobong = async function(idKobong) {
    if (confirm(`Yakin ingin MENGHAPUS SELURUH data Kobong ${idKobong}?`)) {
        try {
            await deleteDoc(doc(db, "master_santri", idKobong));
        } catch (err) {
            alert('Gagal menghapus kobong: ' + err.message);
        }
    }
};

// -----------------------------------------------------------
// FUNGSI SALIN REKAP UNTUK RAPAT / WHATSAPP
// -----------------------------------------------------------
window.salinRekapTeks = function() {
    if (!rawLaporanData || rawLaporanData.length === 0) {
        alert('Belum ada data laporan untuk disalin!');
        return;
    }

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

    let teksRekap = `*REKAP ABSENSI KOBONG SANTRI*\n`;
    teksRekap += `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n`;
    teksRekap += `=============================\n\n`;

    const sortedKobong = Object.keys(rekapKobong).sort();
    sortedKobong.forEach(k => {
        const total = rekapKobong[k].total;
        const lengkap = rekapKobong[k].lengkap;
        const persen = Math.round((lengkap / total) * 100);
        teksRekap += `• *Kobong ${k}*: ${persen}% (${lengkap}/${total} Laporan Lengkap)\n`;
    });

    teksRekap += `\n=============================\n`;
    teksRekap += `_Dicetak otomatis dari Sistem Absensi Santri_`;

    navigator.clipboard.writeText(teksRekap).then(() => {
        alert('Ringkasan Rekap Kehadiran berhasil disalin!\nBisa langsung di-paste ke WhatsApp / Catatan Rapat.');
    }).catch(err => {
        alert('Gagal menyalin: ' + err.message);
    });
};
