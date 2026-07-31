// ===== 财神2D 前端逻辑 =====

// API基础地址（可配置）
const API_BASE = 'http://localhost:5000/api';

// 全局状态
let appState = {
    currentNumber: 45,
    countdown: 5971, // 秒
    selectedNumber: null,
    sessions: {
        '12:00 PM': { number: 45, status: 'open' },
        '04:30 PM': { number: '--', status: 'waiting' }
    },
    history: [],
    betRecords: []
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initNumberGrid();
    initCountdown();
    initNavigation();
    initModal();
    initDate();
    loadData();
    startAutoRefresh();
});

// ===== 号码选择网格 =====
function initNumberGrid() {
    const grid = document.getElementById('numberGrid');
    for (let i = 0; i <= 99; i++) {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = i.toString().padStart(2, '0');
        cell.dataset.number = i;
        cell.addEventListener('click', () => {
            document.querySelectorAll('.number-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            appState.selectedNumber = i;
        });
        grid.appendChild(cell);
    }
}

// ===== 倒计时 =====
function initCountdown() {
    updateCountdownDisplay();
    setInterval(() => {
        appState.countdown--;
        if (appState.countdown <= 0) {
            appState.countdown = 600; // 重置10分钟
            triggerLottery();
        }
        updateCountdownDisplay();
    }, 1000);
}

function updateCountdownDisplay() {
    const total = appState.countdown;
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const timeStr = `${h12.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')} ${ampm}`;
    document.getElementById('countdown').textContent = timeStr;
}

// ===== 导航切换 =====
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            if (tab === 'bet') {
                openModal('betModal');
            } else if (tab === 'history') {
                loadHistory();
                openModal('historyModal');
            } else if (tab === 'home') {
                // 刷新首页
                loadData();
            }
        });
    });
}

// ===== 弹窗控制 =====
function initModal() {
    document.getElementById('closeModal').addEventListener('click', () => closeModal('betModal'));
    document.getElementById('closeHistory').addEventListener('click', () => closeModal('historyModal'));
    document.getElementById('cancelBet').addEventListener('click', () => closeModal('betModal'));

    document.getElementById('confirmBet').addEventListener('click', () => {
        const amount = document.getElementById('betAmount').value;
        const session = document.getElementById('betSession').value;

        if (!appState.selectedNumber && appState.selectedNumber !== 0) {
            showToast('请选择投注号码');
            return;
        }
        if (!amount || amount <= 0) {
            showToast('请输入投注金额');
            return;
        }

        submitBet({
            number: appState.selectedNumber,
            amount: parseFloat(amount),
            session: session,
            timestamp: new Date().toISOString()
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// ===== 投注提交 =====
async function submitBet(betData) {
    try {
        const res = await fetch(`${API_BASE}/bet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(betData)
        });
        const data = await res.json();

        if (data.success) {
            showToast(`投注成功！号码: ${betData.number}，金额: ${betData.amount}`);
            closeModal('betModal');
            // 重置表单
            document.getElementById('betAmount').value = '';
            appState.selectedNumber = null;
            document.querySelectorAll('.number-cell').forEach(c => c.classList.remove('selected'));
        } else {
            showToast(data.message || '投注失败');
        }
    } catch (err) {
        // 离线模式模拟
        showToast(`投注成功！号码: ${betData.number}，金额: ${betData.amount}`);
        closeModal('betModal');
        appState.betRecords.push(betData);
    }
}

// ===== 开奖触发 =====
function triggerLottery() {
    const newNumber = Math.floor(Math.random() * 100);
    appState.currentNumber = newNumber;

    const numEl = document.getElementById('currentNumber');
    numEl.textContent = newNumber.toString().padStart(2, '0');
    numEl.classList.add('lottery-animation');
    setTimeout(() => numEl.classList.remove('lottery-animation'), 3000);

    // 更新时段
    const now = new Date();
    const hour = now.getHours();
    if (hour < 13) {
        document.getElementById('session1Num').textContent = newNumber.toString().padStart(2, '0');
    } else {
        document.getElementById('session2Num').textContent = newNumber.toString().padStart(2, '0');
    }

    showToast(`🎉 开奖号码: ${newNumber.toString().padStart(2, '0')}`);

    // 通知后端
    fetch(`${API_BASE}/lottery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: newNumber, time: new Date().toISOString() })
    }).catch(() => {});
}

// ===== 加载数据 =====
async function loadData() {
    try {
        const res = await fetch(`${API_BASE}/data`);
        const data = await res.json();
        if (data.success) {
            appState.currentNumber = data.currentNumber || appState.currentNumber;
            appState.sessions = data.sessions || appState.sessions;

            document.getElementById('currentNumber').textContent =
                appState.currentNumber.toString().padStart(2, '0');
            document.getElementById('session1Num').textContent =
                appState.sessions['12:00 PM']?.number || '--';
            document.getElementById('session2Num').textContent =
                appState.sessions['04:30 PM']?.number || '--';
            document.getElementById('setValue').textContent = data.set || '1,232.1';
            document.getElementById('valValue').textContent = data.val || '29,76 .31';
        }
    } catch (err) {
        console.log('使用离线数据模式');
    }
}

// ===== 加载历史 =====
async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/history`);
        const data = await res.json();
        appState.history = data.history || [];
    } catch (err) {
        // 模拟数据
        appState.history = [
            { date: '2026-07-31', session: '12:00 PM', number: 45 },
            { date: '2026-07-31', session: '04:30 PM', number: 78 },
            { date: '2026-07-30', session: '12:00 PM', number: 12 },
            { date: '2026-07-30', session: '04:30 PM', number: 56 },
            { date: '2026-07-29', session: '12:00 PM', number: 89 },
            { date: '2026-07-29', session: '04:30 PM', number: 34 },
            { date: '2026-07-28', session: '12:00 PM', number: 67 },
            { date: '2026-07-28', session: '04:30 PM', number: 23 },
        ];
    }

    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = appState.history.map(item => `
        <div class="history-item">
            <div>
                <div class="history-date">${item.date}</div>
                <div class="history-session">${item.session}</div>
            </div>
            <div class="history-number">${item.number.toString().padStart(2,'0')}</div>
        </div>
    `).join('');
}

// ===== 日期初始化 =====
function initDate() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2,'0');
    const month = (now.getMonth() + 1).toString().padStart(2,'0');
    const year = now.getFullYear();
    document.getElementById('currentDate').textContent = `${day}/${month}/${year}`;
}

// ===== Toast提示 =====
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== 自动刷新 =====
function startAutoRefresh() {
    setInterval(() => {
        loadData();
    }, 30000); // 每30秒刷新
}
