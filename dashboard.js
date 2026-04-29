// dashboard.js - Logika Dashboard
// PROTEKSI HALAMAN
if (!protectPage()) {
  throw new Error('Unauthorized');
}

// ============ VARIABEL GLOBAL ============
let allUsers = [];
let allFiles = [];

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  loadHeaderCredential();
  loadFiles();
});

// ============ MODAL FUNCTIONS ============
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ============ HEADER CREDENTIAL ============
async function loadHeaderCredential() {
  const docRef = db.collection('settings').doc('headerCredential');
  const doc = await docRef.get();
  if (doc.exists) {
    const data = doc.data();
    document.getElementById('headerUsername').textContent = data.username || '-';
    document.getElementById('headerPassword').textContent = data.password || '-';
  }
}

async function openCredentialModal() {
  await loadUsersForSelect('credentialUserSelect');
  openModal('credentialModal');
}

async function saveCredential() {
  const username = document.getElementById('credentialUserSelect').value;
  const password = document.getElementById('credentialPassword').value;
  
  if (!username) {
    alert('⚠️ Pilih user terlebih dahulu!');
    return;
  }
  
  await db.collection('settings').doc('headerCredential').set({
    username: username,
    password: password || '(tidak diset)',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  closeModal('credentialModal');
  loadHeaderCredential();
}

// ============ USER MANAGEMENT ============
async function loadUsersForSelect(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- Pilih User --</option>';
  
  const snapshot = await db.collection('users').orderBy('username').get();
  allUsers = [];
  snapshot.forEach(doc => {
    const user = { id: doc.id, ...doc.data() };
    allUsers.push(user);
    const option = document.createElement('option');
    option.value = user.username;
    option.textContent = user.username;
    select.appendChild(option);
  });
}

function openAddUserModal() {
  document.getElementById('newUsername').value = '';
  openModal('addUserModal');
}

async function addUser() {
  const username = sanitizeInput(document.getElementById('newUsername').value);
  
  if (!username) {
    alert('⚠️ Masukkan username!');
    return;
  }
  
  // Cek duplicate
  const snapshot = await db.collection('users').where('username', '==', username).get();
  if (!snapshot.empty) {
    alert('⚠️ Username sudah ada!');
    return;
  }
  
  await db.collection('users').add({
    username: username,
    role: 'user',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  closeModal('addUserModal');
  alert('✅ User berhasil ditambahkan!');
}

async function openDeleteUserModal() {
  await loadUsersForSelect('userSelect');
  openModal('deleteUserModal');
}

async function deleteUser() {
  const username = document.getElementById('userSelect').value;
  
  if (!username) {
    alert('⚠️ Pilih user!');
    return;
  }
  
  if (username === 'WannTheClown') {
    alert('⛔ Developer tidak bisa dihapus!');
    return;
  }
  
  if (!confirm(`Yakin hapus user "${username}"?`)) return;
  
  const snapshot = await db.collection('users').where('username', '==', username).get();
  snapshot.forEach(async (doc) => {
    await doc.ref.delete();
  });
  
  closeModal('deleteUserModal');
  alert('🗑️ User dihapus!');
}

// ============ FILE MANAGEMENT ============
function openAddFileModal() {
  document.getElementById('fileImage').value = '';
  document.getElementById('fileData').value = '';
  document.getElementById('fileName').value = '';
  openModal('addFileModal');
}

async function saveFile() {
  const imageFile = document.getElementById('fileImage').files[0];
  const dataFile = document.getElementById('fileData').files[0];
  const fileName = document.getElementById('fileName').value.trim();
  
  if (!dataFile) {
    alert('⚠️ Pilih file untuk diupload!');
    return;
  }
  
  if (!fileName) {
    alert('⚠️ Masukkan nama file!');
    return;
  }
  
  try {
    // Upload file ke Storage
    const fileRef = storage.ref('files/' + Date.now() + '_' + dataFile.name);
    await fileRef.put(dataFile);
    const fileURL = await fileRef.getDownloadURL();
    
    let imageURL = '';
    if (imageFile) {
      const imageRef = storage.ref('images/' + Date.now() + '_' + imageFile.name);
      await imageRef.put(imageFile);
      imageURL = await imageRef.getDownloadURL();
    }
    
    // Simpan metadata ke Firestore
    await db.collection('files').add({
      name: sanitizeInput(fileName),
      fileName: dataFile.name,
      fileURL: fileURL,
      imageURL: imageURL,
      fileSize: dataFile.size,
      fileType: dataFile.type,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    closeModal('addFileModal');
    alert('✅ File berhasil disimpan!');
    loadFiles();
  } catch (error) {
    alert('❌ Gagal upload: ' + error.message);
  }
}

async function loadFiles() {
  const grid = document.getElementById('fileGrid');
  grid.innerHTML = '<p style="color:#8090b0; text-align:center; width:100%;">Memuat...</p>';
  
  const snapshot = await db.collection('files').orderBy('uploadedAt', 'desc').get();
  allFiles = [];
  
  if (snapshot.empty) {
    grid.innerHTML = '<p style="color:#8090b0; text-align:center; width:100%;">📭 Belum ada file</p>';
    return;
  }
  
  grid.innerHTML = '';
  snapshot.forEach(doc => {
    const file = { id: doc.id, ...doc.data() };
    allFiles.push(file);
    
    const card = document.createElement('div');
    card.className = 'file-card';
    card.innerHTML = `
      ${file.imageURL ? `<img src="${file.imageURL}" alt="${file.name}" style="max-height:180px; object-fit:cover;">` : '<p style="color:#8090b0;">📁 No Image</p>'}
      <div class="file-name">📄 ${file.name}</div>
      <div class="file-info">
        🗂️ ${file.fileName} | 📏 ${formatSize(file.fileSize)}<br>
        📅 ${file.uploadedAt ? new Date(file.uploadedAt.toDate()).toLocaleDateString('id-ID') : '-'}
      </div>
      <div class="btn-group" style="flex-wrap:wrap;">
        <a href="${file.fileURL}" download="${file.fileName}" class="neon-btn small" style="text-decoration:none;">⬇️ Download</a>
        <button class="neon-btn small" onclick="openEditFile('${file.id}')">✏️ Edit</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openEditFile(fileId) {
  const file = allFiles.find(f => f.id === fileId);
  if (!file) return;
  
  document.getElementById('editFileId').value = fileId;
  document.getElementById('editFileName').value = file.name;
  document.getElementById('editFileImage').value = '';
  document.getElementById('editFileData').value = '';
  
  openModal('editFileModal');
}

async function updateFile() {
  const fileId = document.getElementById('editFileId').value;
  const newName = document.getElementById('editFileName').value.trim();
  const newImageFile = document.getElementById('editFileImage').files[0];
  const newDataFile = document.getElementById('editFileData').files[0];
  
  if (!newName) {
    alert('⚠️ Masukkan nama file!');
    return;
  }
  
  try {
    const updates = { name: sanitizeInput(newName) };
    
    if (newImageFile) {
      const imageRef = storage.ref('images/' + Date.now() + '_' + newImageFile.name);
      await imageRef.put(newImageFile);
      updates.imageURL = await imageRef.getDownloadURL();
    }
    
    if (newDataFile) {
      const fileRef = storage.ref('files/' + Date.now() + '_' + newDataFile.name);
      await fileRef.put(newDataFile);
      updates.fileURL = await fileRef.getDownloadURL();
      updates.fileName = newDataFile.name;
      updates.fileSize = newDataFile.size;
      updates.fileType = newDataFile.type;
    }
    
    await db.collection('files').doc(fileId).update(updates);
    
    closeModal('editFileModal');
    alert('✅ File berhasil diupdate!');
    loadFiles();
  } catch (error) {
    alert('❌ Gagal update: ' + error.message);
  }
}

// ============ CLOSE MODAL ON OVERLAY CLICK ============
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});