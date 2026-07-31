# 财神2D - 彩票竞猜系统

## 项目结构

```
财神2D/
├── frontend/          # 展示页（前端）
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── backend/           # 后台管理
│   ├── server.py      # Flask后端服务
│   ├── admin.html     # 后台管理页面
│   └── data.json      # 数据存储
└── README.md
```

## 功能说明

### 展示页
- 倒计时显示
- 开奖号码展示
- 投注区域（SET/VAL）
- 历史记录
- 多时段开奖

### 后台管理
- 开奖号码设置
- 投注记录查看
- 用户管理
- 数据统计

## 运行方式

1. 安装依赖：`pip install flask`
2. 启动后端：`python backend/server.py`
3. 访问前端：`打开 frontend/index.html`
4. 访问后台：`http://localhost:5000/admin`
