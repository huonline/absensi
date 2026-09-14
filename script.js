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
// FUNGSI CEK & KUNCI JAM (22:30 - 23:30 WIB)
// -----------------------------------------------------------
function cekBatasWaktuAbsensi() {
    const sekarang = new Date();
    const jam = sekarang.getHours();
    const menit = sekarang.getMinutes();
    const totalMenitSekarang = (jam * 60) + menit;

    const jamBuka = (22 * 60) + 30;  // 22:30 WIB (1350 menit)
    const jamTutup = (23 * 60) + 30; // 23:30 WIB (1410 menit)

    return (totalMenitSekarang >= jamBuka && totalMenitSekarang <= jamTutup);
}

// -----------------------------------------------------------
// 1. ADMIN KOBONG (Form Laporan Ceklis, Detail Pengurus & Riwayat)
// -----------------------------------------------------------
const formAbsensi = document.getElementById('form-absensi');
const detailPengurusElem = document.getElementById('detail-pengurus');
const totalAnggotaElem = document.getElementById('total-anggota');
const daftarAnggotaElem = document.getElementById('daftar-anggota-kobong');
const containerCeklisSantri = document.getElementById('container-ceklis-santri');
const tabelRiwayatKobong = document.getElementById('tabel-riwayat-kobong');

let listAnggotaKobong = [];

if (formAbsensi) {
    if (namaKobong) {
        // A. BACA DATA PENGURUS & GENERATE FORM CEKLIS SANTRI DARI FIRESTORE
        onSnapshot(doc(db, "master_santri", namaKobong), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                listAnggotaKobong = data.anggota || [];

                if (detailPengurusElem) {
                    detailPengurusElem.innerHTML = `
                        <strong>Ketua:</strong> ${data.ketua || '-'}<br>
                        <strong>Wakil:</strong> ${data.wakil || '-'}
                    `;
                }

                if (totalAnggotaElem) {
                    totalAnggotaElem.innerText = `Daftar Anggota (${listAnggotaKobong.length} Santri):`;
                }

                if (daftarAnggotaElem) {
                    if (listAnggotaKobong.length > 0) {
                        let htmlList = '<ol style="margin: 0; padding-left: 18px;">';
                        listAnggotaKobong.forEach(nama => {
                            htmlList += `<li>${nama}</li>`;
                        });
                        htmlList += '</ol>';
                        daftarAnggotaElem.innerHTML = htmlList;
                    } else {
                        daftarAnggotaElem.innerHTML = '<span style="color:#888;">Belum ada anggota terdaftar.</span>';
                    }
                }

                // GENERATE ITEM CEKLIS DI FORMULIR
                if (containerCeklisSantri) {
                    containerCeklisSantri.innerHTML = '';

                    if (listAnggotaKobong.length === 0) {
                        containerCeklisSantri.innerHTML = '<p style="color: #c62828;">Belum ada santri terdaftar di kobong ini. Tambahkan data santri terlebih dahulu di Super Admin.</p>';
                    } else {
                        listAnggotaKobong.forEach((namaSantri, idx) => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'item-ceklis-santri';
                            
                            itemDiv.innerHTML = `
                                <span class="nama-santri-label">${idx + 1}. ${namaSantri}</span>
                                <div class="opsi-kehadiran-group">
                                    <label><input type="radio" name="status_santri_${idx}" value="Hadir" checked> Hadir</label>
                                    <label><input type="radio" name="status_santri_${idx}" value="Sakit"> Sakit</label>
                                    <label><input type="radio" name="status_santri_${idx}" value="Izin"> Izin</label>
                                    <label><input type="radio" name="status_santri_${idx}" value="Alfa"> Alfa</label>
                                </div>
                            `;
                            containerCeklisSantri.appendChild(itemDiv);
                        });
                    }
                }
            } else {
                if (detailPengurusElem) detailPengurusElem.innerText = `Data Kobong "${namaKobong}" belum diinput di Super Admin.`;
                if (daftarAnggotaElem) daftarAnggotaElem.innerHTML = '';
                if (containerCeklisSantri) containerCeklisSantri.innerHTML = '<p style="color: #888;">Data kobong tidak ditemukan.</p>';
            }
        });
    }

    // B. KIRIM LAPORAN ABSENSI CEKLIS (PROTEKSI KETAT)
    formAbsensi.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!namaKobong) {
            alert('Gagal mengirim: Nama kobong tidak terdeteksi di URL!');
            return;
        }

        // 1. CEK WAKTU AKSES (22:30 - 23:30)
        if (!cekBatasWaktuAbsensi()) {
            alert('⚠️ AKSES DITUTUP!\nLaporan absensi hanya dapat dikirim pada pukul 22:30 - 23:30 WIB.');
            return;
        }

        const sekarang = new Date();
        const tanggalHariIni = sekarang.toLocaleDateString('id-ID');
        const waktuTerpilih = document.getElementById('waktu').value;
        const keyAbsen = `absen_${namaKobong}_${tanggalHariIni}_${waktuTerpilih}`;

        // 2. CEK ANTI-SPAM (SUDAH ABSEN HARI INI)
        if (localStorage.getItem(keyAbsen)) {
            alert(`⚠️ Kobong ${namaKobong} sudah mengirimkan laporan absensi (${waktuTerpilih}) hari ini!`);
            return;
        }

        if (listAnggotaKobong.length === 0) {
            alert('Gagal mengirim: Tidak ada santri yang dapat di-absen.');
            return;
        }

        const btnSubmit = formAbsensi.querySelector('button[type="submit"]');
        const namaPelapor = document.getElementById('nama-pelapor').value.trim();
        const catatan = document.getElementById('catatan').value.trim();

        // Kumpulkan data presensi
        const detailPresensi = [];
        let jumlahHadir = 0, jumlahSakit = 0, jumlahIzin = 0, jumlahAlfa = 0;
        const santriTidakHadir = [];

        listAnggotaKobong.forEach((namaSantri, idx) => {
            const radio = document.querySelector(`input[name="status_santri_${idx}"]:checked`);
            const statusSelected = radio ? radio.value : 'Hadir';
            
            detailPresensi.push({ nama: namaSantri, status: statusSelected });

            if (statusSelected === 'Hadir') {
                jumlahHadir++;
            } else {
                if (statusSelected === 'Sakit') jumlahSakit++;
                if (statusSelected === 'Izin') jumlahIzin++;
                if (statusSelected === 'Alfa') jumlahAlfa++;
                santriTidakHadir.push(`${namaSantri} (${statusSelected})`);
            }
        });

        const statusGlobal = (jumlahHadir === listAnggotaKobong.length) ? 'Lengkap' : 'Tidak Lengkap';
        
        let catatanFinal = catatan;
        if (santriTidakHadir.length > 0) {
            const rincian = `Tidak Hadir: ${santriTidakHadir.join(', ')}`;
            catatanFinal = catatan ? `${catatan}\n${rincian}` : rincian;
        }

        try {
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Mengirim...';

            await addDoc(collection(db, "laporan_absensi"), {
                kobong: namaKobong,
                nama: namaPelapor,
                waktu: waktuTerpilih,
                status: statusGlobal,
                catatan: catatanFinal || '-',
                detail_presensi: detailPresensi,
                ringkasan: {
                    total: listAnggotaKobong.length,
                    hadir: jumlahHadir,
                    sakit: jumlahSakit,
                    izin: jumlahIzin,
                    alfa: jumlahAlfa
                },
                createdAt: new Date(),
                tanggal: tanggalHariIni,
                jam: sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            });

            localStorage.setItem(keyAbsen, 'true');

            alert('Laporan absensi berhasil dikirim!');
            formAbsensi.reset();
        } catch (err) {
            alert('Gagal mengirim laporan: ' + err.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Kirim Laporan Absensi';
        }
    });

    // C. BACA RIWAYAT LAPORAN
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
                    const statusColor = item.status === 'Lengkap' ? '#2e7d32' : '#c62828';
                    
                    row.innerHTML = `
                        <td><strong>${item.waktu}</strong><br><small>${item.tanggal} (${item.jam})</small></td>
                        <td><strong>Kobong ${item.kobong}</strong></td>
                        <td>${item.nama || '-'}</td>
                        <td style="white-space: pre-line;">${item.catatan || '-'}</td>
                        <td><span style="color: ${statusColor}; font-weight: bold;">${item.status}</span></td>
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
// 3. PAGE DATA SANTRI (Render + Generasi Link Unik)
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

    // RENDER KARTU KOBONG LENGKAP DENGAN LINK UNIK
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

            // MEMBUAT LINK UNIK
            const kodeUnik = buatKodeUnikKobong(idKobong);
            const linkUnik = buatLinkAbsensiUnik(idKobong);

            const boxKobong = document.createElement('div');
            boxKobong.className = 'master-santri-box';
            boxKobong.style.marginBottom = '16px';

            let listHTML = `
                <div style="margin-bottom: 12px; overflow: hidden;">
                    <button class="btn-delete-kobong" onclick="hapusKobong('${idKobong}')">Hapus Kobong</button>
                    <button class="btn-edit-pengurus" onclick="editPengurusKobong('${idKobong}', '${dataKobong.ketua || ''}', '${dataKobong.wakil || ''}')">✏️ Edit Pengurus</button>
                    <h3 style="color: #2e7d32; margin: 0;">Kobong ${dataKobong.nama_kobong}</h3>
                    <p style="margin: 6px 0 4px 0; font-size: 0.85rem; color: #1b5e20;">
                        <strong>Ketua:</strong> ${dataKobong.ketua || '-'} | <strong>Wakil:</strong> ${dataKobong.wakil || '-'}
                    </p>
                </div>
                
                <!-- BOX LINK UNIK (DIPASTIKAN MUNCUL) -->
                <div style="margin:10px 0 14px; padding:10px 12px; border:1px solid #c8e6c9; border-radius:8px; background:#f1f8e9;">
                    <div style="font-size:0.85rem; margin-bottom:4px; color:#2e7d32;"><strong>🔗 Link Unik Absensi:</strong></div>
                    <div style="font-size:0.75rem; color:#444; word-break:break-all; margin-bottom:8px; background:#ffffff; padding:6px 8px; border-radius:4px; border:1px solid #dcdcdc;">${linkUnik}</div>
                    <button type="button" onclick="salinLinkAbsensi('${linkUnik}', this)" style="border:0; border-radius:6px; padding:6px 14px; background:#2e7d32; color:#ffffff; font-size:0.8rem; font-weight:600; cursor:pointer;">Salin Link Absensi</button>
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

// FUNGSI UNTUK SALIN LINK UNIK KE CLIPBOARD
window.salinLinkAbsensi = async function(link, buttonEl) {
    try {
        await navigator.clipboard.writeText(link);
        const textAwal = buttonEl.textContent;
        buttonEl.textContent = '✓ Link Tersalin';
        buttonEl.style.background = '#1b5e20';
        setTimeout(() => { 
            buttonEl.textContent = textAwal; 
            buttonEl.style.background = '#2e7d32';
        }, 1500);
    } catch (err) {
        window.prompt('Salin link absensi berikut:', link);
    }
};

// FUNGSI UNTUK EDIT / GANTI KETUA DAN WAKIL KOBONG
window.editPengurusKobong = async function(idKobong, ketuaLama, wakilLama) {
    const ketuaBaru = prompt(`Masukkan nama Ketua baru untuk Kobong ${idKobong}:`, ketuaLama);
    if (ketuaBaru === null) return;

    const wakilBaru = prompt(`Masukkan nama Wakil baru untuk Kobong ${idKobong}:`, wakilLama);
    if (wakilBaru === null) return;

    try {
        await updateDoc(doc(db, "master_santri", idKobong), {
            ketua: ketuaBaru.trim(),
            wakil: wakilBaru.trim(),
            updatedAt: new Date()
        });
        alert(`Berhasil memperbarui Ketua & Wakil Kobong ${idKobong}!`);
    } catch (err) {
        alert('Gagal memperbarui pengurus: ' + err.message);
    }
};

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
