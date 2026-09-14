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
    orderBy,
    where,
    getDocs
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


// ===========================================================
// FUNGSI GENERATOR KODE LINK UNIK
// ===========================================================

function buatKodeLinkUnik() {
    const waktu = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `KBG-${waktu}-${random}`;
}


// ===========================================================
// FUNGSI MEMBUAT LINK ABSENSI
// ===========================================================

function buatLinkAbsensi(kodeLink) {
    if (!kodeLink) return '';

    const url = new URL(
        'admin-kobong.html',
        window.location.href
    );

    url.search = `?kode=${encodeURIComponent(kodeLink)}`;

    return url.href;
}


// ===========================================================
// BACA PARAMETER URL KOBONG
//
// SISTEM LAMA:
// ?kobong=ALFA
//
// SISTEM BARU:
// ?kode=KBG-XXXXXX-XXXXXX
//
// KEDUANYA TETAP DIDUKUNG
// ===========================================================

const urlParams = new URLSearchParams(window.location.search);

const rawKobong = urlParams.get('kobong') || '';
const kodeLinkURL = urlParams.get('kode') || '';

let namaKobong = decodeURIComponent(rawKobong)
    .trim()
    .toUpperCase();

let kodeLinkAktif = decodeURIComponent(kodeLinkURL)
    .trim();


// ===========================================================
// HEADER KOBONG
// ===========================================================

const headerTitle = document.getElementById('nama-kobong');


// ===========================================================
// FUNGSI CEK & KUNCI JAM
// 22:30 - 23:30
// ===========================================================

function cekBatasWaktuAbsensi() {
    const sekarang = new Date();

    const jam = sekarang.getHours();
    const menit = sekarang.getMinutes();

    const totalMenitSekarang = (jam * 60) + menit;

    const jamBuka = (22 * 60) + 30;
    const jamTutup = (23 * 60) + 30;

    return (
        totalMenitSekarang >= jamBuka &&
        totalMenitSekarang <= jamTutup
    );
}


// ===========================================================
// 1. ADMIN KOBONG
// ===========================================================

const formAbsensi = document.getElementById('form-absensi');
const detailPengurusElem = document.getElementById('detail-pengurus');
const totalAnggotaElem = document.getElementById('total-anggota');
const daftarAnggotaElem = document.getElementById('daftar-anggota-kobong');
const containerCeklisSantri = document.getElementById('container-ceklis-santri');
const tabelRiwayatKobong = document.getElementById('tabel-riwayat-kobong');

let listAnggotaKobong = [];


// ===========================================================
// CARI DATA KOBONG BERDASARKAN LINK
// ===========================================================

async function cariKobongDariLink() {

    // -------------------------------------------------------
    // PRIORITAS 1: LINK BARU DENGAN KODE UNIK
    // -------------------------------------------------------

    if (kodeLinkAktif) {

        try {

            const q = query(
                collection(db, "master_santri"),
                where("kode_link", "==", kodeLinkAktif)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {

                const docSnap = snapshot.docs[0];

                const data = docSnap.data();

                namaKobong = (
                    data.nama_kobong ||
                    docSnap.id ||
                    ''
                )
                    .trim()
                    .toUpperCase();

                return {
                    id: docSnap.id,
                    data: data
                };
            }

            return null;

        } catch (error) {

            console.error(
                "Gagal mencari kobong berdasarkan kode:",
                error
            );

            return null;
        }
    }


    // -------------------------------------------------------
    // PRIORITAS 2: LINK LAMA BERDASARKAN NAMA KOBONG
    // -------------------------------------------------------

    if (namaKobong) {

        try {

            const docRef = doc(
                db,
                "master_santri",
                namaKobong
            );

            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {

                const data = docSnap.data();

                // Jika kobong lama belum punya kode unik,
                // otomatis dibuatkan.
                if (!data.kode_link) {

                    const kodeBaru = buatKodeLinkUnik();

                    await updateDoc(docRef, {
                        kode_link: kodeBaru,
                        updatedAt: new Date()
                    });

                    data.kode_link = kodeBaru;
                }

                kodeLinkAktif = data.kode_link;

                return {
                    id: docSnap.id,
                    data: data
                };
            }

            return null;

        } catch (error) {

            console.error(
                "Gagal mencari kobong lama:",
                error
            );

            return null;
        }
    }


    return null;
}


// ===========================================================
// JALANKAN ADMIN KOBONG
// ===========================================================

if (formAbsensi) {

    if (namaKobong || kodeLinkAktif) {

        (async () => {

            const hasilKobong = await cariKobongDariLink();

            if (!hasilKobong) {

                if (detailPengurusElem) {
                    detailPengurusElem.innerText =
                        'Data kobong tidak ditemukan atau link tidak valid.';
                }

                if (daftarAnggotaElem) {
                    daftarAnggotaElem.innerHTML = '';
                }

                if (containerCeklisSantri) {
                    containerCeklisSantri.innerHTML =
                        '<p style="color:#c62828;">Link kobong tidak valid atau data kobong tidak ditemukan.</p>';
                }

                if (headerTitle) {
                    headerTitle.innerText =
                        'Laporan Absensi Kobong';
                }

                return;
            }


            // ------------------------------------------------
            // TAMPILKAN NAMA KOBONG
            // ------------------------------------------------

            if (headerTitle) {
                headerTitle.innerText =
                    `Laporan Absensi - Kobong ${namaKobong}`;
            }


            // ------------------------------------------------
            // PANTAU DATA KOBONG SECARA REALTIME
            // ------------------------------------------------

            onSnapshot(
                doc(db, "master_santri", hasilKobong.id),
                (docSnap) => {

                    if (!docSnap.exists()) {

                        if (detailPengurusElem) {
                            detailPengurusElem.innerText =
                                `Data Kobong "${namaKobong}" tidak ditemukan.`;
                        }

                        if (daftarAnggotaElem) {
                            daftarAnggotaElem.innerHTML = '';
                        }

                        if (containerCeklisSantri) {
                            containerCeklisSantri.innerHTML =
                                '<p style="color:#888;">Data kobong tidak ditemukan.</p>';
                        }

                        return;
                    }


                    const data = docSnap.data();

                    listAnggotaKobong =
                        data.anggota || [];


                    // ----------------------------------------
                    // DETAIL PENGURUS
                    // ----------------------------------------

                    if (detailPengurusElem) {

                        detailPengurusElem.innerHTML = `
                            <strong>Ketua:</strong> ${data.ketua || '-'}<br>
                            <strong>Wakil:</strong> ${data.wakil || '-'}
                        `;
                    }


                    // ----------------------------------------
                    // TOTAL ANGGOTA
                    // ----------------------------------------

                    if (totalAnggotaElem) {

                        totalAnggotaElem.innerText =
                            `Daftar Anggota (${listAnggotaKobong.length} Santri):`;
                    }


                    // ----------------------------------------
                    // DAFTAR ANGGOTA
                    // ----------------------------------------

                    if (daftarAnggotaElem) {

                        if (listAnggotaKobong.length > 0) {

                            let htmlList =
                                '<ol style="margin:0;padding-left:18px;">';

                            listAnggotaKobong.forEach(
                                nama => {

                                    htmlList +=
                                        `<li>${nama}</li>`;
                                }
                            );

                            htmlList += '</ol>';

                            daftarAnggotaElem.innerHTML =
                                htmlList;

                        } else {

                            daftarAnggotaElem.innerHTML =
                                '<span style="color:#888;">Belum ada anggota terdaftar.</span>';
                        }
                    }


                    // ----------------------------------------
                    // GENERATE CEKLIS
                    // ----------------------------------------

                    if (containerCeklisSantri) {

                        containerCeklisSantri.innerHTML = '';

                        if (listAnggotaKobong.length === 0) {

                            containerCeklisSantri.innerHTML =
                                '<p style="color:#c62828;">Belum ada santri terdaftar di kobong ini. Tambahkan data santri terlebih dahulu di Super Admin.</p>';

                        } else {

                            listAnggotaKobong.forEach(
                                (namaSantri, idx) => {

                                    const itemDiv =
                                        document.createElement('div');

                                    itemDiv.className =
                                        'item-ceklis-santri';

                                    itemDiv.innerHTML = `
                                        <span class="nama-santri-label">
                                            ${idx + 1}. ${namaSantri}
                                        </span>

                                        <div class="opsi-kehadiran-group">

                                            <label>
                                                <input
                                                    type="radio"
                                                    name="status_santri_${idx}"
                                                    value="Hadir"
                                                    checked
                                                >
                                                Hadir
                                            </label>

                                            <label>
                                                <input
                                                    type="radio"
                                                    name="status_santri_${idx}"
                                                    value="Sakit"
                                                >
                                                Sakit
                                            </label>

                                            <label>
                                                <input
                                                    type="radio"
                                                    name="status_santri_${idx}"
                                                    value="Izin"
                                                >
                                                Izin
                                            </label>

                                            <label>
                                                <input
                                                    type="radio"
                                                    name="status_santri_${idx}"
                                                    value="Alfa"
                                                >
                                                Alfa
                                            </label>

                                        </div>
                                    `;

                                    containerCeklisSantri.appendChild(
                                        itemDiv
                                    );
                                }
                            );
                        }
                    }
                }
            );
        })();
    }


    // =======================================================
    // KIRIM LAPORAN ABSENSI
    // =======================================================

    formAbsensi.addEventListener(
        'submit',
        async (e) => {

            e.preventDefault();


            if (!namaKobong) {

                alert(
                    'Gagal mengirim: Identitas kobong tidak ditemukan!'
                );

                return;
            }


            // ------------------------------------------------
            // CEK WAKTU
            // ------------------------------------------------

            if (!cekBatasWaktuAbsensi()) {

                alert(
                    '⚠️ AKSES DITUTUP!\n' +
                    'Laporan absensi hanya dapat dikirim pada pukul 22:30 - 23:30 WIB.'
                );

                return;
            }


            const sekarang = new Date();

            const tanggalHariIni =
                sekarang.toLocaleDateString('id-ID');

            const waktuTerpilih =
                document.getElementById('waktu').value;


            // ------------------------------------------------
            // ANTI SPAM
            // ------------------------------------------------

            const keyAbsen =
                `absen_${namaKobong}_${tanggalHariIni}_${waktuTerpilih}`;


            if (localStorage.getItem(keyAbsen)) {

                alert(
                    `⚠️ Kobong ${namaKobong} sudah mengirimkan laporan absensi (${waktuTerpilih}) hari ini!`
                );

                return;
            }


            if (listAnggotaKobong.length === 0) {

                alert(
                    'Gagal mengirim: Tidak ada santri yang dapat di-absen.'
                );

                return;
            }


            const btnSubmit =
                formAbsensi.querySelector(
                    'button[type="submit"]'
                );


            const namaPelapor =
                document
                    .getElementById('nama-pelapor')
                    .value
                    .trim();


            const catatan =
                document
                    .getElementById('catatan')
                    .value
                    .trim();


            // ------------------------------------------------
            // KUMPULKAN DATA PRESENSI
            // ------------------------------------------------

            const detailPresensi = [];

            let jumlahHadir = 0;
            let jumlahSakit = 0;
            let jumlahIzin = 0;
            let jumlahAlfa = 0;

            const santriTidakHadir = [];


            listAnggotaKobong.forEach(
                (namaSantri, idx) => {

                    const radio =
                        document.querySelector(
                            `input[name="status_santri_${idx}"]:checked`
                        );


                    const statusSelected =
                        radio
                            ? radio.value
                            : 'Hadir';


                    detailPresensi.push({
                        nama: namaSantri,
                        status: statusSelected
                    });


                    if (statusSelected === 'Hadir') {

                        jumlahHadir++;

                    } else {

                        if (statusSelected === 'Sakit') {
                            jumlahSakit++;
                        }

                        if (statusSelected === 'Izin') {
                            jumlahIzin++;
                        }

                        if (statusSelected === 'Alfa') {
                            jumlahAlfa++;
                        }

                        santriTidakHadir.push(
                            `${namaSantri} (${statusSelected})`
                        );
                    }
                }
            );


            const statusGlobal =
                jumlahHadir === listAnggotaKobong.length
                    ? 'Lengkap'
                    : 'Tidak Lengkap';


            let catatanFinal = catatan;


            if (santriTidakHadir.length > 0) {

                const rincian =
                    `Tidak Hadir: ${santriTidakHadir.join(', ')}`;

                catatanFinal =
                    catatan
                        ? `${catatan}\n${rincian}`
                        : rincian;
            }


            // =================================================
            // SIMPAN
            // =================================================

            try {

                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Mengirim...';


                await addDoc(
                    collection(db, "laporan_absensi"),
                    {

                        // IDENTITAS KOBONG LAMA
                        kobong: namaKobong,

                        // IDENTITAS LINK UNIK
                        kode_link: kodeLinkAktif || null,

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

                        jam: sekarang.toLocaleTimeString(
                            'id-ID',
                            {
                                hour: '2-digit',
                                minute: '2-digit'
                            }
                        )
                    }
                );


                localStorage.setItem(
                    keyAbsen,
                    'true'
                );


                alert(
                    'Laporan absensi berhasil dikirim!'
                );


                formAbsensi.reset();


            } catch (err) {

                alert(
                    'Gagal mengirim laporan: ' +
                    err.message
                );

            } finally {

                btnSubmit.disabled = false;

                btnSubmit.innerText =
                    'Kirim Laporan Absensi';
            }
        }
    );


    // =======================================================
    // RIWAYAT LAPORAN KOBONG
    // =======================================================

    if (tabelRiwayatKobong && namaKobong) {

        onSnapshot(
            collection(db, "laporan_absensi"),
            (snapshot) => {

                tabelRiwayatKobong.innerHTML = '';

                const listData = [];


                snapshot.forEach(
                    (docSnap) => {

                        const item =
                            docSnap.data();


                        if (
                            item.kobong ===
                            namaKobong
                        ) {

                            listData.push(item);
                        }
                    }
                );


                listData.sort(
                    (a, b) =>
                        (b.createdAt?.seconds || 0) -
                        (a.createdAt?.seconds || 0)
                );


                if (listData.length === 0) {

                    tabelRiwayatKobong.innerHTML =
                        `<tr>
                            <td colspan="5" class="text-center">
                                Belum ada riwayat laporan untuk kobong ini.
                            </td>
                        </tr>`;

                } else {

                    listData.forEach(
                        (item) => {

                            const row =
                                document.createElement('tr');


                            const statusColor =
                                item.status === 'Lengkap'
                                    ? '#2e7d32'
                                    : '#c62828';


                            row.innerHTML = `
                                <td>
                                    <strong>${item.waktu}</strong>
                                    <br>
                                    <small>
                                        ${item.tanggal}
                                        (${item.jam})
                                    </small>
                                </td>

                                <td>
                                    <strong>
                                        Kobong ${item.kobong}
                                    </strong>
                                </td>

                                <td>
                                    ${item.nama || '-'}
                                </td>

                                <td style="white-space:pre-line;">
                                    ${item.catatan || '-'}
                                </td>

                                <td>
                                    <span
                                        style="
                                            color:${statusColor};
                                            font-weight:bold;
                                        "
                                    >
                                        ${item.status}
                                    </span>
                                </td>
                            `;

                            tabelRiwayatKobong.appendChild(
                                row
                            );
                        }
                    );
                }
            }
        );
    }
}


// ===========================================================
// 2. SUPER ADMIN
// ===========================================================

const tabelLaporan =
    document.getElementById('tabel-laporan');

const filterKobong =
    document.getElementById('filter-kobong');

let chartKehadiran = null;

let rawLaporanData = [];


if (tabelLaporan) {

    const q =
        query(
            collection(db, "laporan_absensi"),
            orderBy("createdAt", "desc")
        );


    onSnapshot(
        q,
        (snapshot) => {

            rawLaporanData = [];

            const setKobong =
                new Set();


            snapshot.forEach(
                (docSnap) => {

                    const data =
                        docSnap.data();

                    data.id =
                        docSnap.id;

                    rawLaporanData.push(
                        data
                    );


                    if (data.kobong) {
                        setKobong.add(
                            data.kobong
                        );
                    }
                }
            );


            if (filterKobong) {

                const selectedVal =
                    filterKobong.value;


                filterKobong.innerHTML =
                    `<option value="ALL">
                        -- Lihat Semua Kobong --
                    </option>`;


                Array
                    .from(setKobong)
                    .sort()
                    .forEach(
                        k => {

                            const opt =
                                document.createElement(
                                    'option'
                                );

                            opt.value = k;

                            opt.innerText =
                                `Kobong ${k}`;

                            filterKobong.appendChild(
                                opt
                            );
                        }
                    );


                filterKobong.value =
                    selectedVal;
            }


            renderTabelDanGrafik();
        }
    );


    if (filterKobong) {

        filterKobong.addEventListener(
            'change',
            () => {
                renderTabelDanGrafik();
            }
        );
    }
}


// ===========================================================
// RENDER TABEL & GRAFIK
// ===========================================================

function renderTabelDanGrafik() {

    if (!tabelLaporan) return;


    tabelLaporan.innerHTML = '';


    const selectedFilter =
        filterKobong
            ? filterKobong.value
            : 'ALL';


    const filteredData =
        rawLaporanData.filter(
            item => {

                if (
                    selectedFilter ===
                    'ALL'
                ) {
                    return true;
                }

                return (
                    item.kobong ===
                    selectedFilter
                );
            }
        );


    if (filteredData.length === 0) {

        tabelLaporan.innerHTML =
            `<tr>
                <td colspan="5" class="text-center">
                    Belum ada laporan untuk kobong ini.
                </td>
            </tr>`;

    } else {

        filteredData.forEach(
            (item) => {

                const row =
                    document.createElement('tr');


                row.innerHTML = `
                    <td>
                        <strong>
                            ${item.waktu}
                        </strong>
                        <br>
                        <small>
                            ${item.tanggal}
                            (${item.jam})
                        </small>
                    </td>

                    <td>
                        <strong>
                            Kobong ${item.kobong}
                        </strong>
                    </td>

                    <td>
                        ${item.nama || '-'}
                    </td>

                    <td style="white-space:pre-line;">
                        ${item.catatan || '-'}
                    </td>

                    <td>
                        <span
                            style="
                                color:#2e7d32;
                                font-weight:bold;
                            "
                        >
                            ${item.status}
                        </span>
                    </td>
                `;


                tabelLaporan.appendChild(
                    row
                );
            }
        );
    }


    const rekapKobong = {};


    rawLaporanData.forEach(
        item => {

            if (
                !rekapKobong[item.kobong]
            ) {

                rekapKobong[item.kobong] = {
                    total: 0,
                    lengkap: 0
                };
            }


            rekapKobong[
                item.kobong
            ].total++;


            if (
                item.status ===
                'Lengkap'
            ) {

                rekapKobong[
                    item.kobong
                ].lengkap++;
            }
        }
    );


    renderChart(
        rekapKobong
    );
}


// ===========================================================
// GRAFIK
// ===========================================================

function renderChart(
    rekapKobong
) {

    const ctx =
        document.getElementById(
            'grafikKehadiran'
        );


    if (!ctx) return;


    const labels =
        Object.keys(
            rekapKobong
        );


    const dataPersentase =
        labels.map(
            k => {

                const total =
                    rekapKobong[k].total;

                const lengkap =
                    rekapKobong[k].lengkap;


                return Math.round(
                    (lengkap / total) * 100
                );
            }
        );


    if (chartKehadiran) {
        chartKehadiran.destroy();
    }


    chartKehadiran =
        new Chart(
            ctx,
            {
                type: 'bar',

                data: {

                    labels:
                        labels.map(
                            l =>
                                `Kobong ${l}`
                        ),

                    datasets: [

                        {

                            label:
                                'Persentase Kehadiran (%)',

                            data:
                                dataPersentase,

                            backgroundColor:
                                '#2e7d32',

                            borderRadius:
                                6
                        }
                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            max:
                                100,

                            ticks: {

                                callback:
                                    value =>
                                        value + '%'
                            }
                        }
                    }
                }
            }
        );
}


// ===========================================================
// 3. PAGE DATA SANTRI
// ===========================================================

const formSantriKobong =
    document.getElementById(
        'form-santri-kobong'
    );


const containerDaftarKobong =
    document.getElementById(
        'container-daftar-kobong'
    );


if (formSantriKobong) {

    formSantriKobong.addEventListener(
        'submit',
        async (e) => {

            e.preventDefault();


            const namaKobongInput =
                document
                    .getElementById(
                        'nama-kobong-input'
                    )
                    .value
                    .trim()
                    .toUpperCase();


            const ketuaInput =
                document
                    .getElementById(
                        'ketua-input'
                    )
                    .value
                    .trim();


            const wakilInput =
                document
                    .getElementById(
                        'wakil-input'
                    )
                    .value
                    .trim();


            const daftarSantriRaw =
                document
                    .getElementById(
                        'daftar-santri-input'
                    )
                    .value
                    .trim();


            const listSantriBaru =
                daftarSantriRaw
                    .split('\n')
                    .map(
                        nama =>
                            nama.trim()
                    )
                    .filter(
                        nama =>
                            nama !== ''
                    );


            if (!namaKobongInput) {

                alert(
                    'Nama kobong wajib diisi!'
                );

                return;
            }


            const docRef =
                doc(
                    db,
                    "master_santri",
                    namaKobongInput
                );


            try {

                const docSnap =
                    await getDoc(
                        docRef
                    );


                // =========================================
                // KOBONG SUDAH ADA
                // =========================================

                if (docSnap.exists()) {

                    const dataLama =
                        docSnap.data();


                    // Pertahankan kode lama
                    // Jika belum ada → otomatis buat
                    const kodeLink =
                        dataLama.kode_link ||
                        buatKodeLinkUnik();


                    await updateDoc(
                        docRef,
                        {

                            ketua:
                                ketuaInput,

                            wakil:
                                wakilInput,

                            anggota:
                                arrayUnion(
                                    ...listSantriBaru
                                ),

                            kode_link:
                                kodeLink,

                            updatedAt:
                                new Date()
                        }
                    );


                    alert(
                        `Berhasil memperbarui data Kobong ${namaKobongInput}!`
                    );


                } else {

                    // =====================================
                    // KOBONG BARU
                    // =====================================

                    const kodeLink =
                        buatKodeLinkUnik();


                    await setDoc(
                        docRef,
                        {

                            nama_kobong:
                                namaKobongInput,

                            ketua:
                                ketuaInput,

                            wakil:
                                wakilInput,

                            anggota:
                                listSantriBaru,

                            // KODE UNIK OTOMATIS
                            kode_link:
                                kodeLink,

                            updatedAt:
                                new Date()
                        }
                    );


                    alert(
                        `Berhasil membuat Kobong ${namaKobongInput}!\n\n` +
                        `Link unik otomatis telah dibuat.`
                    );
                }


                formSantriKobong.reset();


            } catch (err) {

                console.error(err);

                alert(
                    'Gagal menyimpan: ' +
                    err.message
                );
            }
        }
    );


    // =======================================================
    // TAMPILKAN SEMUA KOBONG
    // =======================================================

    onSnapshot(
        collection(db, "master_santri"),
        async (snapshot) => {

            containerDaftarKobong.innerHTML = '';


            if (snapshot.empty) {

                containerDaftarKobong.innerHTML =
                    '<p class="text-center">Belum ada data kobong yang dimasukkan.</p>';

                return;
            }


            for (
                const docSnap of snapshot.docs
            ) {

                const dataKobong =
                    docSnap.data();


                const idKobong =
                    docSnap.id;


                const anggotaList =
                    dataKobong.anggota || [];


                // -----------------------------------------
                // OTOMATIS BUAT KODE UNTUK DATA LAMA
                // -----------------------------------------

                let kodeLink =
                    dataKobong.kode_link;


                if (!kodeLink) {

                    kodeLink =
                        buatKodeLinkUnik();


                    try {

                        await updateDoc(
                            doc(
                                db,
                                "master_santri",
                                idKobong
                            ),
                            {
                                kode_link:
                                    kodeLink,

                                updatedAt:
                                    new Date()
                            }
                        );

                    } catch (error) {

                        console.error(
                            'Gagal membuat kode link:',
                            error
                        );
                    }
                }


                const linkAbsensi =
                    buatLinkAbsensi(
                        kodeLink
                    );


                const boxKobong =
                    document.createElement(
                        'div'
                    );


                boxKobong.className =
                    'master-santri-box';


                boxKobong.style.marginBottom =
                    '16px';


                // -----------------------------------------
                // HTML DATA KOBONG
                // -----------------------------------------

                let listHTML = `

                    <div
                        style="
                            margin-bottom:12px;
                            overflow:hidden;
                        "
                    >

                        <button
                            class="btn-delete-kobong"
                            onclick="hapusKobong('${idKobong}')"
                        >
                            Hapus Kobong
                        </button>


                        <button
                            class="btn-edit-pengurus"
                            onclick="editPengurusKobong(
                                '${idKobong}',
                                '${String(
                                    dataKobong.ketua || ''
                                ).replace(/'/g, "\\'")}',
                                '${String(
                                    dataKobong.wakil || ''
                                ).replace(/'/g, "\\'")}'
                            )"
                        >
                            ✏️ Edit Pengurus
                        </button>


                        <h3
                            style="
                                color:#2e7d32;
                                margin:0;
                            "
                        >
                            Kobong ${dataKobong.nama_kobong || idKobong}
                        </h3>


                        <p
                            style="
                                margin:6px 0 4px 0;
                                font-size:0.85rem;
                                color:#1b5e20;
                            "
                        >
                            <strong>Ketua:</strong>
                            ${dataKobong.ketua || '-'}
                            |
                            <strong>Wakil:</strong>
                            ${dataKobong.wakil || '-'}
                        </p>


                        <!-- LINK UNIK -->
                        <div
                            style="
                                margin-top:10px;
                                padding:10px;
                                background:#e8f5e9;
                                border-radius:8px;
                                border:1px solid #c8e6c9;
                            "
                        >

                            <div
                                style="
                                    font-size:0.8rem;
                                    color:#1b5e20;
                                    margin-bottom:5px;
                                "
                            >
                                <strong>🔗 Link Absensi Unik</strong>
                            </div>


                            <div
                                style="
                                    font-size:0.75rem;
                                    word-break:break-all;
                                    color:#333;
                                    margin-bottom:8px;
                                "
                            >
                                ${linkAbsensi}
                            </div>


                            <button
                                type="button"
                                class="btn-nav"
                                style="
                                    width:100%;
                                    cursor:pointer;
                                "
                                onclick="salinLinkKobong(
                                    '${linkAbsensi.replace(/'/g, "\\'")}'
                                )"
                            >
                                🔗 Salin Link Absensi
                            </button>

                        </div>

                    </div>


                    <div
                        style="
                            font-size:0.9rem;
                        "
                    >

                        <strong>
                            Anggota (${anggotaList.length} Santri):
                        </strong>
                `;


                // -----------------------------------------
                // DAFTAR SANTRI
                // -----------------------------------------

                if (
                    anggotaList.length === 0
                ) {

                    listHTML += `
                        <p
                            style="
                                color:#888;
                            "
                        >
                            Belum ada anggota di kobong ini.
                        </p>
                    `;

                } else {

                    anggotaList.forEach(
                        (nama, index) => {

                            const namaSafe =
                                String(nama)
                                    .replace(
                                        /'/g,
                                        "\\'"
                                    );


                            listHTML += `

                                <div
                                    class="santri-item"
                                >

                                    <span>
                                        ${index + 1}. ${nama}
                                    </span>


                                    <button
                                        class="btn-delete-santri"
                                        onclick="hapusSantri(
                                            '${idKobong}',
                                            '${namaSafe}'
                                        )"
                                    >
                                        Hapus
                                    </button>

                                </div>

                            `;
                        }
                    );
                }


                listHTML += `
                    </div>
                `;


                boxKobong.innerHTML =
                    listHTML;


                containerDaftarKobong.appendChild(
                    boxKobong
                );
            }
        }
    );
}


// ===========================================================
// EDIT KETUA & WAKIL
// ===========================================================

window.editPengurusKobong =
    async function(
        idKobong,
        ketuaLama,
        wakilLama
    ) {

        const ketuaBaru =
            prompt(
                `Masukkan nama Ketua baru untuk Kobong ${idKobong}:`,
                ketuaLama
            );


        if (
            ketuaBaru === null
        ) {
            return;
        }


        const wakilBaru =
            prompt(
                `Masukkan nama Wakil baru untuk Kobong ${idKobong}:`,
                wakilLama
            );


        if (
            wakilBaru === null
        ) {
            return;
        }


        try {

            await updateDoc(
                doc(
                    db,
                    "master_santri",
                    idKobong
                ),
                {

                    ketua:
                        ketuaBaru.trim(),

                    wakil:
                        wakilBaru.trim(),

                    updatedAt:
                        new Date()
                }
            );


            alert(
                `Berhasil memperbarui Ketua & Wakil Kobong ${idKobong}!`
            );


        } catch (err) {

            alert(
                'Gagal memperbarui pengurus: ' +
                err.message
            );
        }
    };


// ===========================================================
// HAPUS SANTRI
// ===========================================================

window.hapusSantri =
    async function(
        idKobong,
        namaSantri
    ) {

        if (
            confirm(
                `Yakin ingin menghapus ${namaSantri} dari Kobong ${idKobong}?`
            )
        ) {

            try {

                await updateDoc(
                    doc(
                        db,
                        "master_santri",
                        idKobong
                    ),
                    {

                        anggota:
                            arrayRemove(
                                namaSantri
                            )
                    }
                );

            } catch (err) {

                alert(
                    'Gagal menghapus santri: ' +
                    err.message
                );
            }
        }
    };


// ===========================================================
// HAPUS KOBONG
// ===========================================================

window.hapusKobong =
    async function(
        idKobong
    ) {

        if (
            confirm(
                `Yakin ingin MENGHAPUS SELURUH data Kobong ${idKobong}?`
            )
        ) {

            try {

                await deleteDoc(
                    doc(
                        db,
                        "master_santri",
                        idKobong
                    )
                );


                alert(
                    'Data kobong berhasil dihapus.'
                );


            } catch (err) {

                alert(
                    'Gagal menghapus kobong: ' +
                    err.message
                );
            }
        }
    };


// ===========================================================
// SALIN LINK ABSENSI KOBONG
// ===========================================================

window.salinLinkKobong =
    async function(link) {

        try {

            await navigator.clipboard.writeText(
                link
            );


            alert(
                '✅ Link absensi berhasil disalin!\n\n' +
                'Link tersebut khusus untuk kobong ini.'
            );


        } catch (err) {

            // Fallback jika clipboard gagal
            try {

                const textarea =
                    document.createElement(
                        'textarea'
                    );

                textarea.value =
                    link;

                textarea.style.position =
                    'fixed';

                textarea.style.opacity =
                    '0';

                document.body.appendChild(
                    textarea
                );

                textarea.select();

                document.execCommand(
                    'copy'
                );

                textarea.remove();


                alert(
                    '✅ Link absensi berhasil disalin!'
                );

            } catch (error) {

                alert(
                    'Gagal menyalin link. Silakan salin secara manual:\n\n' +
                    link
                );
            }
        }
    };


// ===========================================================
// FUNGSI SALIN REKAP WHATSAPP
// ===========================================================

window.salinRekapTeks =
    function() {

        if (
            !rawLaporanData ||
            rawLaporanData.length === 0
        ) {

            alert(
                'Belum ada data laporan untuk disalin!'
            );

            return;
        }


        const rekapKobong = {};


        rawLaporanData.forEach(
            item => {

                if (
                    !rekapKobong[
                        item.kobong
                    ]
                ) {

                    rekapKobong[
                        item.kobong
                    ] = {

                        total: 0,

                        lengkap: 0
                    };
                }


                rekapKobong[
                    item.kobong
                ].total++;


                if (
                    item.status ===
                    'Lengkap'
                ) {

                    rekapKobong[
                        item.kobong
                    ].lengkap++;
                }
            }
        );


        let teksRekap =
            `*REKAP ABSENSI KOBONG SANTRI*\n`;


        teksRekap +=
            `Tanggal Cetak: ${
                new Date()
                    .toLocaleDateString(
                        'id-ID'
                    )
            }\n`;


        teksRekap +=
            `=============================\n\n`;


        const sortedKobong =
            Object.keys(
                rekapKobong
            ).sort();


        sortedKobong.forEach(
            k => {

                const total =
                    rekapKobong[k].total;

                const lengkap =
                    rekapKobong[k].lengkap;


                const persen =
                    Math.round(
                        (lengkap / total) *
                        100
                    );


                teksRekap +=
                    `• *Kobong ${k}*: ` +
                    `${persen}% ` +
                    `(${lengkap}/${total} Laporan Lengkap)\n`;
            }
        );


        teksRekap +=
            `\n=============================\n`;


        teksRekap +=
            `_Dicetak otomatis dari Sistem Absensi Santri_`;


        navigator.clipboard
            .writeText(
                teksRekap
            )
            .then(
                () => {

                    alert(
                        'Ringkasan Rekap Kehadiran berhasil disalin!\n' +
                        'Bisa langsung di-paste ke WhatsApp / Catatan Rapat.'
                    );
                }
            )
            .catch(
                err => {

                    alert(
                        'Gagal menyalin: ' +
                        err.message
                    );
                }
            );
    };
