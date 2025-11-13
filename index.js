import express from "express";
import fetch from "node-fetch";
import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

// Запрос от WebApp для создания инвойса
app.post("/create-invoice", async (req, res) => {
  const { userId, packageStars, priceXtr } = req.body;
  try {
    const payload = `buy_${packageStars}`;
    await bot.telegram.sendInvoice(
      userId,
      `${packageStars} ⭐ Пакет`,
      `Покупка ${packageStars} звёзд`,
      payload,
      "", // provider_token пуст для Stars
      "start",
      "XTR",
      [{ label: `${packageStars}⭐`, amount: priceXtr }]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Обработка успешной оплаты
bot.on("message", async (ctx) => {
  if (ctx.message.successful_payment) {
    const pay = ctx.message.successful_payment;
    const payload = pay.invoice_payload;
    const stars = parseInt(payload.replace("buy_", ""), 10) || 0;
    const userId = ctx.from.id;

    try {
      await fetch(`${API_URL}?action=addStars&id=${userId}&count=${stars}`);
      await ctx.reply(`✅ Оплата получена! +${stars}⭐ начислено.`);
    } catch (err) {
      console.error("Ошибка начисления:", err);
      await ctx.reply("⚠️ Оплата прошла, но не удалось начислить звёзды.");
    }
  }
});

bot.launch();
app.listen(PORT, () => console.log("Server running on port", PORT));
