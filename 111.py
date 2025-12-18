import json
import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes

# Настройка логов
logging.basicConfig(level=logging.INFO)

# Путь к файлу сохранения
DATA_FILE = "gta_skills.json"

# Навыки и макс. уровни
SKILLS = {
    "Сила": (5, "💪"),
    "Стрельба": (10, "🔫"),
    "Кулинария": (5, "👨‍🍳"),
    "Рыболовство": (6, "🎣"),
    "Охота": (5, "🦌"),
    "Поиск сокровищ": (5, "🗺️"),
    "Фермерство": (5, "🚜"),
    "Строить": (5, "🏗️"),
    "Шахтер": (5, "⛏️"),
    "Грузчик": (5, "📦"),
    "Таксист": (5, "🚕"),
    "Дайвер": (5, "🤿"),
    "Инкасатор": (5, "💰"),
    "Водитель автобуса": (5, "🚌"),
    "Механик": (5, "🔧"),
    "Пожарный": (5, "👨‍🚒"),
    "Дальнобойщик": (5, "🚛"),
    "Курьер": (5, "📬"),
    "Почтальон": (5, "📮"),
    "Подрядчик": (5, "📋"),
}

# Загрузка данных
def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for user in data.values():
                    for skill in SKILLS:
                        user.setdefault(skill, 0)
                return data
        except Exception as e:
            logging.error(f"Ошибка загрузки: {e}")
    return {}

# Сохранение
def save_data(data):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"Ошибка сохранения: {e}")

user_skills = load_data()

def get_user_data(user_id: str):
    if user_id not in user_skills:
        user_skills[user_id] = {skill: 0 for skill in SKILLS}
    return user_skills[user_id]

def make_main_menu():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("👁️ Посмотреть все навыки", callback_data="view_all")],
        [InlineKeyboardButton("🛠️ Изменить навык", callback_data="edit_skill")],
    ])

def chunk_list(lst, n):
    """Разбивает список на подсписки по n элементов."""
    return [lst[i:i + n] for i in range(0, len(lst), n)]

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Выбери действие:", reply_markup=make_main_menu())

async def view_all(update: Update, query):
    user_id = str(update.effective_user.id)
    data = get_user_data(user_id)

    lines = []
    skills_list = list(data.items())
    for i in range(0, len(skills_list), 2):
        pair = skills_list[i:i+2]
        line_parts = []
        for skill, level in pair:
            max_lvl, emoji = SKILLS[skill]
            line_parts.append(f"{emoji} <b>{skill}</b>: {level} / {max_lvl}")
        lines.append("  |  ".join(line_parts))

    msg = "📊 <b>Твои навыки</b>:\n\n" + "\n".join(lines)
    await query.edit_message_text(msg, reply_markup=make_main_menu(), parse_mode="HTML")
async def edit_skill_pick(update: Update, query):
    buttons = [
        InlineKeyboardButton(skill, callback_data=f"pick_{skill}")
        for skill in SKILLS
    ]
    # Безопасная разбивка на строки по 2 кнопки
    keyboard = chunk_list(buttons, 2)
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text("Выбери навык для изменения:", reply_markup=reply_markup)

async def pick_level(update: Update, query, skill: str):
    max_lvl, emoji = SKILLS[skill]
    buttons = [
        InlineKeyboardButton(str(lvl), callback_data=f"set_{skill}_{lvl}")
        for lvl in range(0, max_lvl + 1)
    ]
    keyboard = chunk_list(buttons, 5)
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        f"Выбери уровень для:\n{emoji} <b>{skill}</b> (макс. {max_lvl})",
        reply_markup=reply_markup,
        parse_mode="HTML"
    )

async def set_level(update: Update, query, skill: str, level: int):
    user_id = str(update.effective_user.id)
    get_user_data(user_id)[skill] = level
    save_data(user_skills)
    await query.edit_message_text(
        f"✅ Установлено:\n<b>{skill}</b> → уровень <b>{level}</b>",
        reply_markup=make_main_menu(),
        parse_mode="HTML"
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "view_all":
        await view_all(update, query)
    elif data == "edit_skill":
        await edit_skill_pick(update, query)
    elif data.startswith("pick_"):
        skill = data[5:]
        await pick_level(update, query, skill)
    elif data.startswith("set_"):
        parts = data.split("_", 2)  # разделяем только по первым двум подчёркиваниям
        if len(parts) == 3:
            _, skill, lvl_str = parts
            try:
                level = int(lvl_str)
                await set_level(update, query, skill, level)
            except ValueError:
                await query.edit_message_text("❌ Ошибка: неверный уровень.", reply_markup=make_main_menu())
        else:
            await query.edit_message_text("❌ Ошибка в данных.", reply_markup=make_main_menu())
    else:
        await query.edit_message_text("Неизвестное действие.", reply_markup=make_main_menu())

def main():
    TOKEN = "8248255554:AAHMsxOZjqKfMB1VjNHfqMX88PNQDQFg1eo"  # ← Замени!
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_handler))

    print("✅ Бот запущен. Нажмите Ctrl+C чтобы остановить.")
    app.run_polling()

if __name__ == "__main__":
    main()
