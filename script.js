const dateInput = document.getElementById('date-input');
const skuInput = document.getElementById('sku-input');
const addBtn = document.getElementById('add-button');
const tablesContainer = document.getElementById('tables-container');
const errorMsg = document.getElementById('error-msg');

const monthOrdersEl = document.getElementById('month-orders-count');
const monthNetoEl = document.getElementById('month-neto-value');
const monthLiquidoEl = document.getElementById('month-liquido-value');
const monthNameEl = document.getElementById('current-month-name');

// Fecha hoy
dateInput.value = new Date().toISOString().split('T')[0];

function getAllOrders() {
    const data = localStorage.getItem('historial_v3');
    return data ? JSON.parse(data) : [];
}

function saveOrders(orders) {
    localStorage.setItem('historial_v3', JSON.stringify(orders));
}

function updateMonthlyDashboard(orders) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthNameEl.textContent = `Mes: ${meses[currentMonth]} ${currentYear}`;

    let mOrders = 0; let mNeto = 0;
    orders.forEach(o => {
        const d = new Date(o.date + "T00:00:00");
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            mOrders++; mNeto += o.total;
        }
    });

    monthOrdersEl.textContent = mOrders;
    monthNetoEl.textContent = `$${mNeto.toLocaleString('es-CL')}`;
    monthLiquidoEl.textContent = `$${Math.round(mNeto * 0.855).toLocaleString('es-CL')}`;
}

function renderTables() {
    const orders = getAllOrders();
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
                        <div class="order-math">Cálculo: ${o.price}x${o.qty} | Base: $${o.base}</div>
                        <div class="order-total">$${o.total.toLocaleString('es-CL')}</div>
                    </div>
                    <button class="delete-btn" onclick="deleteOrder(${o.id})">✕</button>
                </div>`;
        });

        tablesContainer.innerHTML += `
            <div class="daily-card">
                <div class="daily-header">📅 ${date}</div>
                <div>${rowsHtml}</div>
                <div class="daily-footer">
                    <div class="footer-row"><span>Neto:</span> <span>$${dayNeto.toLocaleString('es-CL')}</span></div>
                    <div class="footer-total"><div class="footer-row"><span>Líquido (14.5%):</span> <span>$${Math.round(dayNeto * 0.855).toLocaleString('es-CL')}</span></div></div>
                </div>
            </div>`;
    });
}

addBtn.addEventListener('click', () => {
    const date = dateInput.value;
    const qty = parseInt(skuInput.value);
    if (!date || isNaN(qty) || qty <= 0) {
        errorMsg.textContent = "Datos inválidos";
        return;
    }

    let price = 0; let base = 0;
    if (qty <= 10) { price = 120; base = 1000; }
    else if (qty <= 20) { price = 70; base = 1000; }
    else if (qty <= 30) { price = 60; base = 1000; }
    else if (qty <= 40) { price = 55; base = 1000; }
    else if (qty <= 50) { price = 50; base = 1000; }
    else { price = 40; base = 1200; }

    const total = base + (price * qty);
    const orders = getAllOrders();
    orders.push({ id: Date.now(), date, qty, price, total, base });
    saveOrders(orders);
    
    skuInput.value = '';
    errorMsg.textContent = "";
    renderTables();
});

window.deleteOrder = function(id) {
    if(confirm("¿Eliminar registro?")) {
        const orders = getAllOrders().filter(o => o.id !== id);
        saveOrders(orders);
        renderTables();
    }
};

renderTables();
