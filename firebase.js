// Konfigurasi Firebase Anda
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// State Global
let isAdmin = false;

// Initial Daftar Anggota bawaan
const defaultAnggota = [
    "Nia", "Aditya", "Anisa", "Aaf", "Syarif", "Budi", 
    "Topik", "Yudi", "Heru", "Dozen", "Putri", "Arief", 
    "Anah", "Supriyadi", "Zaelani"
];

// Initial Data Bank bawaan
const defaultBank = [
    { nama: "BCA", norek: "6830747280", an: "eka iswanto" },
    { nama: "MANDIRI", norek: "1570005764080", an: "eka iswanto" }
];

// Inisialisasi Data jika database masih kosong
window.addEventListener('DOMContentLoaded', () => {
    initDefaultData();
    setupRealtimeListeners();
});

// Setup Initial Data jika pertama kali run
function initDefaultData() {
    db.ref('anggota').once('value', snapshot => {
        if (!snapshot.exists()) {
            defaultAnggota.forEach(nama => db.ref('anggota').push({ nama }));
        }
    });

    db.ref('bank').once('value', snapshot => {
        if (!snapshot.exists()) {
            defaultBank.forEach(b => db.ref('bank').push(b));
        }
    });
}

// Check Authentication Status Change
auth.onAuthStateChanged(user => {
    if (user) {
        isAdmin = true;
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        document.getElementById('roleBadge').innerText = "Mode: Admin";
        document.getElementById('roleBadge').className = "bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-semibold";
        document.getElementById('btnLoginModal').classList.add('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        document.getElementById('btnEditHeader').classList.remove('hidden');
    } else {
        isAdmin = false;
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        document.getElementById('roleBadge').innerText = "Mode: Anggota (Read Only)";
        document.getElementById('roleBadge').className = "bg-indigo-800 text-white text-xs px-3 py-1 rounded-full font-semibold";
        document.getElementById('btnLoginModal').classList.remove('hidden');
        document.getElementById('btnLogout').classList.add('hidden');
        document.getElementById('btnEditHeader').classList.add('hidden');
    }
    renderUI();
});

// Real-time Listeners (Otomatis ter-sync ke semua HP/Laptop)
function setupRealtimeListeners() {
    db.ref('headerTitle').on('value', snap => {
        if (snap.exists()) document.getElementById('headerTitle').innerText = snap.val();
    });

    db.ref('anggota').on('value', renderAnggota);
    db.ref('bank').on('value', renderBank);
    db.ref('transaksi').on('value', renderTransaksi);
}

// Render Anggota (Urut Alfabet)
function renderAnggota(snapshot) {
    const container = document.getElementById('anggotaList');
    const selectTrx = document.getElementById('trxAnggota');
    container.innerHTML = '';
    selectTrx.innerHTML = '';

    let list = [];
    snapshot.forEach(child => {
        list.push({ id: child.key, ...child.val() });
    });

    // Urutkan alfabetis
    list.sort((a, b) => a.nama.localeCompare(b.nama));

    list.forEach(item => {
        // Render Badge Anggota
        const chip = document.createElement('div');
        chip.className = "bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-2";
        chip.innerHTML = `<span>${item.nama}</span>`;
        if (isAdmin) {
            chip.innerHTML += `<button onclick="deleteAnggota('${item.id}')" class="text-rose-500 hover:text-rose-700 ml-1"><i class="fa-solid fa-xmark"></i></button>`;
        }
        container.appendChild(chip);

        // Render Option Select Form
        const option = document.createElement('option');
        option.value = item.nama;
        option.textContent = item.nama;
        selectTrx.appendChild(option);
    });
}

// Render Bank
function renderBank(snapshot) {
    const container = document.getElementById('bankList');
    container.innerHTML = '';

    snapshot.forEach(child => {
        const item = child.val();
        const id = child.key;

        const card = document.createElement('div');
        card.className = "p-4 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center";
        card.innerHTML = `
            <div>
                <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${item.nama}</span>
                <p class="font-mono text-lg font-bold text-slate-800 mt-1">${item.norek}</p>
                <p class="text-xs text-slate-500">a/n ${item.an}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="copyToClipboard('${item.norek}')" class="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 transition text-sm">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
                ${isAdmin ? `<button onclick="deleteBank('${id}')" class="bg-rose-100 text-rose-600 p-2 rounded-lg hover:bg-rose-200 transition text-sm"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// Render Transaksi & Kalkulasi Saldo
function renderTransaksi(snapshot) {
    const tbody = document.getElementById('trxTableBody');
    tbody.innerHTML = '';

    let totalMasuk = 0;
    let totalKeluar = 0;

    snapshot.forEach(child => {
        const item = child.val();
        const id = child.key;

        if (item.tipe === 'masuk') totalMasuk += Number(item.nominal);
        else totalKeluar += Number(item.nominal);

        const row = document.createElement('tr');
        row.className = "hover:bg-slate-50 border-b border-slate-100";
        row.innerHTML = `
            <td class="p-3">${item.tanggal}</td>
            <td class="p-3 font-medium">${item.anggota}</td>
            <td class="p-3">${item.kategori}</td>
            <td class="p-3">
                <span class="px-2 py-1 rounded text-xs font-semibold ${item.tipe === 'masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                    ${item.tipe.toUpperCase()}
                </span>
            </td>
            <td class="p-3 font-semibold">Rp ${Number(item.nominal).toLocaleString('id-ID')}</td>
            ${isAdmin ? `
                <td class="p-3 text-center space-x-2">
                    <button onclick="editTransaksi('${id}', '${item.tanggal}', '${item.anggota}', '${item.kategori}', '${item.tipe}', ${item.nominal})" class="text-indigo-600 hover:text-indigo-800"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteTransaksi('${id}')" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
                </td>
            ` : '<td class="admin-only hidden"></td>'}
        `;
        tbody.appendChild(row);
    });

    document.getElementById('totalMasuk').innerText = `Rp ${totalMasuk.toLocaleString('id-ID')}`;
    document.getElementById('totalKeluar').innerText = `Rp ${totalKeluar.toLocaleString('id-ID')}`;
    document.getElementById('saldoSisa').innerText = `Rp ${(totalMasuk - totalKeluar).toLocaleString('id-ID')}`;
}

// Auto-fill Nominal Iuran Bulanan = 100.000
function handleKategoriChange() {
    const kategori = document.getElementById('trxKategori').value;
    if (kategori.toLowerCase().trim() === 'iuran bulanan') {
        document.getElementById('trxNominal').value = 100000;
        document.getElementById('trxTipe').value = 'masuk';
    }
}

// Copy Rekening Function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Nomor rekening berhasil disalin!');
}

// CRUD Admin Operations
function saveTransaksi() {
    const id = document.getElementById('trxId').value;
    const data = {
        tanggal: document.getElementById('trxTanggal').value || new Date().toISOString().split('T')[0],
        anggota: document.getElementById('trxAnggota').value,
        kategori: document.getElementById('trxKategori').value,
        tipe: document.getElementById('trxTipe').value,
        nominal: Number(document.getElementById('trxNominal').value)
    };

    if (id) {
        db.ref('transaksi/' + id).update(data);
    } else {
        db.ref('transaksi').push(data);
    }
    closeModal('trxModal');
}

function editTransaksi(id, tanggal, anggota, kategori, tipe, nominal) {
    document.getElementById('trxId').value = id;
    document.getElementById('trxTanggal').value = tanggal;
    document.getElementById('trxAnggota').value = anggota;
    document.getElementById('trxKategori').value = kategori;
    document.getElementById('trxTipe').value = tipe;
    document.getElementById('trxNominal').value = nominal;
    document.getElementById('trxModalTitle').innerText = 'Ubah Transaksi';
    openModal('trxModal');
}

function deleteTransaksi(id) {
    if (confirm('Hapus transaksi ini?')) db.ref('transaksi/' + id).remove();
}

function saveAnggota() {
    const nama = document.getElementById('anggotaNama').value;
    if (nama) db.ref('anggota').push({ nama });
    closeModal('anggotaModal');
}

function deleteAnggota(id) {
    if (confirm('Hapus anggota?')) db.ref('anggota/' + id).remove();
}

function saveBank() {
    const nama = document.getElementById('bankNama').value;
    const norek = document.getElementById('bankNorek').value;
    const an = document.getElementById('bankAn').value;
    if (nama && norek) db.ref('bank').push({ nama, norek, an });
    closeModal('bankModal');
}

function deleteBank(id) {
    if (confirm('Hapus data bank?')) db.ref('bank/' + id).remove();
}

function editHeaderTitle() {
    const current = document.getElementById('headerTitle').innerText;
    const next = prompt("Ubah Header Text:", current);
    if (next) db.ref('headerTitle').set(next);
}

// Modal Helpers
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Auth Helpers
function loginAdmin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => closeModal('loginModal'))
        .catch(err => alert("Login gagal: " + err.message));
}

function logoutAdmin() {
    auth.signOut();
}
