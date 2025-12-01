import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, increment, getDoc, query, serverTimestamp, addDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "demo", projectId: "demo" };
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getFirestore(appFirebase);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'vdv-intl-v1';

// --- STATE ---
let currentUser = null;
let isAdmin = localStorage.getItem('vdv_admin_key') === 'vdv1februari2022';
let currentEditingEventId = null;

// --- DATA ---
const structureData = {
    1: { ketum: "Kak Ridwan Pasorong (Founder)", sekum: "Perintis A", bendum: "Perintis B", divisions: [] },
    2: { ketum: "Alumni Periode 2", sekum: "Sekum 2", bendum: "Bendum 2", divisions: [] },
    3: { ketum: "Alumni Periode 3", sekum: "Sekum 3", bendum: "Bendum 3", divisions: [] },
    4: { ketum: "Alumni Periode 4", sekum: "Sekum 4", bendum: "Bendum 4", divisions: [] },
    5: { // PERIODE SEKARANG
        ketum: "Budi Santoso (2024/2025)",
        sekum: "Siti Aminah",
        bendum: "Rizky Pratama",
        divisions: [
            { name: "Litigasi", members: ["Andi Saputra", "Bayu Nugraha", "Cinta Laura", "Dedi Corb", "Eka Gustiwana"] },
            { name: "Kompetisi", members: ["Fajar Sadboy", "Gita Gutawa", "Hadi Tjahjanto", "Indah P.", "Joko A."] },
            { name: "Kaderisasi", members: ["Kiki Fatmala", "Lina Jubaedah", "Mario Bros", "Nina Tamam", "Oscar Lawalata"] },
            { name: "Humas", members: ["Putri Delina", "Qibil Changcuters", "Rina Nose", "Soni Wakwaw", "Tia Ivanka"] },
            { name: "Danus", members: ["Umar Lubis", "Vivi Voletha", "Wawan Teamlo", "Xena Warrior", "Yudi Latif"] }
        ]
    }
};

const eventsDB = [
    { id: 'vr', title: "VR (Open Recruitment)", date: "21 Agustus", desc: "Penerimaan Anggota Baru VDV.", gform: "https://forms.google.com/vr", active: true },
    { id: 'vmcc', title: "VMCC Internal", date: "23 November", desc: "Kompetisi Peradilan Semu Internal.", gform: "https://forms.google.com/vmcc", active: false },
    { id: 'nmcc', title: "NMCC Nasional", date: "21 Mei", desc: "Delegasi Nasional membawa nama Unsrat.", gform: "https://forms.google.com/nmcc", active: false },
    { id: 'hut', title: "HUT VDV", date: "1 Februari", desc: "Dies Natalis & Syukuran Organisasi.", gform: "#", active: false }
];

// --- APP CONTROLLER ---
window.app = {
    // Menu Toggle Logic
    toggleMenu: () => {
        const menu = document.getElementById('fullscreen-menu');
        const iconBars = document.getElementById('menu-icon-bars');
        const iconClose = document.getElementById('menu-icon-close');
        
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            setTimeout(() => { menu.classList.remove('opacity-0'); }, 10);
            iconBars.classList.add('hidden');
            iconClose.classList.remove('hidden');
        } else {
            menu.classList.add('opacity-0');
            setTimeout(() => { menu.classList.add('hidden'); }, 500);
            iconBars.classList.remove('hidden');
            iconClose.classList.add('hidden');
        }
    },

    // Navigation Logic
    nav: (page) => {
        // Close menu if open
        const menu = document.getElementById('fullscreen-menu');
        if(!menu.classList.contains('hidden')) app.toggleMenu();

        document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(page).classList.remove('hidden');
        
        window.scrollTo({top:0, behavior:'smooth'});

        // Init page specific
        if(page === 'structure') app.loadStructure(5);
        if(page === 'calendar') app.renderCalendar();
        if(window.lucide) window.lucide.createIcons();
    },

    // Structure "Time Travel"
    loadStructure: (period) => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        
        const data = structureData[period];
        const container = document.getElementById('org-chart-display');
        
        let html = `
            <div class="flex flex-col items-center gap-8 animate-fade-in">
                <!-- Top Leaders -->
                <div class="flex flex-col items-center">
                    <div class="p-1 rounded-full border-2 border-law-gold mb-2 shadow-[0_0_20px_rgba(212,175,55,0.5)]">
                        <div class="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-law-gold font-bold text-2xl">K</div>
                    </div>
                    <div class="text-law-gold font-bold text-lg font-serif">${data.ketum}</div>
                    <div class="text-[10px] text-gray-500 uppercase tracking-widest">Ketua Umum</div>
                </div>

                <div class="flex gap-12 border-t border-gray-700 pt-6 w-full justify-center">
                    <div class="text-center">
                        <div class="text-white font-bold">${data.sekum}</div>
                        <div class="text-[10px] text-gray-500 uppercase">Sekretaris</div>
                    </div>
                    <div class="text-center">
                        <div class="text-white font-bold">${data.bendum}</div>
                        <div class="text-[10px] text-gray-500 uppercase">Bendahara</div>
                    </div>
                </div>

                <!-- Divisions -->
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4 w-full mt-4">
                    ${data.divisions.length > 0 ? data.divisions.map(div => `
                        <div class="bg-law-emerald/20 border border-law-emerald rounded-xl p-4 hover:bg-law-emerald/40 transition">
                            <h4 class="text-law-gold font-bold text-center text-sm border-b border-gray-700 pb-2 mb-2">${div.name}</h4>
                            <ul class="space-y-1 text-center">
                                ${div.members.map(m => `<li class="text-xs text-gray-300">${m}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('') : '<div class="col-span-5 text-center text-gray-600 italic">Data divisi diarsipkan.</div>'}
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    // Calendar & Admin
    renderCalendar: () => {
        const container = document.getElementById('event-list-container');
        container.innerHTML = eventsDB.map(ev => `
            <div onclick="app.viewEvent('${ev.id}')" class="glass-card p-4 rounded-xl cursor-pointer hover:bg-white/5 border-l-4 ${ev.active ? 'border-green-500' : 'border-gray-600'} transition">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-law-gold font-bold text-lg">${ev.date}</div>
                        <div class="text-white font-bold text-sm">${ev.title}</div>
                    </div>
                    ${ev.active ? '<span class="px-2 py-0.5 bg-green-900 text-green-200 text-[10px] rounded animate-pulse">OPEN</span>' : ''}
                </div>
            </div>
        `).join('');

        if(isAdmin) document.getElementById('admin-edit-btn').classList.remove('hidden');
    },

    viewEvent: (id) => {
        currentEditingEventId = id;
        const ev = eventsDB.find(e => e.id === id);
        const detail = document.getElementById('event-detail-content');
        detail.innerHTML = `
            <div class="animate-fade-in text-center">
                <h2 class="text-3xl font-serif font-bold text-law-gold mb-2">${ev.title}</h2>
                <h3 class="text-5xl font-black text-white mb-6">${ev.date}</h3>
                <p class="text-gray-300 mb-8 max-w-lg mx-auto">${ev.desc}</p>
                
                ${ev.active 
                    ? `<a href="${ev.gform}" target="_blank" class="btn-primary">Daftar Sekarang <i data-lucide="external-link" class="ml-2 w-4 h-4"></i></a>`
                    : `<button class="btn-secondary opacity-50 cursor-not-allowed">Belum Dibuka</button>`
                }
            </div>
        `;
        if(window.lucide) window.lucide.createIcons();
    },

    adminLogin: () => {
        const pass = prompt("Masukkan Passkey Admin (Pengurus Inti):");
        if(pass === "vdv1februari2022") {
            localStorage.setItem('vdv_admin_key', pass);
            isAdmin = true;
            alert("Akses Admin Diberikan.");
            app.checkAdmin();
            app.nav('calendar');
        } else {
            alert("Akses Ditolak.");
        }
    },

    checkAdmin: () => {
        if(isAdmin) {
            if(document.getElementById('finance-panel')) document.getElementById('finance-panel').classList.remove('hidden');
            if(document.getElementById('admin-edit-btn')) document.getElementById('admin-edit-btn').classList.remove('hidden');
        }
    },

    adminEditEvent: () => {
        if(!isAdmin) return;
        if(!currentEditingEventId) {
            alert("Pilih event dulu!");
            return;
        }
        
        const evIndex = eventsDB.findIndex(e => e.id === currentEditingEventId);
        const newDate = prompt("Ubah Tanggal:", eventsDB[evIndex].date);
        if(newDate) {
             eventsDB[evIndex].date = newDate;
             app.renderCalendar();
             app.viewEvent(currentEditingEventId);
        }
    },

    // Auth & Database
    handleLogin: async (e) => {
        e.preventDefault();
        const name = document.getElementById('login-name-input').value;
        if(!name) return;

        try {
            if(!auth.currentUser) await signInAnonymously(auth);
            await updateProfile(auth.currentUser, { displayName: name });
            
            await setDoc(doc(db, `artifacts/${appId}/public/data/users`, auth.currentUser.uid), {
                name: name,
                status: 'online',
                lastLogin: serverTimestamp()
            }, { merge: true });

            document.getElementById('login-modal').classList.add('hidden');
        } catch(err) { alert(err.message); }
    }
};

// --- LISTENERS ---
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const authStatus = document.getElementById('auth-status');

    if(user && user.displayName) {
        authStatus.innerHTML = `
            <div class="text-right mr-3">
                <div class="text-[9px] text-law-gold uppercase font-bold">ANGGOTA</div>
                <div class="text-sm font-bold text-white">${user.displayName}</div>
            </div>
            <button onclick="signOut(auth); location.reload()" class="text-red-500"><i data-lucide="log-out"></i></button>
        `;
        await setDoc(doc(db, `artifacts/${appId}/public/data/users`, user.uid), { status: 'online', lastLogin: serverTimestamp() }, { merge: true });
    } else {
        authStatus.innerHTML = `<button onclick="document.getElementById('login-modal').classList.remove('hidden')" class="btn-primary py-1.5 px-4 text-xs">Login</button>`;
    }
    if(window.lucide) window.lucide.createIcons();
});

const q = query(collection(db, `artifacts/${appId}/public/data/users`), orderBy('lastLogin', 'desc'), limit(100));
onSnapshot(q, (snapshot) => {
    let total = snapshot.size;
    let online = 0;
    const tbody = document.getElementById('member-table-body');
    
    let html = '';
    snapshot.forEach(doc => {
        const u = doc.data();
        if(u.status === 'online') online++;
        html += `
            <tr class="border-b border-gray-800 hover:bg-white/5 transition">
                <td class="py-3 pl-2 font-bold text-white">${u.name}</td>
                <td class="py-3"><span class="px-2 py-0.5 rounded text-[10px] ${u.status === 'online' ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-500'}">${u.status || 'offline'}</span></td>
                <td class="py-3 text-xs text-gray-500">Terdaftar</td>
            </tr>
        `;
    });

    if(tbody) tbody.innerHTML = html;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-online')) document.getElementById('stat-online').innerText = online;
});

// Init
app.checkAdmin();
app.renderCalendar();
if(window.lucide) window.lucide.createIcons();