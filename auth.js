// auth.js - Keamanan & Autentikasi
// Karena menggunakan Firestore (NoSQL), SQL injection tidak mungkin terjadi
// Validasi tambahan untuk mencegah injeksi pada query Firestore

const DEVELOPER_USERNAME = "WannTheClown";

// Fungsi sanitasi input (mencegah NoSQL injection)
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Hapus karakter berbahaya untuk Firestore
  return input
    .replace(/[\.\$\#\[\]\/]/g, '')
    .replace(/null|undefined|true|false/gi, '')
    .trim()
    .substring(0, 50); // Batasi panjang
}

// Cek apakah user sudah login (via session localStorage)
function isLoggedIn() {
  const session = localStorage.getItem('galaxy_session');
  if (!session) return false;
  try {
    const data = JSON.parse(session);
    return data.username === DEVELOPER_USERNAME && data.expires > Date.now();
  } catch {
    return false;
  }
}

// Login
async function loginUser(username) {
  const cleanUsername = sanitizeInput(username);
  
  // Cek di Firestore koleksi `users`
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('username', '==', cleanUsername).get();
  
  if (snapshot.empty) {
    return { success: false, message: '❌ Username tidak ditemukan!' };
  }
  
  // Buat session 24 jam
  const sessionData = {
    username: cleanUsername,
    loginTime: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000)
  };
  localStorage.setItem('galaxy_session', JSON.stringify(sessionData));
  
  return { success: true, message: '✅ Login berhasil!', username: cleanUsername };
}

// Logout
function logoutUser() {
  localStorage.removeItem('galaxy_session');
  window.location.href = 'index.html';
}

// Proteksi halaman (panggil di setiap halaman yang perlu login)
function protectPage() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// Ambil data session
function getSessionData() {
  const session = localStorage.getItem('galaxy_session');
  return session ? JSON.parse(session) : null;
}