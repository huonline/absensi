/*
 * SCRIPT UTAMA ABSENSI - VERSI STABIL + KODE LINK UNIK
 *
 * Prinsip:
 * - Seluruh sistem lama tetap dijalankan oleh script stabil.
 * - Data Firestore lama tidak diubah, dipindah, atau dihapus.
 * - Laporan lama tetap memakai field `kobong` seperti sebelumnya.
 * - Kode unik hanya menjadi identitas/link alternatif untuk membuka kobong.
 * - Link lama ?kobong=... tetap kompatibel.
 * - Tidak membuat Firebase app kedua.
 */

// ===========================================================
// KODE UNIK KOBONG (DETERMINISTIK, TANPA MENGUBAH FIRESTORE)
// ===========================================================
function bytesToBase64Url(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function encodeKobongId(id) {
    return bytesToBase64Url(new TextEncoder().encode(String(id)));
}

function decodeKobongId(value) {
    try {
        return new TextDecoder().decode(base64UrlToBytes(value));
    } catch (error) {
        return null;
    }
}

function hashKobong(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toUpperCase();
}

function buatKodeUnikKobong(idKobong) {
    return `KBG-${encodeKobongId(idKobong)}-${hashKobong(idKobong)}`;
}

function buatLinkAbsensiUnik(idKobong) {
    const url = new URL('admin-kobong.html', window.location.href);
    url.search = `?kode=${encodeURIComponent(buatKodeUnikKobong(idKobong))}`;
    return url.href;
}

function ambilIdDariKode(kode) {
    // Jangan mengubah huruf besar/kecil pada bagian Base64.
    // Base64 bersifat case-sensitive.
    const value = String(kode || '').trim();
    const match = /^KBG-(.+)-([A-Z0-9]+)$/i.exec(value);
    if (!match) return null;

    const encodedId = match[1];
    const id = decodeKobongId(encodedId);
    if (!id) return null;

    // Validasi membuat kode tetap unik dan tidak mudah salah rujuk.
    if (buatKodeUnikKobong(id) !== value) return null;
    return id;
}

// ===========================================================
// ROUTING ?kode=... -> ?kobong=...
// ===========================================================
function prosesLinkUnik() {
    const params = new URLSearchParams(window.location.search);
    const kode = params.get('kode');
    const formAbsensi = document.getElementById('form-absensi');

    if (!kode || !formAbsensi) return;

    const idKobong = ambilIdDariKode(kode);
    if (!idKobong) {
        const judul = document.getElementById('nama-kobong');
        if (judul) judul.innerText = 'Link Absensi Tidak Valid';
        return;
    }

    // Script stabil lama tetap membaca ?kobong=...
    const urlBaru = new URL(window.location.href);
    urlBaru.search = `?kobong=${encodeURIComponent(idKobong)}`;
    window.history.replaceState({}, '', urlBaru.href);
}

// ===========================================================
// TAMPILKAN KODE + LINK UNIK DI KARTU DATA KOBONG
// Script lama tetap menjadi sumber data utama.
// ===========================================================
function pasangLinkUnikPadaKartu() {
    const container = document.getElementById('container-daftar-kobong');
    if (!container) return;

    const kartu = container.querySelectorAll('.master-santri-box');

    kartu.forEach(box => {
        if (box.querySelector('.panel-link-unik-lokal')) return;

        let idKobong = null;
        const tombolHapus = box.querySelector('.btn-delete-kobong');
        if (tombolHapus) {
            const onclick = tombolHapus.getAttribute('onclick') || '';
            const match = onclick.match(/hapusKobong\('([^']+)'\)/);
            if (match) idKobong = match[1];
        }

        const judul = box.querySelector('h3');
        if (!idKobong && judul) {
            idKobong = judul.textContent.replace(/^\s*Kobong\s*/i, '').trim();
        }

        if (!idKobong) return;

        const kode = buatKodeUnikKobong(idKobong);
        const link = buatLinkAbsensiUnik(idKobong);

        const panel = document.createElement('div');
        panel.className = 'panel-link-unik-lokal';
        panel.style.cssText = 'margin:10px 0 0;padding:10px;border:1px solid #e0e0e0;border-radius:8px;box-sizing:border-box;background:#fafafa;';
        panel.innerHTML = `
            <div style="font-size:0.85rem;margin-bottom:5px;"><strong>🔗 Kode Unik Absensi</strong></div>
            <div style="font-size:0.8rem;color:#666;word-break:break-all;margin-bottom:8px;">${escapeHtmlUnik(kode)}</div>
            <button type="button" class="btn-copy-link-unik-lokal" style="border:0;border-radius:7px;padding:8px 12px;cursor:pointer;">Salin Link Absensi</button>
        `;

        panel.querySelector('button').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(link);
                const button = panel.querySelector('button');
                const oldText = button.textContent;
                button.textContent = '✓ Link Tersalin';
                setTimeout(() => { button.textContent = oldText; }, 1500);
            } catch (error) {
                window.prompt('Salin link absensi berikut:', link);
            }
        });

        box.appendChild(panel);
    });
}

function escapeHtmlUnik(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===========================================================
// JALANKAN SISTEM LAMA TANPA MENGUBAH LOGIKA/DATA LAMA
// ===========================================================
(async function jalankanSistem() {
    try {
        // Terjemahkan link unik sebelum script lama membaca URL.
        prosesLinkUnik();

        // Jalankan tepat script stabil sebelum perubahan besar.
        await import('https://raw.githubusercontent.com/huonline/absensi/5f5b4f465d37bb7c422ff6e30a8ce076ed34777f/script.js');

        // Tambahkan link unik hanya pada halaman master data.
        const container = document.getElementById('container-daftar-kobong');
        if (container) {
            const observer = new MutationObserver(() => pasangLinkUnikPadaKartu());
            observer.observe(container, { childList: true, subtree: true });
            pasangLinkUnikPadaKartu();
        }
    } catch (error) {
        console.error('Gagal menjalankan sistem absensi:', error);
    }
})();
