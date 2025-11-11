// КОНФИГУРАЦИЯ - ВАШ URL APPS SCRIPT
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxtLY4Hww5cB5WPedekWriCYmkiIRonIYU1ojM6HyDyokUiFgsG1RM0agOSM4wW6B1r/exec';

// Основное приложение
class ClickerApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.userData = { clicks: 0 };
        this.topPlayers = [];
        this.currentUser = null;
        
        console.log('Приложение инициализировано');
    }

    init() {
        console.log('Запуск инициализации приложения');
        
        if (!window.Telegram?.WebApp) {
            console.warn('Режим тестирования: не в Telegram');
            this.initTestMode();
            return;
        }

        this.initTelegramApp();
    }

    initTelegramApp() {
        try {
            console.log('Инициализация Telegram Web App');
            
            this.tg.expand();
            this.tg.ready();
            
            this.currentUser = this.getUserData();
            
            if (this.currentUser) {
                console.log('Пользователь найден:', this.currentUser);
            } else {
                console.warn('Данные пользователя не доступны, используем анонимный режим');
                this.currentUser = this.createAnonymousUser();
            }
            
        } catch (error) {
            console.error('Ошибка инициализации Telegram Web App:', error);
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
                expand: () => console.log('Expand called'),
                ready: () => console.log('Ready called'),
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

            console.log('Загрузка данных пользователя', this.currentUser.id);
            
            const response = await this.makeRequest('getUser', { userId: this.currentUser.id });
            console.log('Ответ от сервера:', response);

            if (response.success) {
                this.userData = response.user || { clicks: 0 };
                this.updateUI();
                await this.loadTopPlayers();
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('app').style.display = 'block';
            } else {
                this.showError('Ошибка загрузки данных');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showError('Ошибка соединения с сервером');
        }
    }

    async addClick() {
        try {
            if (!this.currentUser) return;

            const username = this.currentUser.username || this.currentUser.first_name || 'Anonymous';
            const response = await this.makeRequest('click', { 
                userId: this.currentUser.id, 
                username: username 
            });

            if (response.success) {
                this.userData.clicks = response.clicks;
                this.updateUI();
                await this.loadTopPlayers();
                
                // Виброотклик
                if (this.tg.HapticFeedback && this.tg.HapticFeedback.impactOccurred) {
                    this.tg.HapticFeedback.impactOccurred('light');
                }
            } else {
                this.showError('Ошибка при клике');
            }
        } catch (error) {
            console.error('Ошибка добавления клика:', error);
            this.showError('Ошибка соединения с сервером');
        }
    }

    async loadTopPlayers() {
        try {
            const response = await this.makeRequest('getTop');

            if (response.success) {
                this.topPlayers = response.players || [];
                this.updateTopList();
                await this.updateUserStats();
            }
        } catch (error) {
            console.error('Ошибка загрузки топа:', error);
        }
    }

    async updateUserStats() {
        try {
            if (!this.currentUser) return;

            const response = await this.makeRequest('getStats', { userId: this.currentUser.id });

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
            console.error('Ошибка обновления статистики:', error);
        }
    }

    // Универсальный метод для запросов
    async makeRequest(action, params = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'callback_' + Math.random().toString(36).substr(2, 9);
            const url = new URL(BACKEND_URL);
            
            // Добавляем параметры
            url.searchParams.append('action', action);
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            url.searchParams.append('callback', callbackName);

            console.log('Отправка запроса:', action, params);

            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                reject(new Error('Timeout'));
            }, 10000);

            window[callbackName] = (data) => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                console.log('Получен ответ:', data);
                resolve(data);
            };

            const script = document.createElement('script');
            script.src = url.toString();
            
            script.onerror = (error) => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                console.error('Ошибка загрузки скрипта:', error);
                reject(new Error('Script load failed'));
            };

            document.body.appendChild(script);
        });
    }

    updateUI() {
        try {
            // Обновляем счетчик кликов
            const clickCountElement = document.getElementById('clickCount');
            const userClicksElement = document.getElementById('userClicks');
            
            if (clickCountElement) {
                clickCountElement.textContent = this.userData.clicks || 0;
            }
            if (userClicksElement) {
                userClicksElement.textContent = this.userData.clicks || 0;
            }

            // Обновляем информацию о пользователе
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
            console.error('Ошибка обновления UI:', error);
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
            console.error('Ошибка обновления списка топа:', error);
        }
    }

    switchTab(tabName, event) {
        try {
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
            console.error('Ошибка переключения вкладки:', error);
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
            console.error('Ошибка показа ошибки:', error);
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запуск приложения');
    const app = new ClickerApp();
    app.init();
});