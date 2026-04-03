// === CONFIGURACIÓN DE FIREBASE (PEGA TUS DATOS AQUÍ) ===
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos HTML
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const dateInput = document.getElementById('date-input');
const skuInput = document.getElementById('sku-input');
const addBtn = document.getElementById('add-button');
const tablesContainer = document.getElementById('tables-container');

// 1. CONTROL DE USUARIO (LOGICA DE CUENTAS)
auth.onAuthStateChanged(user => {
    if (user) {
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        dateInput.value = new Date().toISOString().split('T')[0];
        escucharDatos(user.uid);
    } else {
        authSection.style.display = 'block';
        mainApp.style.display = 'none';
    }
});

function login() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error: " + err.message));
}

function register() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(e, p).catch(err => alert("Error: " + err.message));
}

function logout() { auth.signOut(); }

// 2. LÓGICA DE DATOS (NUBE)
function escucharDatos(uid) {
    db.collection('usuarios').doc(uid).collection('pedidos')
    .onSnapshot(snapshot => {
        const pedidos = [];
        snapshot.forEach(doc => pedidos.push({ id: doc.id, ...doc.data() }));
        renderizarTodo(pedidos);
    });
}

function renderizarTodo(orders) {
    updateMonthlyDashboard(orders);
    tablesContainer.innerHTML = '';
    const grouped = {};
    orders.forEach(o => {
        if (!grouped[o.date]) grouped[o.date] = [];
        grouped[o.date].push(o);
    });

    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(date => {
        let dayNeto = 0;
        let rowsHtml = '';
        grouped[date].forEach(o => {
            dayNeto += o.total;
            rowsHtml += `
                <div class="order-row">
                    <div class="order-qty">${o.qty}</div>
                    <div class="order-info">
                        <div class="order-math">${o.price}x${o.qty} + $${o.base}</div>
                        <div class="order-total">$${o.total.toLocaleString('es-CL')}</div>
                    </div>
                    <button class="delete-btn" onclick="deleteOrder('${o.id}')">✕</button>
                </div>`;
        });
        tablesContainer.innerHTML += `
            <div class="daily-card">
                <div class="daily-header">📅 ${date}</div>
                <div>${rowsHtml}</div>
                <div class="daily-footer">
                    <div class="footer-total">Líquido: $${Math.round(dayNeto * 0.855).toLocaleString('es-CL')}</div>
                </div>
            </div>`;
    });
}

addBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    const qty = parseInt(skuInput.value);
    const date = dateInput.value;
    if (!user || !qty) return;

    let price = 0, base = 0;
    if (qty <= 10) { price = 120; base = 1000; }
    else if (qty <= 20) { price = 70; base = 1000; }
    else if (qty <= 30) { price = 60; base = 1000; }
    else if (qty <= 40) { price = 55; base = 1000; }
    else if (qty <= 50) { price = 50; base = 1000; }
    else { price = 40; base = 1200; }

    const total = base + (price * qty);
    
    db.collection('usuarios').doc(user.uid).collection('pedidos').add({
        date, qty, price, base, total, createdAt: Date.now()
    });
    skuInput.value = '';
});

window.deleteOrder = (id) => {
    if(confirm("¿Borrar?")) {
        db.collection('usuarios').doc(auth.currentUser.uid).collection('pedidos').doc(id).delete();
    }
};

// 3. TU LÓGICA DEL DÍA 4 (PERIODOS)
function updateMonthlyDashboard(orders) {
    const now = new Date();
    const dia = now.getDate();
    let m = now.getMonth(), a = now.getFullYear();
    if (dia < 4) { if (m === 0) { m = 11; a--; } else { m--; } }
    
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('current-month-name').textContent = `Periodo: ${meses[m]} ${a}`;

    let totalNeto = 0, count = 0;
    orders.forEach(o => {
        const d = new Date(o.date + "T00:00:00");
        if (d.getMonth() === m && d.getFullYear() === a) {
            count++; totalNeto += o.total;
        }
    });

    document.getElementById('month-orders-count').textContent = count;
    document.getElementById('month-neto-value').textContent = `$${totalNeto.toLocaleString('es-CL')}`;
    document.getElementById('month-liquido-value').textContent = `$${Math.round(totalNeto * 0.855).toLocaleString('es-CL')}`;
}
