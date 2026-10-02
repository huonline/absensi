import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, 
    updateDoc, setDoc, deleteDoc, getDoc, arrayUnion, 
    arrayRemove, query, orderBy, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ===========================================================
// KONFIGURASI FIREBASE
// ===========================================================
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
const auth = getAuth(app);

let namaKobongAktif = null;
let listAnggotaAktif = [];

// ===========================================================
// 0. SISTEM KEAMANAN & NAVIGASI KIRI ATAS
// ===========================================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        if (!window.location.href.includes('login.html')) {
            window.location.replace('login.html');
        }
    } else {
        pasangMenuNavigasi(user);
        jalankanAplikasi(user);
    }
});

window.logoutApp = function() {
    signOut(auth).then(() => {
        window.location.replace('login.html');
    }).catch((error) => {
        alert("Gagal keluar: " + error.message);
    });
};

function pasangMenuNavigasi(user) {
    if (document.getElementById('nav-menu-kiri')) return; 
    
    const username = user.email.split('@')[0];
    
    const htmlNav = `
        <div id="nav-menu-kiri" style="position: fixed; top: 15px; left: 15px; z-index: 9999;">
            <button id="btn-toggle-menu" style="background: #2e7d32; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 6px;">
                ☰ <span style="font-size: 0.9rem;">Menu</span>
            </button>
            
            <div id="dropdown-menu" style="display: none; position: absolute; top: 45px; left: 0; background: white; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 190px; overflow: hidden; font-family: sans-serif;">
                <div style="padding: 12px; background: #e8f5e9; border-bottom: 1px solid #c8e6c9; font-size: 0.9rem; font-weight: bold; color: #1b5e20;">
                    👤 Akun: ${username}
                </div>
                <div style="display:flex; flex-direction: column;">
                    <button onclick="alert('Pilihan & Pengaturan sedang dalam tahap pengembangan.')" style="text-align:left; padding: 12px; background: none; border: none; border-bottom: 1px solid #eee; width: 100%; cursor: pointer; font-size: 0.95rem; color: #333;">⚙️ Pilihan</button>
                    <button onclick="logoutApp()" style="text-align:left; padding: 12px; background: none; border: none; border-bottom: 1px solid #eee; width: 100%; cursor: pointer; font-size: 0.95rem; color: #333;">🔄 Beralih Akun</button>
                    <button onclick="logoutApp()" style="text-align:left; padding: 12px; background: none; border: none; width: 100%; color: #c62828; font-weight:bold; cursor: pointer; font-size: 0.95rem;">🚪 Logout</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', htmlNav);

    document.getElementById('btn-toggle-menu').addEventListener('click', (e) => {
        e.stopPropagation(); 
        const dropdown = document.getElementById('dropdown-menu');
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', (e) => {
        const menuKiri = document.getElementById('nav-menu-kiri');
        if (menuKiri && !menuKiri.contains(e.target)) {
            document.getElementById('dropdown-menu').style.display = 'none';
        }
    });
}

// ===========================================================
// FUNGSI CEK & KUNCI JAM (22:30 - 23:30 WIB)
// ===========================================================
function cekBatasWaktuAbsensi() {
    const sekarang = new Date();
    const jam = sekarang.getHours();
    const menit = sekarang.getMinutes();
    const totalMenitSekarang = (jam * 60) + menit;
    const jamBuka = (22 * 60) + 30;  
    const jamTutup = (24 * 60); 
    return (totalMenitSekarang >= jamBuka && totalMenitSekarang <= jamTutup);
}

// ===========================================================
// JALANKAN APLIKASI UTAMA
// ===========================================================
function jalankanAplikasi(user) {

    // -----------------------------------------------------------
    // 1. ADMIN KOBONG (Form Absensi)
    // -----------------------------------------------------------
    const formAbsensi = document.getElementById('form-absensi');
    const headerTitle = document.getElementById('nama-kobong');
    const infoSection = document.getElementById('detail-pengurus')?.parentElement;

    if (formAbsensi) {
        const qAuth = query(collection(db, "master_santri"), where("email_pengurus", "==", user.email));
        
        onSnapshot(qAuth, (snapshot) => {
            const daftarKobongDimiliki = [];
            snapshot.forEach(docSnap => {
                daftarKobongDimiliki.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (daftarKobongDimiliki.length === 0) {
                if (headerTitle) headerTitle.innerText = "Akses Ditolak";
                formAbsensi.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#c62828;">
                    <h3>⚠️ Akses Kosong</h3>
                    <p>Akun Anda belum ditugaskan untuk mengelola Kobong manapun.</p>
                </div>`;
                if (infoSection) infoSection.style.display = 'none';
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);
            const kobongDipilih = urlParams.get('kbg'); 
            const dataKobongAktif = daftarKobongDimiliki.find(k => k.id === kobongDipilih);

            if (daftarKobongDimiliki.length > 1 && !dataKobongAktif) {
                if (headerTitle) headerTitle.innerText = "Pilih Kobong";
                if (infoSection) infoSection.style.display = 'none';
                
                let menuHTML = `<div style="text-align:center; margin-bottom:20px;">
                    <p>Anda memegang <strong>${daftarKobongDimiliki.length} Kobong</strong>. Silakan pilih:</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">`;
                
                daftarKobongDimiliki.forEach(kbg => {
                    menuHTML += `<button type="button" onclick="window.location.href='?kbg=${kbg.id}'" 
                        style="padding:16px; background:#2e7d32; color:white; border:none; border-radius:8px; font-size:1.1rem; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                        📋 Masuk Absensi Kobong ${kbg.nama_kobong}
                    </button>`;
                });
                menuHTML += `</div>`;
                
                formAbsensi.innerHTML = menuHTML;
                return;
            }

            const targetData = dataKobongAktif || daftarKobongDimiliki[0];
            renderFormCeklis(targetData);
        });
    }

    function renderFormCeklis(dataKobong) {
        namaKobongAktif = dataKobong.nama_kobong;
        listAnggotaAktif = dataKobong.anggota || [];

        const detailPengurusElem = document.getElementById('detail-pengurus');
        const totalAnggotaElem = document.getElementById('total-anggota');
        const containerCeklisSantri = document.getElementById('container-ceklis-santri');
        const headerTitleLocal = document.getElementById('nama-kobong');

        if (infoSection) infoSection.style.display = 'block';
        if (headerTitleLocal) headerTitleLocal.innerText = `Absensi Kobong ${namaKobongAktif}`;
        
        if (detailPengurusElem) {
            detailPengurusElem.innerHTML = `<strong>Ketua:</strong> ${dataKobong.ketua || '-'}<br><strong>Wakil:</strong> ${dataKobong.wakil || '-'}`;
        }
        if (totalAnggotaElem) {
            totalAnggotaElem.innerText = `Anggota (${listAnggotaAktif.length} Santri):`;
        }

        if (containerCeklisSantri) {
            containerCeklisSantri.innerHTML = '';
            if (listAnggotaAktif.length === 0) {
                containerCeklisSantri.innerHTML = '<p style="color: #c62828;">Belum ada santri terdaftar.</p>';
            } else {
                listAnggotaAktif.forEach((namaSantri, idx) => {
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
        
        const tabelRiwayatKobong = document.getElementById('tabel-riwayat-kobong');
        if (tabelRiwayatKobong) {
            onSnapshot(collection(db, "laporan_absensi"), (snapshot) => {
                tabelRiwayatKobong.innerHTML = '';
                const listData = [];
                snapshot.forEach(docSnap => {
                    const item = docSnap.data();
                    if (item.kobong === namaKobongAktif) listData.push(item);
                });
                listData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                
                if (listData.length === 0) {
                    tabelRiwayatKobong.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada riwayat.</td></tr>`;
                } else {
                    listData.forEach(item => {
                        const statusColor = item.status === 'Lengkap' ? '#2e7d32' : '#c62828';
                        const row = document.createElement('tr');
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

    if (formAbsensi && !formAbsensi.dataset.listenerAttached) {
        formAbsensi.dataset.listenerAttached = 'true';
        formAbsensi.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!namaKobongAktif) return;
            if (!cekBatasWaktuAbsensi()) return alert('⚠️ AKSES DITUTUP!\nLaporan absensi hanya dapat dikirim pada pukul 22:30 - 24:30 WIB.');
            
            const sekarang = new Date();
            const tglInfo = sekarang.toLocaleDateString('id-ID'); // Format: DD/MM/YYYY
            const tglISO = sekarang.toISOString().split('T')[0];  // Format: YYYY-MM-DD
            const waktuInfo = document.getElementById('waktu').value;
            const btnSubmit = formAbsensi.querySelector('button[type="submit"]');

            if (listAnggotaAktif.length === 0) return alert('Tidak ada santri yang dapat di-absen.');

            try {
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Memeriksa Database...';

                // ANTI DOUBLE-SUBMIT (DATABASE LEVEL)
                const qCek = query(
                    collection(db, "laporan_absensi"),
                    where("kobong", "==", namaKobongAktif),
                    where("tanggal", "==", tglInfo),
                    where("waktu", "==", waktuInfo)
                );
                
                const cekSnapshot = await getDocs(qCek);
                
                if (!cekSnapshot.empty) {
                    alert(`⚠️ GAGAL DIKIRIM!\nLaporan absensi Kobong ${namaKobongAktif} sesi ${waktuInfo} hari ini SUDAH DIKIRIM (mungkin oleh perangkat/pengurus lain).`);
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Kirim Laporan';
                    return; 
                }

                btnSubmit.innerText = 'Mengirim...';
                
                const namaPelapor = document.getElementById('nama-pelapor').value.trim();
                const catatan = document.getElementById('catatan').value.trim();

                const detailPresensi = [];
                let hadir = 0, sakit = 0, izin = 0, alfa = 0;
                const santriTidakHadir = [];

                listAnggotaAktif.forEach((nama, idx) => {
                    const radio = document.querySelector(`input[name="status_santri_${idx}"]:checked`);
                    const stat = radio ? radio.value : 'Hadir';
                    detailPresensi.push({ nama, status: stat });
                    
                    if (stat === 'Hadir') hadir++;
                    else {
                        if (stat === 'Sakit') sakit++;
                        if (stat === 'Izin') izin++;
                        if (stat === 'Alfa') alfa++;
                        santriTidakHadir.push(`${nama} (${stat})`);
                    }
                });

                const statusGlobal = (hadir === listAnggotaAktif.length) ? 'Lengkap' : 'Tidak Lengkap';
                let catatanFinal = catatan;
                if (santriTidakHadir.length > 0) {
                    const rincian = `Tidak Hadir: ${santriTidakHadir.join(', ')}`;
                    catatanFinal = catatan ? `${catatan}\n${rincian}` : rincian;
                }

                await addDoc(collection(db, "laporan_absensi"), {
                    kobong: namaKobongAktif, 
                    nama: namaPelapor, 
                    waktu: waktuInfo, 
                    status: statusGlobal,
                    catatan: catatanFinal || '-', 
                    detail_presensi: detailPresensi,
                    ringkasan: { total: listAnggotaAktif.length, hadir, sakit, izin, alfa },
                    createdAt: new Date(), 
                    tanggal: tglInfo,
                    tanggalISO: tglISO,
                    jam: sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                });
                
                alert('Berhasil dikirim!');
                window.location.reload();
            } catch (err) {
                alert('Gagal mengirim: ' + err.message);
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Kirim Laporan';
            }
        });
    }

    // -----------------------------------------------------------
    // 2. SUPER ADMIN (Manajemen Tabel + Penyekat Hari & Fitur Cari)
    // -----------------------------------------------------------
    const tabelLaporan = document.getElementById('tabel-laporan');
    const filterKobong = document.getElementById('filter-kobong');
    const filterTanggal = document.getElementById('filter-tanggal');
    const btnResetTanggal = document.getElementById('btn-reset-tanggal');
    const cariTeks = document.getElementById('cari-teks');

    let chartKehadiran = null;
    let rawLaporanData = [];

    if (tabelLaporan) {
        const q = query(collection(db, "laporan_absensi"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            rawLaporanData = [];
            const setKobong = new Set();
            
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                data.id = docSnap.id;
                rawLaporanData.push(data);
                if (data.kobong) setKobong.add(data.kobong);
            });

            if (filterKobong) {
                const selectedVal = filterKobong.value;
                filterKobong.innerHTML = `<option value="ALL">-- Semua Kobong --</option>`;
                Array.from(setKobong).sort().forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k; opt.innerText = `Kobong ${k}`;
                    filterKobong.appendChild(opt);
                });
                filterKobong.value = selectedVal;
            }
            renderTabelDanGrafik();
        });

        if (filterKobong) filterKobong.addEventListener('change', renderTabelDanGrafik);
        if (filterTanggal) filterTanggal.addEventListener('change', renderTabelDanGrafik);
        if (cariTeks) cariTeks.addEventListener('input', renderTabelDanGrafik);
        if (btnResetTanggal) {
            btnResetTanggal.addEventListener('click', () => {
                filterTanggal.value = '';
                renderTabelDanGrafik();
            });
        }
    }

    // FUNGSI RENDER TABEL DENGAN PENYEKAT PER HARI
    function renderTabelDanGrafik() {
        if (!tabelLaporan) return;
        tabelLaporan.innerHTML = '';

        const selectedKobong = filterKobong ? filterKobong.value : 'ALL';
        const selectedTanggal = filterTanggal ? filterTanggal.value : ''; // Formats: YYYY-MM-DD
        const keyword = cariTeks ? cariTeks.value.toLowerCase().trim() : '';

        // Filter Data
        const filteredData = rawLaporanData.filter(item => {
            // Filter Kobong
            const matchKobong = (selectedKobong === 'ALL' || item.kobong === selectedKobong);
            
            // Filter Tanggal
            let matchTanggal = true;
            if (selectedTanggal) {
                // Konversi tanggal Firestore ke YYYY-MM-DD jika item.tanggalISO belum ada
                let itemISO = item.tanggalISO;
                if (!itemISO && item.tanggal) {
                    const parts = item.tanggal.split('/'); // DD/MM/YYYY
                    if (parts.length === 3) itemISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                matchTanggal = (itemISO === selectedTanggal);
            }

            // Filter Teks (Pencarian Nama Pelapor/Catatan/Kobong)
            let matchTeks = true;
            if (keyword) {
                const textTarget = `${item.nama || ''} ${item.catatan || ''} Kobong ${item.kobong || ''}`.toLowerCase();
                matchTeks = textTarget.includes(keyword);
            }

            return matchKobong && matchTanggal && matchTeks;
        });

        if (filteredData.length === 0) {
            tabelLaporan.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 20px; color: #888;">Tidak ada data laporan yang cocok.</td></tr>`;
        } else {
            // Kelompokkan data berdasarkan Tanggal
            const dikelompokkanPerTanggal = {};
            filteredData.forEach(item => {
                const keyTgl = item.tanggal || "Tanggal Tidak Diketahui";
                if (!dikelompokkanPerTanggal[keyTgl]) dikelompokkanPerTanggal[keyTgl] = [];
                dikelompokkanPerTanggal[keyTgl].push(item);
            });

            // Tampilkan dengan Penyekat Header Per Hari
            Object.keys(dikelompokkanPerTanggal).forEach(tanggalHeader => {
                const listHariIni = dikelompokkanPerTanggal[tanggalHeader];

                // Bikin Baris Penyekat / Header Tanggal
                const rowHeader = document.createElement('tr');
                rowHeader.innerHTML = `
                    <td colspan="5" style="background-color: #e8f5e9; color: #1b5e20; font-weight: bold; font-size: 1rem; padding: 10px; border-top: 2px solid #a5d6a7;">
                        📅 Hari & Tanggal: ${tanggalHeader} <span style="font-weight: normal; font-size: 0.85rem; color: #333;">(${listHariIni.length} Laporan Masuk)</span>
                    </td>
                `;
                tabelLaporan.appendChild(rowHeader);

                // Baris Isian Data Laporan
                listHariIni.forEach(item => {
                    const row = document.createElement('tr');
                    const statusColor = item.status === 'Lengkap' ? '#2e7d32' : '#c62828';
                    row.innerHTML = `
                        <td style="padding-left: 20px;"><strong>${item.waktu}</strong><br><small style="color:#666;">Jam: ${item.jam || '-'}</small></td>
                        <td><strong>Kobong ${item.kobong}</strong></td>
                        <td>👤 ${item.nama || '-'}</td>
                        <td style="white-space: pre-line;">${item.catatan || '-'}</td>
                        <td><span style="color: ${statusColor}; font-weight: bold;">${item.status}</span></td>
                    `;
                    tabelLaporan.appendChild(row);
                });
            });
        }

        // Hitung ulang grafik berdasarkan data terfilter
        const rekap = {};
        rawLaporanData.forEach(item => {
            if (!rekap[item.kobong]) rekap[item.kobong] = { total: 0, lengkap: 0 };
            rekap[item.kobong].total += 1;
            if (item.status === 'Lengkap') rekap[item.kobong].lengkap += 1;
        });
        renderChart(rekap);
    }

    function renderChart(rekap) {
        const ctx = document.getElementById('grafikKehadiran');
        if (!ctx) return;
        const labels = Object.keys(rekap);
        const dataPersentase = labels.map(k => Math.round((rekap[k].lengkap / rekap[k].total) * 100));
        if (chartKehadiran) chartKehadiran.destroy();
        chartKehadiran = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(l => `Kobong ${l}`),
                datasets: [{ label: 'Persentase (%)', data: dataPersentase, backgroundColor: '#2e7d32', borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } } }
        });
    }

    // -----------------------------------------------------------
    // 3. TAMBAH & EDIT DATA KOBONG
    // -----------------------------------------------------------
    const formSantriKobong = document.getElementById('form-santri-kobong');
    const containerDaftarKobong = document.getElementById('container-daftar-kobong');

    window.editPengurusKobong = async function(idKobong) {
        try {
            const docRef = doc(db, "master_santri", idKobong);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) return alert('Data kobong tidak ditemukan!');
            
            const dataKobong = docSnap.data();
            const ketuaLama = dataKobong.ketua || '';
            const wakilLama = dataKobong.wakil || '';
            const emailLama = dataKobong.email_pengurus || '';
            const usernameLama = emailLama ? emailLama.split('@')[0] : '';

            const ketuaBaru = prompt(`Ketua baru Kobong ${idKobong}:`, ketuaLama);
            if (ketuaBaru === null) return;
            
            const wakilBaru = prompt(`Wakil baru Kobong ${idKobong}:`, wakilLama);
            if (wakilBaru === null) return;

            const usernameBaru = prompt(`USERNAME LOGIN untuk Ketua Kobong (Contoh: asep123)\nKosongkan jika tidak diubah:`, usernameLama);
            if (usernameBaru === null) return;

            const dataUpdate = { ketua: ketuaBaru.trim(), wakil: wakilBaru.trim(), updatedAt: new Date() };
            if (usernameBaru.trim() !== '') {
                dataUpdate.email_pengurus = `${usernameBaru.trim().toLowerCase()}@hu.local`;
            }

            await updateDoc(docRef, dataUpdate);
            alert('Berhasil diperbarui!');
        } catch (err) { alert('Gagal: ' + err.message); }
    };

    window.hapusSantri = async function(idKobong, namaSantri) {
        if (confirm(`Hapus ${namaSantri} dari Kobong ${idKobong}?`)) {
            try { await updateDoc(doc(db, "master_santri", idKobong), { anggota: arrayRemove(namaSantri) }); } 
            catch (err) { alert('Gagal: ' + err.message); }
        }
    };

    window.hapusKobong = async function(idKobong) {
        if (confirm(`Hapus SELURUH data Kobong ${idKobong}?`)) {
            try { await deleteDoc(doc(db, "master_santri", idKobong)); } 
            catch (err) { alert('Gagal: ' + err.message); }
        }
    };

    if (formSantriKobong) {
        formSantriKobong.addEventListener('submit', async (e) => {
            e.preventDefault();
            const namaKobongInput = document.getElementById('nama-kobong-input').value.trim().toUpperCase();
            const ketuaInput = document.getElementById('ketua-input').value.trim();
            const wakilInput = document.getElementById('wakil-input').value.trim();
            const daftarSantriRaw = document.getElementById('daftar-santri-input').value.trim();
            const listSantriBaru = daftarSantriRaw.split('\n').map(nama => nama.trim()).filter(nama => nama !== '');
            
            const inputUsername = prompt(`Masukkan USERNAME LOGIN untuk ketua kobong ini (Contoh: joko_1a)\n(Kosongkan jika belum ingin dibuatkan akun):`);
            const emailPengurus = inputUsername ? `${inputUsername.trim().toLowerCase()}@hu.local` : "";

            const docRef = doc(db, "master_santri", namaKobongInput);
            try {
                const docSnap = await getDoc(docRef);
                const dataSet = { ketua: ketuaInput, wakil: wakilInput, anggota: listSantriBaru, updatedAt: new Date() };
                if (emailPengurus) dataSet.email_pengurus = emailPengurus;

                if (docSnap.exists()) {
                    dataSet.anggota = arrayUnion(...listSantriBaru);
                    await updateDoc(docRef, dataSet);
                } else {
                    dataSet.nama_kobong = namaKobongInput;
                    await setDoc(docRef, dataSet);
                }
                alert(`Berhasil menyimpan data Kobong ${namaKobongInput}!`);
                formSantriKobong.reset();
            } catch (err) {
                alert('Gagal menyimpan: ' + err.message);
            }
        });
    }

    if (containerDaftarKobong) {
        onSnapshot(collection(db, "master_santri"), (snapshot) => {
            containerDaftarKobong.innerHTML = '';
            if (snapshot.empty) {
                containerDaftarKobong.innerHTML = '<p class="text-center">Belum ada data kobong.</p>';
                return;
            }
            snapshot.forEach((docSnap) => {
                const dataKobong = docSnap.data();
                const idKobong = docSnap.id;
                const anggotaList = dataKobong.anggota || [];
                const usernameTampil = dataKobong.email_pengurus ? dataKobong.email_pengurus.split('@')[0] : '<span style="color:red">Belum diatur</span>';

                const boxKobong = document.createElement('div');
                boxKobong.className = 'master-santri-box';
                boxKobong.style.marginBottom = '16px';

                let listHTML = `
                    <div style="margin-bottom: 12px; overflow: hidden;">
                        <button class="btn-delete-kobong" onclick="hapusKobong('${idKobong}')">Hapus Kobong</button>
                        <button class="btn-edit-pengurus" onclick="editPengurusKobong('${idKobong}')">✏️️ Edit</button>
                        <h3 style="color: #2e7d32; margin: 0;">Kobong ${dataKobong.nama_kobong}</h3>
                        <p style="margin: 6px 0 4px 0; font-size: 0.85rem; color: #1b5e20;">
                            <strong>Ketua:</strong> ${dataKobong.ketua || '-'} | <strong>Wakil:</strong> ${dataKobong.wakil || '-'}<br>
                            <strong>Username Akun:</strong> ${usernameTampil}
                        </p>
                    </div>
                    <div style="font-size: 0.9rem;">
                        <strong>Anggota (${anggotaList.length} Santri):</strong>
                `;
                if (anggotaList.length === 0) {
                    listHTML += `<p style="color: #888;">Belum ada anggota.</p>`;
                } else {
                    anggotaList.forEach((nama, index) => {
                        listHTML += `<div class="santri-item"><span>${index + 1}. ${nama}</span><button class="btn-delete-santri" onclick="hapusSantri('${idKobong}', '${nama}')">Hapus</button></div>`;
                    });
                }
                listHTML += `</div>`;
                boxKobong.innerHTML = listHTML;
                containerDaftarKobong.appendChild(boxKobong);
            });
        });
    }

    window.salinRekapTeks = function() {
        if (!rawLaporanData || rawLaporanData.length === 0) return alert('Belum ada data untuk disalin!');
        const rekap = {};
        rawLaporanData.forEach(item => {
            if (!rekap[item.kobong]) rekap[item.kobong] = { total: 0, lengkap: 0 };
            rekap[item.kobong].total += 1;
            if (item.status === 'Lengkap') rekap[item.kobong].lengkap += 1;
        });
        let teks = `*REKAP ABSENSI KOBONG*\nTanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n=============================\n\n`;
        Object.keys(rekap).sort().forEach(k => {
            const persen = Math.round((rekap[k].lengkap / rekap[k].total) * 100);
            teks += `• *Kobong ${k}*: ${persen}% (${rekap[k].lengkap}/${rekap[k].total} Laporan Lengkap)\n`;
        });
        teks += `\n=============================\n_Dicetak otomatis dari Sistem_`;
        navigator.clipboard.writeText(teks).then(() => alert('Rekap berhasil disalin!')).catch(err => alert('Gagal menyalin: ' + err.message));
    };
}

// ===========================================================
// FUNGSI HITUNG REKAP PER SANTRI
// ===========================================================
function hitungRekapPerSantri(rawLaporanData) {
    const tabelSantri = document.getElementById('tabel-rekap-santri');
    const filterKobong = document.getElementById('filter-kobong-santri');
    const cariNama = document.getElementById('cari-nama-santri');

    if (!tabelSantri) return;

    // 1. Kumpulkan semua data dari detail_presensi
    const rekapSantri = {}; // Format: { "Asep (Kobong 1A)": { nama, kobong, hadir, sakit, izin, alfa, total } }

    rawLaporanData.forEach(laporan => {
        if (laporan.detail_presensi && Array.isArray(laporan.detail_presensi)) {
            laporan.detail_presensi.forEach(p => {
                const key = `${p.nama}_${laporan.kobong}`;
                
                if (!rekapSantri[key]) {
                    rekapSantri[key] = {
                        nama: p.nama,
                        kobong: laporan.kobong,
                        hadir: 0,
                        sakit: 0,
                        izin: 0,
                        alfa: 0,
                        total: 0
                    };
                }

                rekapSantri[key].total += 1;
                if (p.status === 'Hadir') rekapSantri[key].hadir += 1;
                else if (p.status === 'Sakit') rekapSantri[key].sakit += 1;
                else if (p.status === 'Izin') rekapSantri[key].izin += 1;
                else if (p.status === 'Alfa') rekapSantri[key].alfa += 1;
            });
        }
    });

    // Render Tabel
    function renderTabelSantri() {
        tabelSantri.innerHTML = '';
        const selectedKobong = filterKobong ? filterKobong.value : 'ALL';
        const keyword = cariNama ? cariNama.value.toLowerCase().trim() : '';

        const listSantri = Object.values(rekapSantri).filter(item => {
            const matchKobong = (selectedKobong === 'ALL' || item.kobong === selectedKobong);
            const matchNama = item.nama.toLowerCase().includes(keyword);
            return matchKobong && matchNama;
        });

        // Urutkan berdasarkan persentase kehadiran terrendah (supaya santri kurang rajin kelihatan di atas)
        listSantri.sort((a, b) => (a.hadir / a.total) - (b.hadir / b.total));

        if (listSantri.length === 0) {
            tabelSantri.innerHTML = `<tr><td colspan="8" class="text-center">Belum ada data rekapan santri.</td></tr>`;
            return;
        }

        listSantri.forEach((s, idx) => {
            const persen = Math.round((s.hadir / s.total) * 100);
            let warnaPersen = '#2e7d32'; // Hijau (Rajin)
            if (persen < 75) warnaPersen = '#c62828'; // Merah (Perlu Perhatian)
            else if (persen < 85) warnaPersen = '#f57c00'; // Oranye

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${s.nama}</strong></td>
                <td>Kobong ${s.kobong}</td>
                <td style="color: green; font-weight: bold;">${s.hadir}</td>
                <td style="color: orange;">${s.sakit}</td>
                <td style="color: blue;">${s.izin}</td>
                <td style="color: red; font-weight: bold;">${s.alfa}</td>
                <td><span style="color: ${warnaPersen}; font-weight: bold;">${persen}%</span> <small>(${s.hadir}/${s.total})</small></td>
            `;
            tabelSantri.appendChild(row);
        });
    }

    renderTabelSantri();

    if (filterKobong) filterKobong.onchange = renderTabelSantri;
    if (cariNama) cariNama.oninput = renderTabelSantri;
}
