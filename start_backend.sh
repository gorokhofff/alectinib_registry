
#!/bin/bash
# Скрипт запуска backend в режиме разработки

cd "$(dirname "$0")/backend"

# Активация виртуального окружения (если есть)
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Запуск сервера
python -m uvicorn main:app --reload --host 0.0.0.0 --port 5000
