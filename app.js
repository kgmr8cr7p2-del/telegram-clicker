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
        this.currentUser = null;
        
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
            
            // Расширяем на весь экран
            this.tg.expand();
            this.tg.ready();
            
            // Получаем данные пользователя разными способами
            this.currentUser = this.getUserData();
            
            if (this.currentUser) {
                logger.info('Пользователь найден:', this.currentUser);
            } else {
                logger.warn('Данные пользователя не доступны, используем анонимный режим');
                this.currentUser = this.createAnonymousUser();
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

    // Получение данных пользователя разными способами
    getUserData() {
        logger.info('Поиск данных пользователя...');
        
        // Способ 1: initDataUnsafe.user
        if (this.tg.initDataUnsafe?.user) {
            logger.info('Пользователь найден в initDataUnsafe.user');
            return this.tg.initDataUnsafe.user;
        }
        
        // Способ 2: initData (закодированная строка)
        if (this.tg.initData) {
            logger.info('Пытаемся распарсить initData');
            try {
                const params = new URLSearchParams(this.tg.initData);
                const userParam = params.get('user');
                if (userParam) {
                    const user = JSON.parse(decodeURIComponent(userParam));
                    logger.info('Пользователь найден в initData:', user);
                    return user;
                }
            } catch (error) {
                logger.warn('Ошибка парсинга initData:', error);
            }
        }
        
        // Способ 3: WebAppInitData
        if (window.Telegram?.WebAppInitData) {
            logger.info('Пытаемся использовать WebAppInitData');
            try {
                const params = new URLSearchParams(window.Telegram.WebAppInitData);
                const userParam = params.get('user');
                if (userParam) {
                    const user = JSON.parse(decodeURIComponent(userParam));
                    logger.info('Пользователь найден в WebAppInitData:', user);
                    return user;
                }
            } catch (error) {
                logger.warn('Ошибка парсинга WebAppInitData:', error);
            }
        }

        // Способ 4: Прямой доступ к window объекту
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            logger.info('Пользователь найден в window.Telegram.WebApp.initDataUnsafe.user');
            return window.Telegram.WebApp.initDataUnsafe.user;
        }

        logger.warn('Данные пользователя не найдены ни в одном источнике');
        return null;
    }

    // Создание анонимного пользователя
    createAnonymousUser() {
        const anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9);
        return {
            id: anonymousId,
            first_name: 'Анонимный',
            username: 'anonymous',
            is_anonymous: true
        };
    }

    initTestMode() {
        logger.info('Инициализация тестового режима');
        
        const testUser = {
            id: Math.floor(Math.random() * 1000000),
            first_name: 'TestUser',
            username: 'test_user',
            is_test: true
        };

        this.currentUser = testUser;
        
        window.Telegram = {
            WebApp: {
                initDataUnsafe: { user: testUser },
                expand: () => logger.info('Expand called'),
                ready: () => logger.info('Ready called'),
                version: '6.0+',
                initData: ''
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
        document.getElementById('statsTab').addEventListener('click', (e) => this.switchTab('stats', e));
        document.getElementById('topTab').addEventListener('click', (e) => this.switchTab('top', e));
        
        const clearLogsBtn = document.getElementById('clearLogs');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => logger.clear());
        }
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
            if (!this.currentUser) {
                logger.error('Пользователь не определен');
                this.showError('Не удалось определить пользователя');
                return;
            }

            logger.info('Загрузка данных пользователя', { 
                userId: this.currentUser.id,
                username: this.currentUser.first_name 
            });
            
            const response = await this.fetchJSONP(`${this.backendUrl}?action=getUser&userId=${this.currentUser.id}`);
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
            if (!this.currentUser) {
                logger.error('Пользователь не определен для клика');
                return;
            }

            logger.info('Добавление клика для пользователя', { 
                userId: this.currentUser.id,
                username: this.currentUser.first_name 
            });

            const username = this.currentUser.username || this.currentUser.first_name || 'Anonymous';
            const response = await this.fetchJSONP(
                `${this.backendUrl}?action=click&userId=${this.currentUser.id}&username=${encodeURIComponent(username)}`
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
            if (!this.currentUser) {
                logger.warn('Не могу обновить статистику: пользователь не определен');
                return;
            }

            logger.info('Обновление статистики пользователя', { userId: this.currentUser.id });

            const response = await this.fetchJSONP(`${this.backendUrl}?action=getStats&userId=${this.currentUser.id}`);
            logger.info('Ответ от сервера (getStats):', response);

            if (response.success) {
                const rankElement = document.getElementById('userRank');
                const totalPlayersElement = document.getElementById('totalPlayers');
                
                if (rankElement) {
                    rankElement.textContent = response.rank > 0 ? `#${response.rank}` : 'Не в топе';
                }
                if (totalPlayersElement) {
                    totalPlayersElement.textContent = response.totalPlayers || 0;
                }
                
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
        try {
            if (this.userData) {
                const clickCountElement = document.getElementById('clickCount');
                const userClicksElement = document.getElementById('userClicks');
                
                if (clickCountElement) {
                    clickCountElement.textContent = this.userData.clicks || 0;
                }
                if (userClicksElement) {
                    userClicksElement.textContent = this.userData.clicks || 0;
                }
            }

            if (this.currentUser) {
                const userNameElement = document.getElementById('userName');
                const userBadgeElement = document.getElementById('userBadge');
                
                if (userNameElement) {
                    userNameElement.textContent = this.currentUser.username || this.currentUser.first_name || 'Аноним';
                }
                if (userBadgeElement) {
                    const greeting = this.currentUser.is_anonymous ? 
                        '👋 Анонимный режим' : 
                        `👋 Привет, ${this.currentUser.first_name || 'Игрок'}!`;
                    userBadgeElement.textContent = greeting;
                }
            }
            
            logger.info('UI обновлен', { 
                clicks: this.userData?.clicks,
                user: this.currentUser?.first_name 
            });
        } catch (error) {
            logger.error('Ошибка обновления UI:', error);
        }
    }

    updateTopList() {
        try {
            const topList = document.getElementById('topList');
            if (!topList) {
                logger.error('Элемент topList не найден');
                return;
            }
            
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
        } catch (error) {
            logger.error('Ошибка обновления списка топа:', error);
        }
    }

    switchTab(tabName, event) {
        try {
            logger.info('Переключение вкладки', { tab: tabName });
            
            if (event) {
                event.preventDefault();
            }
            
            // Скрыть все вкладки
            document.querySelectorAll('.content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Убрать активный класс со всех кнопок
            document.querySelectorAll('.tab').forEach(button => {
                button.classList.remove('active');
            });
            
            // Показать выбранную вкладку
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // Активировать кнопку
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            // Загрузить топ если переключились на вкладку топа
            if (tabName === 'top') {
                this.loadTopPlayers();
            }
        } catch (error) {
            logger.error('Ошибка переключения вкладки:', error);
        }
    }

    fetchJSONP(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            logger.info('JSONP запрос', { url: url.split('?')[0], callbackName });

            window[callbackName] = (data) => {
                logger.info('JSONP ответ получен', { callbackName, data });
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                resolve(data);
            };

            script.src = url + '&callback=' + callbackName;
            
            script.onerror = () => {
                logger.error('JSONP ошибка загрузки скрипта', { url: url.split('?')[0], callbackName });
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                reject(new Error('JSONP request failed'));
            };

            // Таймаут
            const timeoutId = setTimeout(() => {
                if (script.parentNode) {
                    logger.error('JSONP таймаут', { url: url.split('?')[0], callbackName });
                    document.body.removeChild(script);
                    reject(new Error('JSONP timeout'));
                }
            }, 15000);

            script.onload = () => {
                clearTimeout(timeoutId);
            };

            document.body.appendChild(script);
        });
    }

    showError(message) {
        logger.error('Показать ошибку', { message });
        
        try {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            
            const container = document.querySelector('.container');
            if (container) {
                container.prepend(errorDiv);
            }

            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
        } catch (error) {
            logger.error('Ошибка показа ошибки:', error);
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM загружен, запуск приложения');
    const app = new ClickerApp();
    app.init();
});

// Глобальная функция для отладки
window.debugApp = function() {
    return {
        logger: logger,
        tg: window.Telegram?.WebApp,
        user: window.Telegram?.WebApp?.initDataUnsafe?.user
    };
};