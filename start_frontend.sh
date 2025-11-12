
#!/bin/bash
# Скрипт запуска frontend в режиме разработки

cd "$(dirname "$0")/frontend"

# Установка зависимостей, если node_modules не существует
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Запуск dev сервера
npm run dev
