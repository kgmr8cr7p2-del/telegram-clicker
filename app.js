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
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
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

const logger = new Logger();

// API клиент для работы с Google Apps Script
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    // JSONP запрос для обхода CORS
    jsonpRequest(params) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const url = new URL(this.baseUrl);
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            url.searchParams.append('callback', callbackName);

            logger.info('JSONP запрос', { 
                action: params.action, 
                callbackName 
            });

            const timeoutId = setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                }
                reject(new Error('JSONP timeout'));
            }, 10000);

            window[callbackName] = (data) => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                logger.info('JSONP ответ получен', data);
                resolve(data);
            };

            const script = document.createElement('script');
            script.src = url.toString();
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                if (window[callbackName]) {
                    delete window[callbackName];
                }
                reject(new Error('JSONP request failed'));
            };

            document.body.appendChild(script);
        });
    }

    async getUser(userId) {
        return this.jsonpRequest({ action: 'getUser', userId });
    }

    async addClick(userId, username) {
        return this.jsonpRequest({ action: 'click', userId, username });
    }

    async getTopPlayers() {
        return this.jsonpRequest({ action: 'getTop' });
    }

    async getUserStats(userId) {
        return this.jsonpRequest({ action: 'getStats', userId });
    }
}

// Основное приложение
class ClickerApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.userData = null;
        this.topPlayers = [];
        this.isTestMode = false;
        this.apiClient = new ApiClient(BACKEND_URL);
        this.currentUser = null;
        
        logger.info('Приложение инициализировано');
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
            
            this.tg.expand();
            this.tg.ready();
            
            this.currentUser = this.getUserData();
            
            if (this.currentUser) {
                logger.info('Пользователь найден:', this.currentUser);
            } else {
                logger.warn('Данные пользователя не доступны, используем анонимный режим');
                this.currentUser = this.createAnonymousUser();
            }
            
        } catch (error) {
            logger.error('Ошибка инициализации Telegram Web App:', error);
        }
        
        this.setupEventListeners();
        this.loadUserData();
    }

    getUserData() {
        if (this.tg.initDataUnsafe?.user) {
            return this.tg.initDataUnsafe.user;
        }
        return null;
    }

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
                version: '6.0+'
            }
        };

        this.tg = window.Telegram.WebApp;
        document.getElementById('testMode').style.display = 'block';
        
        this.setupEventListeners();
        this.loadUserData();
    }

    setupEventListeners() {
        document.getElementById('clickButton').addEventListener('click', () => this.handleClick());
        document.getElementById('statsTab').addEventListener('click', (e) => this.switchTab('stats', e));
        document.getElementById('topTab').addEventListener('click', (e) => this.switchTab('top', e));
        
        const clearLogsBtn = document.getElementById('clearLogs');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => logger.clear());
        }
    }

    async handleClick() {
        const clickButton = document.getElementById('clickButton');
        clickButton.classList.add('pulse');
        setTimeout(() => clickButton.classList.remove('pulse'), 500);

        await this.addClick();
    }

    async loadUserData() {
        try {
            if (!this.currentUser) {
                this.showError('Не удалось определить пользователя');
                return;
            }

            logger.info('Загрузка данных пользователя', { 
                userId: this.currentUser.id
            });
            
            const response = await this.apiClient.getUser(this.currentUser.id);
            logger.info('Ответ от сервера:', response);

            if (response.success) {
                this.userData = response.user || { clicks: 0 };
                this.updateUI();
                await this.loadTopPlayers();
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('app').style.display = 'block';
            } else {
                this.showError('Ошибка загрузки данных: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            logger.error('Ошибка загрузки данных:', error);
            this.showError('Ошибка соединения с сервером');
        }
    }

    async addClick() {
        try {
            if (!this.currentUser) return;

            const username = this.currentUser.username || this.currentUser.first_name || 'Anonymous';
            const response = await this.apiClient.addClick(this.currentUser.id, username);

            if (response.success) {
                if (!this.userData) {
                    this.userData = { clicks: 0 };
                }
                this.userData.clicks = response.clicks;
                this.updateUI();
                await this.loadTopPlayers();
                
                // Виброотклик
                if (!this.isTestMode && this.tg.HapticFeedback && this.tg.HapticFeedback.impactOccurred) {
                    this.tg.HapticFeedback.impactOccurred('light');
                }
            } else {
                this.showError('Ошибка при клике: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            logger.error('Ошибка добавления клика:', error);
            this.showError('Ошибка соединения с сервером');
        }
    }

    async loadTopPlayers() {
        try {
            const response = await this.apiClient.getTopPlayers();

            if (response.success) {
                this.topPlayers = response.players || [];
                this.updateTopList();
                await this.updateUserStats();
            } else {
                logger.error('Ошибка загрузки топа:', response.error);
            }
        } catch (error) {
            logger.error('Ошибка загрузки топа:', error);
        }
    }

    async updateUserStats() {
        try {
            if (!this.currentUser) return;

            const response = await this.apiClient.getUserStats(this.currentUser.id);

            if (response.success) {
                const rankElement = document.getElementById('userRank');
                const totalPlayersElement = document.getElementById('totalPlayers');
                
                if (rankElement) {
                    rankElement.textContent = response.rank > 0 ? `#${response.rank}` : 'Не в топе';
                }
                if (totalPlayersElement) {
                    totalPlayersElement.textContent = response.totalPlayers || 0;
                }
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
        } catch (error) {
            logger.error('Ошибка обновления UI:', error);
        }
    }

    updateTopList() {
        try {
            const topList = document.getElementById('topList');
            if (!topList) return;
            
            if (!this.topPlayers.length) {
                topList.innerHTML = '<div class="loading">Пока нет игроков в рейтинге</div>';
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
        } catch (error) {
            logger.error('Ошибка обновления списка топа:', error);
        }
    }

    switchTab(tabName, event) {
        try {
            document.querySelectorAll('.content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            document.querySelectorAll('.tab').forEach(button => {
                button.classList.remove('active');
            });
            
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            if (tabName === 'top') {
                this.loadTopPlayers();
            }
        } catch (error) {
            logger.error('Ошибка переключения вкладки:', error);
        }
    }

    showError(message) {
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

    showApp() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM загружен, запуск приложения');
    const app = new ClickerApp();
    app.init();
});