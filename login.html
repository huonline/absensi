<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Login Absensi HU</title>
    <!-- KODE AGAR BISA DISIMPAN SEBAGAI PINTASAN DI LAYAR UTAMA -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="mobile-web-app-capable" content="yes">
    
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .login-box {
            background: #ffffff;
            padding: 30px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 320px;
            text-align: center;
        }
        .login-box h2 {
            color: #2e7d32;
            margin-top: 0;
            margin-bottom: 24px;
        }
        .input-group {
            margin-bottom: 16px;
            text-align: left;
        }
        .input-group label {
            display: block;
            font-size: 0.85rem;
            color: #555;
            margin-bottom: 6px;
            font-weight: bold;
        }
        .input-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 1rem;
        }
        .btn-login {
            width: 100%;
            padding: 12px;
            background-color: #2e7d32;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
        }
        .btn-login:disabled {
            background-color: #a5d6a7;
            cursor: not-allowed;
        }
    </style>
</head>
<body>

    <div class="login-box">
        <h2>Sistem Absensi HU</h2>
        <form id="form-login">
            <div class="input-group">
                <label for="username">Username</label>
                <input type="text" id="username" placeholder="Masukkan username" required autocomplete="off">
            </div>
            <div class="input-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Masukkan password" required>
            </div>
            <button type="submit" class="btn-login" id="btn-submit">Masuk</button>
        </form>
    </div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

        // Konfigurasi Firebase kamu
        const firebaseConfig = {
            apiKey: "AIzaSyClHDzTGncpd_5-Gnc4zmL3JVrXX1tiGKQ",
            authDomain: "admin-hu-874c2.firebaseapp.com",
            projectId: "admin-hu-874c2",
            storageBucket: "admin-hu-874c2.firebasestorage.app",
            messagingSenderId: "419870283564",
            appId: "1:419870283564:web:18054f24b31b52eb7b7e89"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        const formLogin = document.getElementById('form-login');
        const btnSubmit = document.getElementById('btn-submit');

        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Ambil username, hilangkan spasi, dan jadikan huruf kecil
            const inputUsername = document.getElementById('username').value.trim().toLowerCase();
            const inputPassword = document.getElementById('password').value;

            // TRIK: Ubah username jadi format email secara otomatis
            const dummyEmail = `${inputUsername}@hu.local`;

            try {
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Memeriksa...';

                // Proses Login Firebase
                await signInWithEmailAndPassword(auth, dummyEmail, inputPassword);
                
                // Jika berhasil, arahkan ke halaman admin kobong
                window.location.href = 'admin-kobong.html';

            } catch (error) {
                let pesanError = "Gagal login. Silakan coba lagi.";
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    pesanError = "Username atau Password salah!";
                } else if (error.code === 'auth/too-many-requests') {
                    pesanError = "Terlalu banyak percobaan gagal. Coba lagi nanti.";
                }
                
                alert(pesanError);
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Masuk';
            }
        });
    </script>
</body>
</html>
