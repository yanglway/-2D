// ===== 财神2D 前端逻辑 (最终修正版) =====

// 🚨 强制锁定后端地址，绝对不允许再用 localhost！
const API_BASE = 'https://miantong.pythonanywhere.com/api';

console.log('🚀 前端启动，API地址已锁定为:', API_BASE);

// 全局状态
let appState = {
    currentNumber: 45,
    countdown: 5971,
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
    console.log('✅ DOM加载完成');
    initNumberGrid();
    initCountdown();
    initNavigation();
    initModal();
    initDate();
    loadData(); // 这里会尝试拉取数据
    startAutoRefresh();
});

// ===== 加载数据 (关键修正) =====
async function loadData() {
    console.log('📡 正在请求数据...');
    try {
        const url = `${API_BASE}/data`;
        console.log('🌐 请求URL:', url); // 看这里是不是 PythonAnywhere 的地址
        
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        console.log('📊 响应状态:', res.status); // 200 才是成功
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        console.log('✅ 收到后端数据:', data); // 看这里有没有数据
        
        if (data.success) {
            appState.currentNumber = data.currentNumber || 45;
            appState.sessions = data.sessions || appState.sessions;

            document.getElementById('currentNumber').textContent =
                appState.currentNumber.toString().padStart(2, '0');
            document.getElementById('session1Num').textContent =
                appState.sessions['12:00 PM']?.number ?? '--';
            document.getElementById('session2Num').textContent =
                appState.sessions['04:30 PM']?.number ?? '--';
            document.getElementById('setValue').textContent = data.set || '1,232.1';
            document.getElementById('valValue').textContent = data.val || '29,76 .31';
            
            console.log('🎨 页面已更新');
        } else {
            console.warn('⚠️ 后端返回 success: false', data);
        }
    } catch (err) {
        console.error('❌ 加载数据失败:', err);
        // 如果失败，显示离线提示，但不阻断页面
        showToast('⚠️ 无法连接服务器，使用离线数据');
    }
}

// ===== 投注提交 (关键修正) =====
async function submitBet(betData) {
    console.log('💰 提交投注:', betData);
    try {
        const res = await fetch(`${API_BASE}/bet`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(betData)
        });
        
        console.log('📊 投注响应状态:', res.status);
        const data = await res.json();
        console.log('✅ 投注响应数据:', data);

        if (data.success) {
            showToast(`投注成功！号码: ${betData.number}，金额: ${betData.amount}`);
            closeModal('betModal');
            document.getElementById('betAmount').value = '';
            appState.selectedNumber = null;
            document.querySelectorAll('.number-cell').forEach(c => c.classList.remove('selected'));
            
            // 🔄 投注成功后，立刻刷新一次数据，让用户看到变化
            setTimeout(() => loadData(), 1000);
        } else {
            showToast(data.message || '投注失败');
        }
    } catch (err) {
        console.error('❌ 投注请求失败:', err);
        showToast('❌ 网络错误，请检查连接');
    }
}

// ===== 其他函数保持不变 (为了节省空间，省略了重复部分，请保留你原来的) =====
// ... (initNumberGrid, initCountdown, initNavigation, initModal, triggerLottery, loadHistory, renderHistory, initDate, showToast, startAutoRefresh 都保持原样)

// ⚠️ 注意：为了让你直接能用，我把上面两个核心函数改好了。
// 如果你原来的代码里有其他函数（比如开奖、历史记录），请保留，不要覆盖。
// 只把 loadData 和 submitBet 这两个函数替换成我给的版本即可。

// ===== 其他函数（保留你原来的） =====
function initNumberGrid() {
    const grid = document.getElementById('numberGrid');
    if (!grid) return;
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

function initCountdown() {
    updateCountdownDisplay();
    setInterval(() => {
        appState.countdown--;
        if (appState.countdown <= 0) {
            appState.countdown = 600;
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
    const el = document.getElementById('countdown');
    if (el) el.textContent = timeStr;
}

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
                loadData();
            }
        });
    });
}

function initModal() {
    document.getElementById('closeModal')?.addEventListener('click', () => closeModal('betModal'));
    document.getElementById('closeHistory')?.addEventListener('click', () => closeModal('historyModal'));
    document.getElementById('cancelBet')?.addEventListener('click', () => closeModal('betModal'));

    document.getElementById('confirmBet')?.addEventListener('click', () => {
        const amount = document.getElementById('betAmount')?.value;
        const session = document.getElementById('betSession')?.value;

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
    document.getElementById(id)?.classList.add('show');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('show');
}

function triggerLottery() {
    const newNumber = Math.floor(Math.random() * 100);
    appState.currentNumber = newNumber;

    const numEl = document.getElementById('currentNumber');
    if (numEl) {
        numEl.textContent = newNumber.toString().padStart(2, '0');
        numEl.classList.add('lottery-animation');
        setTimeout(() => numEl.classList.remove('lottery-animation'), 3000);
    }

    const now = new Date();
    const hour = now.getHours();
    if (hour < 13) {
        document.getElementById('session1Num')?.textContent = newNumber.toString().padStart(2, '0');
    } else {
        document.getElementById('session2Num')?.textContent = newNumber.toString().padStart(2, '0');
    }

    showToast(`🎉 开奖号码: ${newNumber.toString().padStart(2, '0')}`);

    fetch(`${API_BASE}/lottery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: newNumber, time: new Date().toISOString() })
    }).catch(() => {});
}

async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/history`);
        const data = await res.json();
        appState.history = data.history || [];
    } catch (err) {
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
    if (!list) return;
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

function initDate() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2,'0');
    const month = (now.getMonth() + 1).toString().padStart(2,'0');
    const year = now.getFullYear();
    const el = document.getElementById('currentDate');
    if (el) el.textContent = `${day}/${month}/${year}`;
}

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

function startAutoRefresh() {
    setInterval(() => {
        loadData();
    }, 30000);
}
