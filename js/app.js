// ===== 财神2D 前端逻辑（完整修正版）=====

const API_BASE = 'https://miantong.pythonanywhere.com/api';

// 全局状态
let appState = {
    currentNumber: null,
    countdown: 5971,
    selectedNumber: null,
    sessions: {},
    history: [],
    currentUser: null  // {username, balance, totalBet}
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initNumberGrid();
    initCountdown();
    initNavigation();
    initModal();
    initDate();
    initAuth();
    loadData();
    startAutoRefresh();

    // 恢复登录态
    const saved = localStorage.getItem('caishen_user');
    if (saved) {
        try {
            appState.currentUser = JSON.parse(saved);
            refreshBalanceBar();
        } catch(e) {}
    }
});

// ===== 号码网格 =====
function initNumberGrid() {
    const grid = document.getElementById('numberGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i <= 99; i++) {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = i.toString().padStart(2, '0');
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
            appState.countdown = 600;
            // 不本地随机，让后端决定
            fetch(`${API_BASE}/admin/auto-draw`, { method: 'POST' }).then(() => loadData());
        }
        updateCountdownDisplay();
    }, 1000);
}

function updateCountdownDisplay() {
    const total = Math.max(0, appState.countdown);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const el = document.getElementById('countdown');
    if (el) el.textContent = `${h12.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')} ${ampm}`;
}

// ===== 导航 =====
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            if (tab === 'bet') {
                if (!appState.currentUser) { showToast('请先登录'); openModal('meModal'); return; }
                refreshBetBalanceHint();
                openModal('betModal');
            } else if (tab === 'history') {
                loadHistory();
                openModal('historyModal');
            } else if (tab === 'me') {
                showMePage();
                openModal('meModal');
            } else if (tab === 'home') {
                loadData();
            }
        });
    });
}

// ===== 弹窗 =====
function initModal() {
    document.getElementById('closeModal')?.addEventListener('click', () => closeModal('betModal'));
    document.getElementById('closeHistory')?.addEventListener('click', () => closeModal('historyModal'));
    document.getElementById('closeMe')?.addEventListener('click', () => closeModal('meModal'));
    document.getElementById('cancelBet')?.addEventListener('click', () => closeModal('betModal'));

    document.getElementById('confirmBet')?.addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('betAmount')?.value);
        const session = document.getElementById('betSession')?.value;
        if (appState.selectedNumber === null && appState.selectedNumber !== 0) {
            showToast('请选择投注号码'); return;
        }
        if (!amount || amount <= 0) { showToast('请输入投注金额'); return; }
        if (!appState.currentUser) { showToast('请先登录'); openModal('meModal'); return; }
        if (amount > appState.currentUser.balance) { showToast('余额不足'); return; }

        submitBet({
            username: appState.currentUser.username,
            number: appState.selectedNumber,
            amount: amount,
            session: session,
            timestamp: new Date().toISOString()
        });
    });
}

function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

// ===== 投注（✅ 扣余额 + 刷新）=====
async function submitBet(betData) {
    try {
        const res = await fetch(`${API_BASE}/bet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(betData)
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ 投注成功！号码: ${betData.number}，金额: ${betData.amount}`);
            // ✅ 更新本地余额
            if (appState.currentUser) {
                appState.currentUser.balance = data.balance;
                appState.currentUser.totalBet = (appState.currentUser.totalBet || 0) + betData.amount;
                localStorage.setItem('caishen_user', JSON.stringify(appState.currentUser));
                refreshBalanceBar();
                refreshBetBalanceHint();
            }
            closeModal('betModal');
            document.getElementById('betAmount').value = '';
            appState.selectedNumber = null;
            document.querySelectorAll('.number-cell').forEach(c => c.classList.remove('selected'));
        } else {
            showToast(data.message || '投注失败');
        }
    } catch (err) {
        showToast('❌ 网络错误，请检查连接');
    }
}

// ===== 开奖触发 =====
function triggerLottery() {
    fetch(`${API_BASE}/admin/auto-draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json()).then(data => {
        if (data.success) {
            showLotteryResult(data.number, data.session);
            loadData();
        }
    }).catch(() => {});
}

// ✅ 展示开奖结果
function showLotteryResult(number, session) {
    const banner = document.getElementById('resultBanner');
    const text = document.getElementById('resultText');
    if (!banner || !text) return;
    text.textContent = `🎉 ${session} 开奖号码: ${number.toString().padStart(2,'0')}`;
    banner.style.display = 'block';
    banner.classList.remove('banner-pop');
    void banner.offsetWidth; // reflow
    banner.classList.add('banner-pop');
    setTimeout(() => { banner.style.display = 'none'; }, 5000);

    // 更新对应卡片
    const isPM = session === '04:30 PM';
    const el = document.getElementById(isPM ? 'session2Num' : 'session1Num');
    if (el) {
        el.textContent = number.toString().padStart(2, '0');
        el.classList.remove('number-pop');
        void el.offsetWidth;
        el.classList.add('number-pop');
    }
    showToast(`🎉 开奖: ${number.toString().padStart(2,'0')}`);
}

// ===== 加载数据（✅ 完整映射）=====
async function loadData() {
    try {
        const res = await fetch(`${API_BASE}/data`);
        const data = await res.json();
        if (!data.success) return;

        appState.currentNumber = data.currentNumber;
        appState.sessions = data.sessions || {};
        appState.countdown = data.countdown || 600;

        const numEl = document.getElementById('currentNumber');
        if (numEl) numEl.textContent = (data.currentNumber ?? '--').toString().padStart(2, '0');

        const s1 = data.sessions?.['12:00 PM'];
        const s2 = data.sessions?.['04:30 PM'];
        const s1El = document.getElementById('session1Num');
        const s2El = document.getElementById('session2Num');
        if (s1El) s1El.textContent = s1?.number?.toString().padStart(2,'0') ?? '--';
        if (s2El) s2El.textContent = s2?.number?.toString().padStart(2,'0') ?? '--';

        const st1 = document.getElementById('session1Status');
        const st2 = document.getElementById('session2Status');
        if (st1) st1.textContent = s1?.status === 'closed' ? '✅ 已开奖' : '⏳ 等待中';
        if (st2) st2.textContent = s2?.status === 'closed' ? '✅ 已开奖' : '⏳ 等待中';

        const setEl = document.getElementById('setValue');
        if (setEl) setEl.textContent = data.set || '--';
        const valEl = document.getElementById('valValue');
        if (valEl) valEl.textContent = data.val || '--';
    } catch (err) {
        console.warn('⚠️ 数据加载失败', err);
    }
}

// ===== 开奖历史 =====
async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/history`);
        const data = await res.json();
        appState.history = data.history || [];
    } catch (err) {
        appState.history = [];
    }
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!appState.history.length) { list.innerHTML = '<div class="empty-tip">暂无开奖记录</div>'; return; }
    list.innerHTML = appState.history.map(item => `
        <div class="history-item ${item.number === appState.currentNumber ? 'history-current' : ''}">
            <div>
                <div class="history-date">${item.date}</div>
                <div class="history-session">${item.session}</div>
            </div>
            <div class="history-number">${item.number.toString().padStart(2,'0')}</div>
        </div>
    `).join('');
}

// ===== 日期 =====
function initDate() {
    const now = new Date();
    const d = now.getDate().toString().padStart(2,'0');
    const m = (now.getMonth()+1).toString().padStart(2,'0');
    const y = now.getFullYear();
    const el = document.getElementById('currentDate');
    if (el) el.textContent = `${d}/${m}/${y}`;
}

// ===== 认证（✅ 走后端 API）=====
function initAuth() {
    document.getElementById('switchToRegister')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('meTitle').textContent = '注册账号';
    });
    document.getElementById('switchToLogin')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('meTitle').textContent = '登录账号';
    });

    document.getElementById('btnLogin')?.addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!username || !password) { showToast('请输入用户名和密码'); return; }
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                appState.currentUser = { username: data.username, balance: data.balance, totalBet: data.totalBet };
                localStorage.setItem('caishen_user', JSON.stringify(appState.currentUser));
                showToast('✅ 登录成功');
                refreshBalanceBar();
                showMePage();
            } else {
                showToast(data.message || '登录失败');
            }
        } catch (err) { showToast('❌ 网络错误'); }
    });

    document.getElementById('btnRegister')?.addEventListener('click', async () => {
        const username = document.getElementById('regUsername').value.trim();
        const pw1 = document.getElementById('regPassword').value;
        const pw2 = document.getElementById('regPassword2').value;
        if (!username || !pw1) { showToast('请输入用户名和密码'); return; }
        if (pw1 !== pw2) { showToast('两次密码不一致'); return; }
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: pw1 })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ 注册成功！赠送余额 ¥${data.balance}`);
                // 自动登录
                appState.currentUser = { username, balance: data.balance, totalBet: 0 };
                localStorage.setItem('caishen_user', JSON.stringify(appState.currentUser));
                refreshBalanceBar();
                showMePage();
            } else {
                showToast(data.message || '注册失败');
            }
        } catch (err) { showToast('❌ 网络错误'); }
    });

    document.getElementById('btnLogout')?.addEventListener('click', () => {
        appState.currentUser = null;
        localStorage.removeItem('caishen_user');
        document.getElementById('balanceBar').style.display = 'none';
        showToast('已退出登录');
        showMePage();
    });
}

// ===== "我的"页面 =====
function showMePage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userInfo = document.getElementById('userInfo');
    if (appState.currentUser) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        userInfo.style.display = 'block';
        document.getElementById('displayUsername').textContent = appState.currentUser.username;
        document.getElementById('displayBalance').textContent = appState.currentUser.balance;
        document.getElementById('displayTotalBet').textContent = appState.currentUser.totalBet || 0;
        document.getElementById('meTitle').textContent = '我的账户';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        userInfo.style.display = 'none';
        document.getElementById('meTitle').textContent = '登录账号';
    }
}

// ===== 余额条 =====
function refreshBalanceBar() {
    const bar = document.getElementById('balanceBar');
    if (!bar) return;
    if (appState.currentUser) {
        bar.style.display = 'flex';
        document.getElementById('balanceValue').textContent = appState.currentUser.balance;
        document.getElementById('totalBetValue').textContent = appState.currentUser.totalBet || 0;
    } else {
        bar.style.display = 'none';
    }
}

function refreshBetBalanceHint() {
    const el = document.getElementById('betBalanceHint');
    if (el && appState.currentUser) el.textContent = appState.currentUser.balance;
}

// ===== Toast =====
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== 自动刷新 =====
function startAutoRefresh() {
    setInterval(() => { loadData(); }, 30000);
}
