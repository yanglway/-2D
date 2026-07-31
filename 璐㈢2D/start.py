"""
财神2D - 快速启动脚本
"""
import os
import sys
import subprocess
import webbrowser
import time

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'backend')
    
    print("=" * 55)
    print("  🏆  财神2D - 启动中...")
    print("=" * 55)
    print()
    
    # 检查依赖
    try:
        import flask
        import flask_cors
    except ImportError:
        print("📦 正在安装依赖...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'flask', 'flask-cors', '-q'], check=True)
        print("✅ 依赖安装完成")
        print()
    
    # 启动后端
    print("🚀 启动后端服务...")
    os.chdir(backend_dir)
    
    # Windows用pythonw避免弹出窗口
    if sys.platform == 'win32':
        subprocess.Popen([sys.executable, 'server.py'], 
                       creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        subprocess.Popen([sys.executable, 'server.py'])
    
    time.sleep(2)
    
    print()
    print("=" * 55)
    print("  ✅ 服务已启动！")
    print()
    print("  📱 展示页(前端): 打开 frontend/index.html")
    print("  🔧 后台管理:     http://localhost:5000/admin")
    print("  📡 API接口:      http://localhost:5000/api/data")
    print()
    print("  后台登录: 用户名 admin / 密码 admin123")
    print("=" * 55)
    print()
    print("按 Ctrl+C 停止服务")
    
    # 自动打开浏览器
    try:
        webbrowser.open('http://localhost:5000/admin')
    except:
        pass
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 服务已停止")

if __name__ == '__main__':
    main()
