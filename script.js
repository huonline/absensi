/*
 * SCRIPT UTAMA ABSENSI - VERSI STABIL
 *
 * Penting:
 * - Tidak mengubah struktur HTML/CSS lama.
 * - Fitur absensi lama tetap dijalankan dari versi script stabil.
 * - Menambahkan link unik ?kode=KBG-... tanpa mengubah tampilan/form absensi.
 * - Link lama ?kobong=... tetap kompatibel.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    query,
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
// LINK UNIK KOBONG
// ===========================================================
function buatKodeLinkUnik() {
    const waktu = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `KBG-${waktu}-${random}`;
}

function buatLinkAbsensi(kodeLink) {
    if (!kodeLink) return '';
    const url = new URL('admin-kobong.html', window.location.href);
    url.search = `?kode=${encodeURIComponent(kodeLink)}`;
    return url.href;
}

async function cariKobongDariKode(kode) {
    if (!kode) return null;

    try {
        const q = query(
            collection(db, 'master_santri'),
            where('kode_link', '==', kode)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const hasil = snapshot.docs[0];
        return {
            id: hasil.id,
            data: hasil.data()
        };
    } catch (error) {
        console.error('Gagal mencari kode link kobong:', error);
        return null;
    }
}

// ===========================================================
// BACKFILL KODE LINK + PANEL LINK DI HALAMAN DATA SANTRI
// ===========================================================
function jalankanManajemenLinkUnik() {
    const container = document.getElementById('container-daftar-kobong');
    if (!container) return;

    onSnapshot(collection(db, 'master_santri'), async (snapshot) => {
        const dataKobong = [];

        for (const snap of snapshot.docs) {
            const data = snap.data();
            let kodeLink = data.kode_link;

            // Hanya membuat kode jika belum ada.
            // Tidak mengubah kode yang sudah pernah dibuat.
            if (!kodeLink) {
                kodeLink = buatKodeLinkUnik();
                try {
                    await updateDoc(doc(db, 'master_santri', snap.id), {
                        kode_link: kodeLink
                    });
                } catch (error) {
                    console.error(`Gagal membuat kode link untuk ${snap.id}:`, error);
                }
            }

            dataKobong.push({
                id: snap.id,
                nama: data.nama_kobong || snap.id,
                kode: kodeLink
            });
        }

        // Panel ini berdiri sendiri dan tidak menyentuh struktur kartu lama.
        let panel = document.getElementById('panel-link-unik');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'panel-link-unik';
            panel.style.cssText = [
                'margin: 18px 0;',
                'padding: 16px;',
                'border: 1px solid #d9d9d9;',
                'border-radius: 12px;',
                'background: #fff;',
                'box-sizing: border-box;',
                'width: 100%;'
            ].join('');

            container.parentNode.insertBefore(panel, container);
        }

        dataKobong.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

        panel.innerHTML = `
            <div style="margin-bottom:12px;">
                <strong style="font-size:17px;">🔗 Link Absensi Unik</strong>
                <div style="font-size:13px;color:#666;margin-top:4px;">
                    Setiap kobong mempunyai link sendiri. Link lama ?kobong=... tetap bisa digunakan.
                </div>
            </div>
            ${dataKobong.length === 0
                ? '<div style="color:#888;">Belum ada data kobong.</div>'
                : dataKobong.map(item => {
                    const link = buatLinkAbsensi(item.kode);
                    return `
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:10px;border:1px solid #eee;border-radius:8px;box-sizing:border-box;">
                            <div style="flex:1 1 180px;min-width:0;">
                                <strong>Kobong ${escapeHtml(item.nama)}</strong><br>
                                <small style="color:#777;word-break:break-all;">${escapeHtml(item.kode)}</small>
                            </div>
                            <button type="button" class="btn-copy-link-unik" data-link="${escapeHtml(link)}" style="border:0;border-radius:8px;padding:9px 12px;cursor:pointer;">
                                Salin Link
                            </button>
                        </div>
                    `;
                }).join('')}
        `;

        panel.querySelectorAll('.btn-copy-link-unik').forEach(button => {
            button.addEventListener('click', async () => {
                const link = button.dataset.link;
                try {
                    await navigator.clipboard.writeText(link);
                    const teksLama = button.innerText;
                    button.innerText = '✓ Tersalin';
                    setTimeout(() => {
                        button.innerText = teksLama;
                    }, 1500);
                } catch (error) {
                    // Fallback untuk browser yang memblokir clipboard API.
                    window.prompt('Salin link absensi berikut:', link);
                }
            });
        });
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===========================================================
// ROUTING LINK UNIK
// ===========================================================
async function mulai() {
    const params = new URLSearchParams(window.location.search);
    const kode = (params.get('kode') || '').trim().toUpperCase();
    const halamanKobong = document.getElementById('form-absensi');

    // Halaman data-santri tetap menggunakan script stabil lama,
    // sementara generator link unik berjalan di sampingnya.
    jalankanManajemenLinkUnik();

    if (kode && halamanKobong) {
        const hasil = await cariKobongDariKode(kode);

        if (!hasil) {
            const judul = document.getElementById('nama-kobong');
            if (judul) {
                judul.innerText = 'Link Absensi Tidak Ditemukan';
            }
            alert('Link absensi tidak ditemukan atau sudah tidak tersedia.');
            return;
        }

        // Script lama bekerja berdasarkan ?kobong=...
        // Kita hanya menerjemahkan link unik ke format lama.
        const urlBaru = new URL(window.location.href);
        urlBaru.search = `?kobong=${encodeURIComponent(hasil.id)}`;
        window.history.replaceState({}, '', urlBaru.href);
    }

    // =======================================================
    // JALANKAN SCRIPT LAMA YANG SUDAH TERBUKTI RESPONSIVE
    // =======================================================
    // Commit ini adalah versi sebelum perubahan besar yang membuat
    // tampilan mobile berubah. Tidak ada perubahan CSS/DOM dari sini.
    await import('https://raw.githubusercontent.com/huonline/absensi/5f5b4f465d37bb7c422ff6e30a8ce076ed34777f/script.js');
}

mulai().catch(error => {
    console.error('Gagal menjalankan sistem absensi:', error);
});
