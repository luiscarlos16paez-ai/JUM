const firebaseConfig = {
  apiKey: "AIzaSyDFsS7xZYavVU31qTYxMJ6Pw6ZtrvJLDvQ",
  authDomain: "controlsku-8f61c.firebaseapp.com",
  projectId: "controlsku-8f61c",
  storageBucket: "controlsku-8f61c.firebasestorage.app",
  messagingSenderId: "975706837551",
  appId: "1:975706837551:web:bedaee5092dff36df22cda"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(), db = firebase.firestore();

// --- MODO OSCURO ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

// --- NAVEGACIÓN ---
function mostrarLogin() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('auth-section').style.display = 'block';
}

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
        escucharDatos(user.uid);
    } else {
        document.getElementById('landing-page').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }
});

function login() {
    const e = document.getElementById('email').value, p = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(e, p).catch(() => alert("Datos incorrectos"));
}
function register() {
    const e = document.getElementById('email').value, p = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(e, p).catch(err => alert(err.message));
}
function logout() { auth.signOut(); }

// --- DATOS ---
function escucharDatos(uid) {
    db.collection('usuarios').doc(uid).collection('pedidos').orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
        const pedidos = [];
        snap.forEach(doc => pedidos.push({ id: doc.id, ...doc.data() }));
        renderizarTodo(pedidos);
    });
}

function renderizarTodo(orders) {
    updateMonthlyDashboard(orders);
    const container = document.getElementById('tables-container');
    container.innerHTML = '';
    const grouped = {};
    orders.forEach(o => { if(!grouped[o.date]) grouped[o.date] = []; grouped[o.date].push(o); });

    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(date => {
        let netoDía = 0;
        let rowsHtml = grouped[date].map(o => {
            netoDía += o.total;
            return `<div class="order-row">
                <div class="order-qty">${o.qty}</div>
                <div style="flex-grow:1; font-size:13px; opacity: 0.8;">Total: $${o.total.toLocaleString()}</div>
                <button style="background:none; border:none; color:#f87171; cursor:pointer;" onclick="deleteOrder('${o.id}')">✕</button>
            </div>`;
        }).join('');

        container.innerHTML += `<div class="daily-card">
            <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px; margin-bottom:10px; opacity:0.6;">
                <span>📅 ${date}</span>
                <span>${grouped[date].length} PEDIDOS</span>
            </div>
            ${rowsHtml}
            <div style="text-align:right; margin-top:10px; font-weight:800; color:#10b981;">Líquido: $${Math.round(netoDía * 0.855).toLocaleString()}</div>
        </div>`;
    });
}

// --- LÓGICA CIERRE DE MES (DÍA 3) ---
function updateMonthlyDashboard(orders) {
    const now = new Date();
    const diaA = now.getDate();
    let mC = now.getMonth(), yC = now.getFullYear();

    if (diaA < 3) { if (mC === 0) { mC = 11; yC--; } else { mC--; } }

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('current-month-name').textContent = `${meses[mC]} ${yC}`;

    let totalN = 0, totalP = 0;
    orders.forEach(o => {
        const d = new Date(o.date + "T00:00:00");
        const dP = d.getDate(), mP = d.getMonth(), yP = d.getFullYear();
        let match = false;
        if (yP === yC && mP === mC && dP >= 3) match = true;
        let mS = mC === 11 ? 0 : mC + 1, yS = mC === 11 ? yC + 1 : yC;
        if (yP === yS && mP === mS && dP < 3) match = true;
        if (match) { totalP++; totalN += o.total; }
    });

    document.getElementById('month-orders-count').textContent = totalP;
    document.getElementById('month-neto-value').textContent = `$${totalN.toLocaleString('es-CL')}`;
    document.getElementById('month-liquido-value').textContent = `$${Math.round(totalN * 0.855).toLocaleString('es-CL')}`;
}

document.getElementById('add-button').addEventListener('click', () => {
    const q = parseInt(document.getElementById('sku-input').value);
    const d = document.getElementById('date-input').value;
    if (!q || !d) return;
    let p = 0, b = 0;
    if (q <= 10) { p = 120; b = 1000; }
    else if (q <= 20) { p = 70; b = 1000; }
    else if (q <= 30) { p = 60; b = 1000; }
    else if (q <= 40) { p = 55; b = 1000; }
    else if (q <= 50) { p = 50; b = 1000; }
    else { p = 40; b = 1200; }
    
    db.collection('usuarios').doc(auth.currentUser.uid).collection('pedidos').add({
        date: d, qty: q, total: (b + (p * q)), createdAt: Date.now()
    });
    document.getElementById('sku-input').value = '';
});

window.deleteOrder = (id) => { if(confirm("¿Borrar?")) db.collection('usuarios').doc(auth.currentUser.uid).collection('pedidos').doc(id).delete(); };
