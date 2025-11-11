// КОНФИГУРАЦИЯ - ВАШ URL APPS SCRIPT
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxtLY4Hww5cB5WPedekWriCYmkiIRonIYU1ojM6HyDyokUiFgsG1RM0agOSM4wW6B1r/exec';

// Система логирования
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 50;
    }

    log(level, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        this.logs.push(logEntry);
        
        // Ограничиваем количество логов
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Вывод в консоль
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');

        // Обновление UI
        this.updateLogDisplay(logEntry);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    updateLogDisplay(logEntry) {
        const logContainer = document.getElementById('logContainer');
        if (!logContainer) return;

        const logElement = document.createElement('div');
        logElement.className = 'log-entry';
        logElement.innerHTML = `
            <span class="log-time">[${logEntry.timestamp}]</span>
            <span class="log-level-${logEntry.level}">${logEntry.level.toUpperCase()}</span>: 
            ${logEntry.message}
            ${logEntry.data ? `<br><small>${JSON.stringify(logEntry.data)}</small>` : ''}
        `;

        logContainer.appendChild(logElement);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    clear() {
        this.logs = [];
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }
}

// Инициализация логгера
const logger = new Logger();

// Основное приложение
class ClickerApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.userData = null;
        this.topPlayers = [];
        this.isTestMode = false;
        this.backendUrl = BACKEND_URL;
        
        logger.info('Приложение инициализировано');
        logger.info('Backend URL:', this.backendUrl);
    }

    init() {
        logger.info('Запуск инициализации приложения');
        
        if (!window.Telegram?.WebApp) {
            this.isTestMode = true;
            logger.warn('Режим тестирования: не в Telegram');
            this.initTestMode();
            return;
        }

        this.initTelegramApp();
    }

    initTelegramApp() {
        try {
            logger.info('Инициализация Telegram Web App');
            logger.info('Версия Telegram Web App:', this.tg.version);
            logger.info('Платформа:', this.tg.platform);
            
            this.tg.expand();
            this.tg.ready();
            
            // Логируем информацию о пользователе
            if (this.tg.initDataUnsafe?.user) {
                const user = this.tg.initDataUnsafe.user;
                logger.info('Пользователь Telegram:', {
                    id: user.id,
                    name: user.first_name,
                    username: user.username
                });
            } else {
                logger.warn('Данные пользователя не доступны');
            }

            // Проверяем поддержку функций
            if (this.tg.enableClosingConfirmation && typeof this.tg.enableClosingConfirmation === 'function') {
                this.tg.enableClosingConfirmation();
                logger.info('Closing confirmation включен');
            } else {
                logger.warn('Closing confirmation не поддерживается');
            }
            
        } catch (error) {
            logger.error('Ошибка инициализации Telegram Web App:', error);
        }
        
        this.setupEventListeners();
        this.loadUserData();
    }

    initTestMode() {
        logger.info('Инициализация тестового режима');
        
        const testUser = {
            id: Math.floor(Math.random() * 1000000),
            first_name: 'TestUser',
            username: 'test_user'
        };
        
        window.Telegram = {
            WebApp: {
                initDataUnsafe: { user: testUser },
                expand: () => logger.info('Expand called'),
                ready: () => logger.info('Ready called'),
                version: '6.0+'
            }
        };

        this.tg = window.Telegram.WebApp;
        document.getElementById('testMode').style.display = 'block';
        
        this.setupEventListeners();
        this.loadUserData();
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }

    setupEventListeners() {
        logger.info('Настройка обработчиков событий');
        
        document.getElementById('clickButton').addEventListener('click', () => this.handleClick());
        document.getElementById('statsTab').addEventListener('click', () => this.switchTab('stats'));
        document.getElementById('topTab').addEventListener('click', () => this.switchTab('top'));
        document.getElementById('clearLogs').addEventListener('click', () => logger.clear());
    }

    async handleClick() {
        logger.info('Обработка клика');
        
        // Анимация
        const clickButton = document.getElementById('clickButton');
        clickButton.classList.add('pulse');
        setTimeout(() => clickButton.classList.remove('pulse'), 500);

        await this.addClick();
    }

    async loadUserData() {
        try {
            const user = this.isTestMode ? 
                this.tg.initDataUnsafe.user : 
                this.tg.initDataUnsafe?.user;

            if (!user) {
                logger.error('Пользователь не найден');
                this.showError('Ошибка авторизации в Telegram');
                return;
            }

            logger.info('Загрузка данных пользователя', { userId: user.id });
            
            const response = await this.fetchJSONP(`${this.backendUrl}?action=getUser&userId=${user.id}`);
            logger.info('Ответ от сервера (getUser):', response);

            if (response.success) {
                this.userData = response.user || { clicks: 0 };
                logger.info('Данные пользователя загружены', this.userData);
                
                this.updateUI();
                await this.loadTopPlayers();
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('app').style.display = 'block';
            } else {
                logger.error('Ошибка загрузки данных', response.error);
                this.showError('Ошибка загрузки данных: ' + (response.error || 'unknown error'));
            }
        } catch (error) {
            logger.error('Ошибка загрузки данных пользователя:', error);
            this.showError('Ошибка соединения: ' + error.message);
        }
    }

    async addClick() {
        try {
            const user = this.isTestMode ? this.tg.initDataUnsafe.user : this.tg.initDataUnsafe.user;
            logger.info('Добавление клика для пользователя', { userId: user.id });

            const response = await this.fetchJSONP(
                `${this.backendUrl}?action=click&userId=${user.id}&username=${encodeURIComponent(user.username || user.first_name)}`
            );

            logger.info('Ответ от сервера (click):', response);

            if (response.success) {
                if (!this.userData) {
                    this.userData = { clicks: 0 };
                }
                this.userData.clicks = response.clicks;
                logger.info('Клик добавлен', { clicks: response.clicks });
                
                this.updateUI();
                await this.loadTopPlayers();
                
                // Виброотклик
                if (!this.isTestMode && this.tg.HapticFeedback && this.tg.HapticFeedback.impactOccurred) {
                    this.tg.HapticFeedback.impactOccurred('light');
                    logger.info('Виброотклик активирован');
                }
            } else {
                logger.error('Ошибка при клике', response.error);
                this.showError('Ошибка при клике: ' + (response.error || 'unknown error'));
            }
        } catch (error) {
            logger.error('Ошибка добавления клика:', error);
            this.showError('Ошибка соединения');
        }
    }

    async loadTopPlayers() {
        try {
            logger.info('Загрузка топа игроков');
            
            const response = await this.fetchJSONP(`${this.backendUrl}?action=getTop`);
            logger.info('Ответ от сервера (getTop):', response);

            if (response.success) {
                this.topPlayers = response.players || [];
                logger.info('Топ игроков загружен', { count: this.topPlayers.length });
                
                this.updateTopList();
                await this.updateUserStats();
            } else {
                logger.error('Ошибка загрузки топа', response.error);
            }
        } catch (error) {
            logger.error('Ошибка загрузки топа игроков:', error);
        }
    }

    async updateUserStats() {
        try {
            const user = this.isTestMode ? this.tg.initDataUnsafe.user : this.tg.initDataUnsafe.user;
            logger.info('Обновление статистики пользователя', { userId: user.id });

            const response = await this.fetchJSONP(`${this.backendUrl}?action=getStats&userId=${user.id}`);
            logger.info('Ответ от сервера (getStats):', response);

            if (response.success) {
                document.getElementById('userRank').textContent = 
                    response.rank > 0 ? `#${response.rank}` : 'Не в топе';
                document.getElementById('totalPlayers').textContent = response.totalPlayers || 0;
                
                logger.info('Статистика обновлена', { 
                    rank: response.rank, 
                    totalPlayers: response.totalPlayers 
                });
            }
        } catch (error) {
            logger.error('Ошибка обновления статистики:', error);
        }
    }

    updateUI() {
        if (this.userData) {
            document.getElementById('clickCount').textContent = this.userData.clicks || 0;
            document.getElementById('userClicks').textContent = this.userData.clicks || 0;
        }

        const user = this.isTestMode ? this.tg.initDataUnsafe.user : this.tg.initDataUnsafe.user;
        if (user) {
            document.getElementById('userName').textContent = user.username || user.first_name;
            document.getElementById('userBadge').textContent = `👋 Привет, ${user.first_name}!`;
        }
        
        logger.info('UI обновлен', { clicks: this.userData?.clicks });
    }

    updateTopList() {
        const topList = document.getElementById('topList');
        
        if (!this.topPlayers.length) {
            topList.innerHTML = '<div class="loading">Пока нет игроков в рейтинге</div>';
            logger.info('Топ игроков пуст');
            return;
        }

        topList.innerHTML = '';
        
        this.topPlayers.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'top-item';
            item.innerHTML = `
                <div class="rank ${index < 3 ? 'rank-' + (index + 1) : ''}">${player.rank}</div>
                <div class="player-info">
                    <div class="player-name">${player.username}</div>
                    <div class="player-clicks">${player.clicks} кликов</div>
                </div>
                <div class="clicks-badge">${player.clicks}</div>
            `;
            topList.appendChild(item);
        });

        logger.info('Список топа обновлен', { players: this.topPlayers.length });
    }

    switchTab(tabName) {
        logger.info('Переключение вкладки', { tab: tabName });
        
        // Скрыть все вкладки
        document.querySelectorAll('.content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Убрать активный класс со всех кнопок
        document.querySelectorAll('.tab').forEach(button => {
            button.classList.remove('active');
        });
        
        // Показать выбранную вкладку
        document.getElementById(tabName).classList.add('active');
        
        // Активировать кнопку
        event.target.classList.add('active');
        
        // Загрузить топ если переключились на вкладку топа
        if (tabName === 'top') {
            this.loadTopPlayers();
        }
    }

    fetchJSONP(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            logger.info('JSONP запрос', { url, callbackName });

            window[callbackName] = (data) => {
                logger.info('JSONP ответ получен', { callbackName, data });
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };

            script.src = url + '&callback=' + callbackName;
            
            script.onerror = () => {
                logger.error('JSONP ошибка загрузки скрипта', { url, callbackName });
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                reject(new Error('JSONP request failed'));
            };

            // Таймаут
            setTimeout(() => {
                if (script.parentNode) {
                    logger.error('JSONP таймаут', { url, callbackName });
                    document.body.removeChild(script);
                    reject(new Error('JSONP timeout'));
                }
            }, 15000);

            document.body.appendChild(script);
        });
    }

    showError(message) {
        logger.error('Показать ошибку', { message });
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        document.querySelector('.container').prepend(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM загружен, запуск приложения');
    const app = new ClickerApp();
    app.init();
});