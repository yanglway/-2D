"""
财神2D - 后端服务
功能：开奖管理、投注记录、数据统计、后台管理
"""

import json
import os
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ===== 数据文件 =====
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')

# ===== 默认数据 =====
DEFAULT_DATA = {
    "currentNumber": 45,
    "countdown": 5971,
    "set": "1,232.1",
    "val": "29,76 .31",
    "sessions": {
        "12:00 PM": {"number": 45, "status": "closed"},
        "04:30 PM": {"number": "--", "status": "waiting"}
    },
    "history": [
        {"date": "2026-07-31", "session": "12:00 PM", "number": 45},
        {"date": "2026-07-31", "session": "04:30 PM", "number": 78},
        {"date": "2026-07-30", "session": "12:00 PM", "number": 12},
        {"date": "2026-07-30", "session": "04:30 PM", "number": 56},
        {"date": "2026-07-29", "session": "12:00 PM", "number": 89},
        {"date": "2026-07-29", "session": "04:30 PM", "number": 34},
        {"date": "2026-07-28", "session": "12:00 PM", "number": 67},
        {"date": "2026-07-28", "session": "04:30 PM", "number": 23},
        {"date": "2026-07-27", "session": "12:00 PM", "number": 91},
        {"date": "2026-07-27", "session": "04:30 PM", "number": 5},
    ],
    "bets": [],
    "users": [
        {"id": 1, "username": "player1", "balance": 5000, "totalBet": 1200},
        {"id": 2, "username": "player2", "balance": 3200, "totalBet": 800},
        {"id": 3, "username": "player3", "balance": 8900, "totalBet": 2500},
    ],
    "settings": {
        "drawInterval": 600,  # 开奖间隔(秒)
        "minBet": 1,
        "maxBet": 10000,
        "payoutRate": 98,  # 赔率
    }
}


def load_data():
    """加载数据"""
    if not os.path.exists(DATA_FILE):
        save_data(DEFAULT_DATA)
        return DEFAULT_DATA.copy()
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return DEFAULT_DATA.copy()


def save_data(data):
    """保存数据"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ===== API路由 =====

@app.route('/api/data', methods=['GET'])
def get_data():
    """获取前端展示数据"""
    data = load_data()
    return jsonify({
        "success": True,
        "currentNumber": data["currentNumber"],
        "countdown": data["countdown"],
        "set": data["set"],
        "val": data["val"],
        "sessions": data["sessions"],
        "history": data["history"][:10]
    })


@app.route('/api/lottery', methods=['POST'])
def draw_lottery():
    """手动触发开奖"""
    data = load_data()
    req = request.get_json()
    number = req.get('number', random.randint(0, 99))

    data["currentNumber"] = number

    # 更新时段
    now = datetime.now()
    if now.hour < 13:
        data["sessions"]["12:00 PM"] = {"number": number, "status": "closed"}
        data["sessions"]["04:30 PM"] = {"number": "--", "status": "waiting"}
    else:
        data["sessions"]["04:30 PM"] = {"number": number, "status": "closed"}

    # 添加到历史
    today = now.strftime('%Y-%m-%d')
    data["history"].insert(0, {
        "date": today,
        "session": "12:00 PM" if now.hour < 13 else "04:30 PM",
        "number": number
    })

    # 计算中奖
    for bet in data["bets"]:
        if bet.get("session") in [today + " 12:00 PM", today + " 04:30 PM"]:
            if bet["number"] == number:
                bet["status"] = "won"
                bet["winAmount"] = bet["amount"] * (data["settings"]["payoutRate"] / 10)
            else:
                bet["status"] = "lost"

    save_data(data)
    return jsonify({"success": True, "number": number})


@app.route('/api/bet', methods=['POST'])
def place_bet():
    """提交投注"""
    data = load_data()
    req = request.get_json()

    # 验证
    number = req.get('number')
    amount = req.get('amount')
    session = req.get('session')

    if number is None or amount is None or not session:
        return jsonify({"success": False, "message": "参数不完整"}), 400

    if amount < data["settings"]["minBet"]:
        return jsonify({"success": False, "message": f"最低投注 {data['settings']['minBet']}"}), 400

    if amount > data["settings"]["maxBet"]:
        return jsonify({"success": False, "message": f"最高投注 {data['settings']['maxBet']}"}), 400

    bet_record = {
        "id": len(data["bets"]) + 1,
        "number": number,
        "amount": amount,
        "session": session,
        "timestamp": req.get('timestamp', datetime.now().isoformat()),
        "status": "pending",
        "winAmount": 0
    }

    data["bets"].append(bet_record)
    save_data(data)

    return jsonify({"success": True, "betId": bet_record["id"], "message": "投注成功"})


@app.route('/api/history', methods=['GET'])
def get_history():
    """获取开奖历史"""
    data = load_data()
    return jsonify({
        "success": True,
        "history": data["history"]
    })


# ===== 后台管理API =====

@app.route('/api/admin/bets', methods=['GET'])
def admin_get_bets():
    """获取所有投注记录"""
    data = load_data()
    return jsonify({
        "success": True,
        "bets": data["bets"],
        "total": len(data["bets"])
    })


@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    """获取用户列表"""
    data = load_data()
    return jsonify({
        "success": True,
        "users": data["users"]
    })


@app.route('/api/admin/stats', methods=['GET'])
def admin_get_stats():
    """获取统计数据"""
    data = load_data()
    total_bets = len(data["bets"])
    total_amount = sum(b["amount"] for b in data["bets"])
    won_bets = [b for b in data["bets"] if b.get("status") == "won"]
    total_payout = sum(b.get("winAmount", 0) for b in won_bets)

    # 号码频率统计
    number_freq = {}
    for h in data["history"]:
        num = h["number"]
        number_freq[num] = number_freq.get(num, 0) + 1

    return jsonify({
        "success": True,
        "stats": {
            "totalBets": total_bets,
            "totalAmount": total_amount,
            "totalPayout": total_payout,
            "profit": total_amount - total_payout,
            "activeUsers": len(data["users"]),
            "numberFrequency": number_freq,
            "currentNumber": data["currentNumber"]
        }
    })


@app.route('/api/admin/set-result', methods=['POST'])
def admin_set_result():
    """后台设置开奖结果"""
    data = load_data()
    req = request.get_json()
    number = req.get('number')

    if number is None or not (0 <= number <= 99):
        return jsonify({"success": False, "message": "号码必须在0-99之间"}), 400

    data["currentNumber"] = number
    now = datetime.now()
    today = now.strftime('%Y-%m-%d')

    if now.hour < 13:
        data["sessions"]["12:00 PM"] = {"number": number, "status": "closed"}
    else:
        data["sessions"]["04:30 PM"] = {"number": number, "status": "closed"}

    data["history"].insert(0, {
        "date": today,
        "session": "12:00 PM" if now.hour < 13 else "04:30 PM",
        "number": number
    })

    save_data(data)
    return jsonify({"success": True, "message": f"开奖号码已设置为 {number}"})


@app.route('/api/admin/settings', methods=['GET', 'POST'])
def admin_settings():
    """获取/更新设置"""
    data = load_data()

    if request.method == 'GET':
        return jsonify({"success": True, "settings": data["settings"]})

    req = request.get_json()
    data["settings"].update(req)
    save_data(data)
    return jsonify({"success": True, "message": "设置已更新"})


# ===== 后台管理页面 =====
@app.route('/admin')
def admin_page():
    """后台管理页面"""
    admin_path = os.path.join(os.path.dirname(__file__), 'admin.html')
    return send_file(admin_path)


# ===== 自动开奖定时器(可选) =====
@app.route('/api/admin/auto-draw', methods=['POST'])
def auto_draw():
    """自动开奖 - 供定时任务调用"""
    data = load_data()
    number = random.randint(0, 99)
    data["currentNumber"] = number

    now = datetime.now()
    today = now.strftime('%Y-%m-%d')

    if now.hour < 13:
        data["sessions"]["12:00 PM"] = {"number": number, "status": "closed"}
    else:
        data["sessions"]["04:30 PM"] = {"number": number, "status": "closed"}

    data["history"].insert(0, {
        "date": today,
        "session": "12:00 PM" if now.hour < 13 else "04:30 PM",
        "number": number
    })

    save_data(data)
    return jsonify({"success": True, "number": number, "time": now.isoformat()})


if __name__ == '__main__':
    # 确保数据文件存在
    if not os.path.exists(DATA_FILE):
        save_data(DEFAULT_DATA)

    print("=" * 50)
    print("  财神2D - 后端服务已启动")
    print("  前端地址: http://localhost:5000/frontend")
    print("  后台地址: http://localhost:5000/admin")
    print("  API文档:  http://localhost:5000/api/data")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)
