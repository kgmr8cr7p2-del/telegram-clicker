import sqlite3
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict

app = FastAPI()

# --- НАСТРОЙКА CORS ---
# Это нужно, чтобы игра (сайт) могла общаться с сервером
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # В продакшене тут лучше указать конкретный домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- БАЗА ДАННЫХ ---
def init_db():
    conn = sqlite3.connect('mining_game.db')
    c = conn.cursor()
    # Создаем таблицу, если её нет
    # Храним инвентарь и балансы как JSON-строки для простоты
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            usd REAL,
            balances TEXT,
            inventory TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- МОДЕЛИ ДАННЫХ (Pydantic) ---
# Описываем, как выглядят данные, которые присылает игра
class GPUItem(BaseModel):
    id: int
    name: str
    price: float
    power: int

class GameState(BaseModel):
    user_id: int
    usd: float
    balances: Dict[str, float] # Например: {"BTC": 0.5, "ETH": 2.0}
    inventory: List[GPUItem]

# --- API МЕТОДЫ ---

@app.post("/save")
async def save_progress(state: GameState):
    """Сохраняет прогресс пользователя"""
    conn = sqlite3.connect('mining_game.db')
    c = conn.cursor()
    
    # Преобразуем сложные объекты (списки/словари) в строки JSON для записи в БД
    balances_json = json.dumps(state.balances)
    inventory_json = json.dumps([item.dict() for item in state.inventory])
    
    # Вставляем или обновляем (Upsert)
    c.execute('''
        INSERT INTO users (user_id, usd, balances, inventory) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            usd=excluded.usd,
            balances=excluded.balances,
            inventory=excluded.inventory
    ''', (state.user_id, state.usd, balances_json, inventory_json))
    
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/load/{user_id}")
async def load_progress(user_id: int):
    """Загружает прогресс пользователя"""
    conn = sqlite3.connect('mining_game.db')
    conn.row_factory = sqlite3.Row # Чтобы обращаться к полям по имени
    c = conn.cursor()
    
    c.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "usd": row["usd"],
            "balances": json.loads(row["balances"]),
            "inventory": json.loads(row["inventory"])
        }
    else:
        # Если пользователя нет, возвращаем null, фронтенд поймет, что это новый игрок
        return None

if __name__ == "__main__":
    import uvicorn
    # Запускаем сервер на порту 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
