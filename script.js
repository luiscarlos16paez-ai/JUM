// === CONFIGURACIÓN DE FIREBASE (PEGA TUS DATOS AQUÍ) ===
const firebaseConfig = {
  apiKey: "AIzaSyDFsS7xZYavVU31qTYxMJ6Pw6ZtrvJLDvQ",
  authDomain: "controlsku-8f61c.firebaseapp.com",
  projectId: "controlsku-8f61c",
  storageBucket: "controlsku-8f61c.firebasestorage.app",
  messagingSenderId: "975706837551",
  appId: "1:975706837551:web:bedaee5092dff36df22cda"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos HTML
const landingPage = document.getElementById('landing-page');
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const dateInput = document.getElementById('date-input');
const skuInput = document.getElementById('sku-input');
const addBtn = document.getElementById('add-button');
const tablesContainer = document.getElementById('tables-container');

// Mostrar Login
function mostrarLogin() {
    landingPage.style.display = 'none';
    authSection.style.display = 'block';
}

// Control de Sesión
auth.onAuthStateChanged(user => {
    if (user) {
        landingPage.style.display = 'none';
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        dateInput.value = new Date().toISOString().split('T')[0];
        escucharDatos(user.uid);
    } else {
        // Solo muestra el landing page si nadie ha iniciado sesión
        landingPage.style.display = 'block';
        authSection.style.display = 'none';
        mainApp.style.display = 'none';
    }
});

function login() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Error: Verifica tus datos."));
}

function register() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(e, p).catch(err => alert("Error: " + err.message));
}

function logout() { auth.signOut(); }

// Leer datos ordenados por creación (Los nuevos se agregan respetando el orden)
function escucharDatos(uid) {
    db.collection('usuarios').doc(uid).collection('pedidos')
    .orderBy('createdAt', 'asc') // Orden cronológico
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
    
    // Agrupar por fecha
    orders.forEach(o => {
        if (!grouped[o.date]) grouped[o.date] = [];
        grouped[o.date].push(o);
    });

    // Ordenar las tarjetas de días (Más reciente arriba)
    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(date => {
        let dayNeto = 0;
        let dayOrdersCount = grouped[date].length; // Conteo de pedidos diarios
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
                <div class="daily-header">
                    <span>📅 ${date}</span>
                    <span style="font-size: 0.8rem; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; font-weight: bold;">
                        ${dayOrdersCount} pedidos
                    </span>
                </div>
                <div>${rowsHtml}</div>
                <div class="daily-footer">
                    <div class="footer-total">Día Líquido: $${Math.round(dayNeto * 0.855).toLocaleString('es-CL')}</div>
                </div>
            </div>`;
    });
}

// Guardar Pedido
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
    
    // Se añade Date.now() para asegurar el orden exacto en el que se hizo clic
    db.collection('usuarios').doc(user.uid).collection('pedidos').add({
        date, qty, price, base, total, createdAt: Date.now()
    });
    skuInput.value = '';
});

// Borrar pedido
window.deleteOrder = (id) => {
    if(confirm("¿Seguro que deseas borrar este registro?")) {
        db.collection('usuarios').doc(auth.currentUser.uid).collection('pedidos').doc(id).delete();
    }
};

// Resumen Mensual (Corte: del 4 de este mes, al 3 del mes siguiente)
function updateMonthlyDashboard(orders) {
    const now = new Date();
    const diaActual = now.getDate();
    let mesContable = now.getMonth();
    let añoContable = now.getFullYear();

    // Si hoy es día 1, 2 o 3, el resumen pertenece al mes pasado
    if (diaActual < 4) {
        if (mesContable === 0) { 
            mesContable = 11; 
            añoContable--; 
        } else { 
            mesContable--; 
        }
    }
    
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('current-month-name').textContent = `${meses[mesContable]} ${añoContable}`;

    let totalNeto = 0, count = 0;
    
    orders.forEach(o => {
        const d = new Date(o.date + "T00:00:00");
        const diaPedido = d.getDate();
        const mesPedido = d.getMonth();
        const añoPedido = d.getFullYear();

        // Lógica para saber si el pedido pertenece al "Mes Contable"
        let perteneceAlMesContable = false;

        // Caso 1: El pedido se hizo entre el día 4 y el final del mes contable
        if (mesPedido === mesContable && añoPedido === añoContable && diaPedido >= 4) {
            perteneceAlMesContable = true;
        }
        // Caso 2: El pedido se hizo los días 1, 2 o 3 del MES SIGUIENTE
        else {
            let mesSiguiente = mesContable === 11 ? 0 : mesContable + 1;
            let añoSiguiente = mesContable === 11 ? añoContable + 1 : añoContable;
            
            if (mesPedido === mesSiguiente && añoPedido === añoSiguiente && diaPedido < 4) {
                perteneceAlMesContable = true;
            }
        }

        if (perteneceAlMesContable) {
            count++; 
            totalNeto += o.total;
        }
    });

    document.getElementById('month-orders-count').textContent = count;
    document.getElementById('month-neto-value').textContent = `$${totalNeto.toLocaleString('es-CL')}`;
    document.getElementById('month-liquido-value').textContent = `$${Math.round(totalNeto * 0.855).toLocaleString('es-CL')}`;
}
