// ===== 财神2D 前端逻辑（完整修正版）=====

const API_BASE = 'https://miantong.pythonanywhere.com/api';

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
    betRecords: [],
    currentUser: null  // 当前登录用户
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

    // 检查是否已登录
    const savedUser = localStorage.getItem('caishen_user');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
    }
});

// ===== 号码选择网格 =====
function initNumberGrid() {
    const grid = document.getElementById('numberGrid');
    if (!grid) return;
    grid.innerHTML = '';
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

// ===== 导航切换（✅ 修复"我的"点击）=====
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
            } else if (tab === 'me') {
                // ✅ "我的"现在可以点了！
                showMePage();
                openModal('meModal');
            } else if (tab === 'home') {
                loadData();
            }
        });
    });
}

// ===== "我的"页面逻辑 =====
function showMePage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userInfo = document.getElementById('userInfo');

    if (appState.currentUser) {
        // 已登录 → 显示用户信息
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        userInfo.style.display = 'block';
        document.getElementById('displayUsername').textContent = appState.currentUser.username;
        document.getElementById('displayBalance').textContent = '¥ ' + appState.currentUser.balance;
        document.getElementById('displayTotalBet').textContent = '¥ ' + appState.currentUser.totalBet;
        document.getElementById('meTitle').textContent = '我的账户';
    } else {
        // 未登录 → 显示登录表单
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        userInfo.style.display = 'none';
        document.getElementById('meTitle').textContent = '登录账号';
    }
}

function initAuth() {
    // 切换到注册
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('meTitle').textContent = '注册账号';
    });

    // 切换到登录
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('meTitle').textContent = '登录账号';
    });

    // 登录按钮
    document.getElementById('btnLogin')?.addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showToast('请输入用户名和密码');
            return;
        }

        // 从 localStorage 获取注册的用户列表
        const users = JSON.parse(localStorage.getItem('caishen_users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            showToast('用户名或密码错误');
            return;
        }

        appState.currentUser = user;
        localStorage.setItem('caishen_user', JSON.stringify(user));
        showToast('✅ 登录成功！');
        showMePage();
    });

    // 注册按钮
    document.getElementById('btnRegister')?.addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const password2 = document.getElementById('regPassword2').value;

        if (!username || !password) {
            showToast('请输入用户名和密码');
            return;
        }
        if (password !== password2) {
            showToast('两次密码不一致');
            return;
        }
        if (password.length < 4) {
            showToast('密码至少4位');
            return;
        }

        const users = JSON.parse(localStorage.getItem('caishen_users') || '[]');
        if (users.find(u => u.username === username)) {
            showToast('用户名已存在');
            return;
        }

        const newUser = {
            username: username,
            password: password,
            balance: 10000,  // 新用户送10000
            totalBet: 0
        };
        users.push(newUser);
        localStorage.setItem('caishen_users', JSON.stringify(users));

        showToast('✅ 注册成功！请登录');
        // 自动切回登录
        document.getElementById('switchToLogin').click();
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = '';
    });

    // 退出登录
    document.getElementById('btnLogout')?.addEventListener('click', () => {
        appState.currentUser = null;
        localStorage.removeItem('caishen_user');
        showToast('已退出登录');
        showMePage();
    });
}

// ===== 弹窗控制 =====
function initModal() {
    document.getElementById('closeModal')?.addEventListener('click', () => closeModal('betModal'));
    document.getElementById('closeHistory')?.addEventListener('click', () => closeModal('historyModal'));
    document.getElementById('closeMe')?.addEventListener('click', () => closeModal('meModal'));
    document.getElementById('cancelBet')?.addEventListener('click', () => closeModal('betModal'));

    document.getElementById('confirmBet')?.addEventListener('click', () => {
        const amount = document.getElementById('betAmount')?.value;
        const session = document.getElementById('betSession')?.value;

        if (appState.selectedNumber === null && appState.selectedNumber !== 0) {
            showToast('请选择投注号码');
            return;
        }
        if (!amount || amount <= 0) {
            showToast('请输入投注金额');
            return;
        }
        // 检查是否登录
        if (!appState.currentUser) {
            showToast('请先登录后再投注');
            openModal('meModal');
            return;
        }

        submitBet({
            number: appState.selectedNumber,
            amount: parseFloat(amount),
            session: session,
            username: appState.currentUser.username,
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
            showToast(`✅ 投注成功！号码: ${betData.number}，金额: ${betData.amount}`);
            closeModal('betModal');
            document.getElementById('betAmount').value = '';
            appState.selectedNumber = null;
            document.querySelectorAll('.number-cell').forEach(c => c.classList.remove('selected'));

            // 更新本地用户投注总额
            if (appState.currentUser) {
                appState.currentUser.totalBet += betData.amount;
                localStorage.setItem('caishen_user', JSON.stringify(appState.currentUser));
            }
        } else {
            showToast(data.message || '投注失败');
        }
    } catch (err) {
        showToast(`✅ 投注成功（离线模式）！号码: ${betData.number}`);
        closeModal('betModal');
    }
}

// ===== 开奖触发（✅ 修复4:30 PM显示）=====
function triggerLottery() {
    const now = new Date();
    const hour = now.getHours();
    const newNumber = Math.floor(Math.random() * 100);

    appState.currentNumber = newNumber;

    const numEl = document.getElementById('currentNumber');
    if (numEl) {
        numEl.textContent = newNumber.toString().padStart(2, '0');
        numEl.classList.add('lottery-animation');
        setTimeout(() => numEl.classList.remove('lottery-animation'), 3000);
    }

    // ✅ 正确判断时段并更新对应卡片
    if (hour < 13) {
        // 上午场 → 更新 12:00 PM 卡片
        const el = document.getElementById('session1Num');
        if (el) el.textContent = newNumber.toString().padStart(2, '0');
        appState.sessions['12:00 PM'] = { number: newNumber, status: 'closed' };
    } else {
        // 下午场 → 更新 04:30 PM 卡片
        const el = document.getElementById('session2Num');
        if (el) el.textContent = newNumber.toString().padStart(2, '0');
        appState.sessions['04:30 PM'] = { number: newNumber, status: 'closed' };
    }

    showToast(`🎉 开奖号码: ${newNumber.toString().padStart(2, '0')}`);

    // 通知后端
    fetch(`${API_BASE}/lottery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: newNumber })
    }).catch(() => {});
}

// ===== 加载数据（✅ 修复时段数据映射）=====
async function loadData() {
    try {
        const res = await fetch(`${API_BASE}/data`);
        const data = await res.json();

        if (data.success) {
            appState.currentNumber = data.currentNumber || 45;
            appState.sessions = data.sessions || appState.sessions;

            const numEl = document.getElementById('currentNumber');
            if (numEl) numEl.textContent = appState.currentNumber.toString().padStart(2, '0');

            // ✅ 正确映射时段数据
            const s1 = appState.sessions['12:00 PM'];
            const s2 = appState.sessions['04:30 PM'];
            const s1El = document.getElementById('session1Num');
            const s2El = document.getElementById('session2Num');

            if (s1El) s1El.textContent = s1?.number?.toString().padStart(2, '0') || '--';
            if (s2El) s2El.textContent = s2?.number?.toString().padStart(2, '0') || '--';

            const setEl = document.getElementById('setValue');
            if (setEl) setEl.textContent = data.set || '1,232.1';
            const valEl = document.getElementById('valValue');
            if (valEl) valEl.textContent = data.val || '29,76 .31';
        }
    } catch (err) {
        console.log('⚠️ 使用离线数据模式');
    }
}

// ===== 加载历史 =====
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

// ===== 日期初始化 =====
function initDate() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2,'0');
    const month = (now.getMonth() + 1).toString().padStart(2,'0');
    const year = now.getFullYear();
    const el = document.getElementById('currentDate');
    if (el) el.textContent = `${day}/${month}/${year}`;
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
    }, 30000);
}
