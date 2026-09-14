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

// Variabel Global untuk menyimpan Kobong yang sedang di-absen
let namaKobongAktif = null;
let listAnggotaAktif = [];

// ===========================================================
// 0. SISTEM KEAMANAN (SATPAM LOGIN)
// ===========================================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Jika tidak ada user login dan bukan di halaman login, usir ke login!
        if (!window.location.href.includes('login.html')) {
            window.location.replace('login.html');
        }
    } else {
        // User berhasil login, jalankan aplikasi!
        tampilkanNamaAkun(user.email);
        jalankanAplikasi(user);
    }
});

// Fungsi Logout Global (bisa dipanggil dari tombol HTML `onclick="logoutApp()"`)
window.logoutApp = function() {
    signOut(auth).then(() => {
        window.location.replace('login.html');
    }).catch((error) => {
        alert("Gagal keluar: " + error.message);
    });
};

function tampilkanNamaAkun(email) {
    const username = email.split('@')[0];
    const userDisplay = document.getElementById('user-display'); // Jika kamu bikin elemen ini nanti
    if (userDisplay) {
        userDisplay.innerText = `Halo, ${username}`;
    }
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
    const jamTutup = (23 * 60) + 30; 
    return (totalMenitSekarang >= jamBuka && totalMenitSekarang <= jamTutup);
}

// ===========================================================
// JALANKAN APLIKASI SETELAH LOGIN VALID
// ===========================================================
function jalankanAplikasi(user) {

    // -----------------------------------------------------------
    // 1. ADMIN KOBONG (Form Absensi Berdasarkan Hak Akses)
    // -----------------------------------------------------------
    const formAbsensi = document.getElementById('form-absensi');
    const headerTitle = document.getElementById('nama-kobong');
    const infoSection = document.getElementById('detail-pengurus')?.parentElement;

    if (formAbsensi) {
        // Cari di database, Kobong mana saja yang dipegang oleh Email Akun ini
        const qAuth = query(collection(db, "master_santri"), where("email_pengurus", "==", user.email));
        
        onSnapshot(qAuth, (snapshot) => {
            const daftarKobongDimiliki = [];
            snapshot.forEach(docSnap => {
                daftarKobongDimiliki.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Skenario 1: Akun Belum Punya Kobong
            if (daftarKobongDimiliki.length === 0) {
                if (headerTitle) headerTitle.innerText = "Akses Ditolak";
                formAbsensi.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#c62828;">
                    <h3>⚠️ Akses Kosong</h3>
                    <p>Akun Anda belum ditugaskan untuk mengelola Kobong manapun.</p>
                    <p>Silakan hubungi Super Admin.</p>
                    <button onclick="logoutApp()" style="margin-top:15px; padding:10px 20px; background:#c62828; color:white; border:none; border-radius:6px; cursor:pointer;">Keluar Akun</button>
                </div>`;
                if (infoSection) infoSection.style.display = 'none';
                return;
            }

            // Skenario 2: Akun Punya LEBIH DARI 1 Kobong (Tampilkan Menu Pilih Kobong)
            const urlParams = new URLSearchParams(window.location.search);
            const kobongDipilih = urlParams.get('kbg'); // Cek jika dia udah pilih dari menu
            
            const dataKobongAktif = daftarKobongDimiliki.find(k => k.id === kobongDipilih);

            if (daftarKobongDimiliki.length > 1 && !dataKobongAktif) {
                if (headerTitle) headerTitle.innerText = "Menu Pilihan Kobong";
                if (infoSection) infoSection.style.display = 'none';
                
                let menuHTML = `<div style="text-align:center; margin-bottom:20px;">
                    <p>Anda memegang <strong>${daftarKobongDimiliki.length} Kobong</strong>. Silakan pilih kobong yang ingin di-absen hari ini:</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">`;
                
                daftarKobongDimiliki.forEach(kbg => {
                    menuHTML += `<button type="button" onclick="window.location.href='?kbg=${kbg.id}'" 
                        style="padding:16px; background:#2e7d32; color:white; border:none; border-radius:8px; font-size:1.1rem; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                        📋 Masuk Absensi Kobong ${kbg.nama_kobong}
                    </button>`;
                });
                menuHTML += `</div>
                <div style="text-align:center; margin-top:30px;">
                    <button onclick="logoutApp()" style="padding:10px 20px; background:transparent; color:#c62828; border:1px solid #c62828; border-radius:6px; cursor:pointer;">Keluar Akun</button>
                </div>`;
                
                formAbsensi.innerHTML = menuHTML;
                return;
            }

            // Skenario 3: Akun cuma punya 1 Kobong ATAU sudah memilih dari menu -> RENDER FORM ABSENSI
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
        const headerTitle = document.getElementById('nama-kobong');

        if (infoSection) infoSection.style.display = 'block';
        if (headerTitle) headerTitle.innerText = `Laporan Absensi - Kobong ${namaKobongAktif}`;
        
        if (detailPengurusElem) {
            detailPengurusElem.innerHTML = `<strong>Ketua:</strong> ${dataKobong.ketua || '-'}<br><strong>Wakil:</strong> ${dataKobong.wakil || '-'}`;
        }
        if (totalAnggotaElem) {
            totalAnggotaElem.innerText = `Daftar Anggota (${listAnggotaAktif.length} Santri):`;
        }

        if (containerCeklisSantri) {
            containerCeklisSantri.innerHTML = '';
            if (listAnggotaAktif.length === 0) {
                containerCeklisSantri.innerHTML = '<p style="color: #c62828;">Belum ada santri terdaftar di kobong ini.</p>';
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
        
        // Membaca Riwayat Khusus Kobong Ini
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

    // LISTENER SUBMIT ABSENSI
    if (formAbsensi && !formAbsensi.dataset.listenerAttached) {
        formAbsensi.dataset.listenerAttached = 'true';
        formAbsensi.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!namaKobongAktif) return;
            if (!cekBatasWaktuAbsensi()) return alert('⚠️ AKSES DITUTUP!\nLaporan absensi hanya dapat dikirim pada pukul 22:30 - 23:30 WIB.');
            
            const sekarang = new Date();
            const tglInfo = sekarang.toLocaleDateString('id-ID');
            const waktuInfo = document.getElementById('waktu').value;
            const keyAbsen = `absen_${namaKobongAktif}_${tglInfo}_${waktuInfo}`;

            if (localStorage.getItem(keyAbsen)) return alert(`⚠️ Laporan (${waktuInfo}) hari ini sudah dikirim!`);
            if (listAnggotaAktif.length === 0) return alert('Tidak ada santri yang dapat di-absen.');

            const btnSubmit = formAbsensi.querySelector('button[type="submit"]');
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

            try {
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Mengirim...';
                await addDoc(collection(db, "laporan_absensi"), {
                    kobong: namaKobongAktif, nama: namaPelapor, waktu: waktuInfo, status: statusGlobal,
                    catatan: catatanFinal || '-', detail_presensi: detailPresensi,
                    ringkasan: { total: listAnggotaAktif.length, hadir, sakit, izin, alfa },
                    createdAt: new Date(), tanggal: tglInfo, 
                    jam: sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                });
                localStorage.setItem(keyAbsen, 'true');
                alert('Berhasil dikirim!');
                
                // Refresh halaman agar kembali bersih/ke menu (jika multi)
                window.location.reload();
            } catch (err) {
                alert('Gagal mengirim: ' + err.message);
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Kirim Laporan';
            }
        });
    }

    // -----------------------------------------------------------
    // 2. SUPER ADMIN (Manajemen Tabel & Santri)
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
    }

    function renderTabelDanGrafik() {
        if (!tabelLaporan) return;
        tabelLaporan.innerHTML = '';
        const selectedFilter = filterKobong ? filterKobong.value : 'ALL';
        const filteredData = rawLaporanData.filter(item => (selectedFilter === 'ALL' || item.kobong === selectedFilter));

        if (filteredData.length === 0) {
            tabelLaporan.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada laporan.</td></tr>`;
        } else {
            filteredData.forEach(item => {
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
    // 3. TAMBAH & EDIT DATA KOBONG (DILENGKAPI USERNAME LOGIN)
    // -----------------------------------------------------------
    const formSantriKobong = document.getElementById('form-santri-kobong');
    const containerDaftarKobong = document.getElementById('container-daftar-kobong');

    window.editPengurusKobong = async function(idKobong, ketuaLama, wakilLama, emailLama) {
        const usernameLama = emailLama ? emailLama.split('@')[0] : '';
        const ketuaBaru = prompt(`Ketua baru Kobong ${idKobong}:`, ketuaLama);
        if (ketuaBaru === null) return;
        
        const wakilBaru = prompt(`Wakil baru Kobong ${idKobong}:`, wakilLama);
        if (wakilBaru === null) return;

        // TAMBAHAN: Minta input Username untuk Akun Login
        const usernameBaru = prompt(`USERNAME LOGIN untuk Ketua Kobong (Contoh: asep123)\nKosongkan jika tidak diubah:`, usernameLama);
        if (usernameBaru === null) return;

        const dataUpdate = { ketua: ketuaBaru.trim(), wakil: wakilBaru.trim(), updatedAt: new Date() };
        if (usernameBaru.trim() !== '') {
            dataUpdate.email_pengurus = `${usernameBaru.trim().toLowerCase()}@hu.local`;
        }

        try {
            await updateDoc(doc(db, "master_santri", idKobong), dataUpdate);
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
            
            // Tanya Username saat Super Admin nambah Kobong baru
            const inputUsername = prompt(`Masukkan USERNAME LOGIN untuk ketua kobong ini (Contoh: joko_1a)\n(Kosongkan jika belum ingin dibuatkan akun):`);
            const emailPengurus = inputUsername ? `${inputUsername.trim().toLowerCase()}@hu.local` : "";

            const docRef = doc(db, "master_santri", namaKobongInput);
            try {
                const docSnap = await getDoc(docRef);
                const dataSet = { 
                    ketua: ketuaInput, wakil: wakilInput, 
                    anggota: listSantriBaru, updatedAt: new Date() 
                };
                if (emailPengurus) dataSet.email_pengurus = emailPengurus;

                if (docSnap.exists()) {
                    // Update: Gabungkan anggota lama & baru
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
                        <button class="btn-edit-pengurus" onclick="editPengurusKobong('${idKobong}', '${dataKobong.ketua || ''}', '${dataKobong.wakil || ''}', '${dataKobong.email_pengurus || ''}')">✏️ Edit</button>
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
