const express = require("express");
const crypto = require("crypto");
const { messagingApi } = require("@line/bot-sdk");

const CHANNEL_ACCESS_TOKEN = "U3hAQMQk1Zjf7yB6+geiyq4RYm2yUvY2+rN2JMg6whvJph5iu7u+xp9sW8xU7oxqdQV1JtnySidPn21mfF7BMtjoCSbRcyM+gq4UkwTEOv9sk2KKnPE2qFRjOsOk4EBJeEA61h84dhXa6gSLx/2B/wdB04t89/1O/w1cDnyilFU=";
const CHANNEL_SECRET = "9f14d1f178687599d970c662ff9494aa";

const client = new messagingApi.MessagingApiClient({ channelAccessToken: CHANNEL_ACCESS_TOKEN });
const app = express();

app.get("/", (req, res) => res.send("OK"));

app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-line-signature"];
  const hmac = crypto.createHmac("SHA256", CHANNEL_SECRET);
  hmac.update(req.body);
  const digest = hmac.digest("base64");
  if (signature !== digest) return res.sendStatus(401);

  res.sendStatus(200);

  const body = JSON.parse(req.body.toString());
  for (const event of body.events || []) {
    if (event.type === "message" && event.message.type === "text") {
      handleMessage(event).catch(console.error);
    }
  }
});

const MENU = {
  招牌魯肉飯:65, 蔥爆牛肉麵:130, 雞排便當:110,
  珍珠奶茶:60, 炸地瓜球:40, 排骨飯:90,
  炒飯:75, 乾麵:55, 紅茶拿鐵:65, 冬瓜茶:30,
};
const orders = {};

function findMenuItem(input) {
  for (const key of Object.keys(MENU)) {
    if (key.includes(input) || input.includes(key)) return key;
  }
  return null;
}

async function handleMessage(event) {
  const msg = event.message.text.trim();
  const token = event.replyToken;
  const uid = event.source.userId;
  const reply = (text) => client.replyMessage({ replyToken: token, messages: [{ type: "text", text }] });

  if (msg === "菜單" || msg === "點餐") {
    return reply("🍽️ 今日菜單\n\n🍚 招牌魯肉飯 $65\n🍜 蔥爆牛肉麵 $130\n🍱 雞排便當 $110\n🥤 珍珠奶茶 $60\n🍟 炸地瓜球 $40\n🍖 排骨飯 $90\n🍳 炒飯 $75\n🍝 乾麵 $55\n🍵 紅茶拿鐵 $65\n🫖 冬瓜茶 $30\n\n輸入：餐點名稱 x數量\n例：魯肉飯 x2");
  }
  if (msg === "查看訂單" || msg === "結帳") {
    if (!orders[uid] || !Object.keys(orders[uid]).length) return reply("還沒點餐！輸入「菜單」開始 😊");
    let text = "📋 你的訂單：\n\n", total = 0;
    for (const [k, v] of Object.entries(orders[uid])) { text += `${k} x${v} = $${MENU[k]*v}\n`; total += MENU[k]*v; }
    return reply(text + `\n💰 合計：$${total}\n\n輸入「確認送出」完成`);
  }
  if (msg === "確認送出") {
    if (!orders[uid] || !Object.keys(orders[uid]).length) return reply("還沒點餐！");
    delete orders[uid];
    return reply(`✅ 訂單 #${Math.floor(Math.random()*900)+100} 已送出！\n預計 15 分鐘完成 🍽️\n感謝光顧！`);
  }
  if (msg === "取消" || msg === "取消訂單") {
    delete orders[uid];
    return reply("已取消 🗑️ 輸入「菜單」重新點餐");
  }
  const m = msg.match(/^(.+?)\s*[xX×]\s*(\d+)$/);
  if (m) {
    const matched = findMenuItem(m[1].trim());
    if (matched) {
      if (!orders[uid]) orders[uid] = {};
      orders[uid][matched] = (orders[uid][matched] || 0) + parseInt(m[2]);
      return reply(`✅ 已加入 ${matched} x${m[2]}\n\n輸入「查看訂單」確認\n輸入「確認送出」完成\n輸入「菜單」繼續`);
    }
    return reply(`找不到「${m[1].trim()}」\n輸入「菜單」查看餐點 😊`);
  }
  reply("歡迎光臨 🍽️\n\n📋【菜單】查看餐點\n🛒【餐點 x數量】點餐\n📝【查看訂單】確認\n✅【確認送出】送出\n❌【取消訂單】取消");
}

app.listen(process.env.PORT || 3000, () => console.log("v4 啟動"));
