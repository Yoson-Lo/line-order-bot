const line = require("@line/bot-sdk");
const express = require("express");

const config = {
  channelAccessToken: "U3hAQMQk1Zjf7yB6+geiyq4RYm2yUvY2+rN2JMg6whvJph5iu7u+xp9sW8xU7oxqdQV1JtnySidPn21mfF7BMtjoCSbRcyM+gq4UkwTEOv9sk2KKnPE2qFRjOsOk4EBJeEA61h84dhXa6gSLx/2B/wdB04t89/1O/w1cDnyilFU=",
  channelSecret: "9f14d1f178687599d970c662ff9494aa",
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

const app = express();
app.use(express.json());

app.post("/webhook", line.middleware(config), async (req, res) => {
  res.sendStatus(200);
  const events = req.body.events;
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      await handleMessage(event);
    }
  }
});

const MENU = {
  招牌魯肉飯: 65,
  蔥爆牛肉麵: 130,
  雞排便當: 110,
  珍珠奶茶: 60,
  炸地瓜球: 40,
  排骨飯: 90,
  炒飯: 75,
  乾麵: 55,
  紅茶拿鐵: 65,
  冬瓜茶: 30,
};

const orders = {};

function findMenuItem(input) {
  for (const key of Object.keys(MENU)) {
    if (key.includes(input) || input.includes(key)) return key;
  }
  return null;
}

async function handleMessage(event) {
  const userMsg = event.message.text.trim();
  const replyToken = event.replyToken;
  const userId = event.source.userId;

  if (userMsg === "菜單" || userMsg === "點餐") {
    await client.replyMessage({ replyToken, messages: [{ type: "text", text: "🍽️ 今日菜單\n\n🍚 招牌魯肉飯 $65\n🍜 蔥爆牛肉麵 $130\n🍱 雞排便當 $110\n🥤 珍珠奶茶 $60\n🍟 炸地瓜球 $40\n🍖 排骨飯 $90\n🍳 炒飯 $75\n🍝 乾麵 $55\n🍵 紅茶拿鐵 $65\n🫖 冬瓜茶 $30\n\n請輸入：餐點名稱 x數量\n例如：魯肉飯 x2" }] });
    return;
  }

  if (userMsg === "查看訂單" || userMsg === "結帳") {
    if (!orders[userId] || Object.keys(orders[userId].items).length === 0) {
      await client.replyMessage({ replyToken, messages: [{ type: "text", text: "你還沒點任何餐點！\n輸入「菜單」開始點餐 😊" }] });
      return;
    }
    let summary = "📋 你的訂單：\n\n";
    let total = 0;
    for (const [item, qty] of Object.entries(orders[userId].items)) {
      const price = MENU[item];
      summary += `${item} x${qty} = $${price * qty}\n`;
      total += price * qty;
    }
    summary += `\n💰 合計：$${total}\n\n輸入「確認送出」完成訂單`;
    await client.replyMessage({ replyToken, messages: [{ type: "text", text: summary }] });
    return;
  }

  if (userMsg === "確認送出") {
    if (!orders[userId]) {
      await client.replyMessage({ replyToken, messages: [{ type: "text", text: "你還沒點任何餐點！" }] });
      return;
    }
    const orderNum = Math.floor(Math.random() * 900) + 100;
    delete orders[userId];
    await client.replyMessage({ replyToken, messages: [{ type: "text", text: `✅ 訂單 #${orderNum} 已送出！\n\n預計 15 分鐘後完成 🍽️\n感謝您的光顧！` }] });
    return;
  }

  if (userMsg === "取消" || userMsg === "取消訂單") {
    delete orders[userId];
    await client.replyMessage({ replyToken, messages: [{ type: "text", text: "訂單已取消 🗑️\n輸入「菜單」重新點餐" }] });
    return;
  }

  const orderMatch = userMsg.match(/^(.+?)\s*[xX×]\s*(\d+)$/);
  if (orderMatch) {
    const itemName = orderMatch[1].trim();
    const qty = parseInt(orderMatch[2]);
    const matched = findMenuItem(itemName);
    if (matched) {
      if (!orders[userId]) orders[userId] = { items: {} };
      orders[userId].items[matched] = (orders[userId].items[matched] || 0) + qty;
      await client.replyMessage({ replyToken, messages: [{ type: "text", text: `✅ 已加入 ${matched} x${qty}\n\n輸入「查看訂單」確認\n輸入「確認送出」完成\n輸入「菜單」繼續點餐` }] });
    } else {
      await client.replyMessage({ replyToken, messages: [{ type: "text", text: `找不到「${itemName}」\n請輸入「菜單」查看餐點 😊` }] });
    }
    return;
  }

  await client.replyMessage({ replyToken, messages: [{ type: "text", text: "你好！歡迎光臨 🍽️\n\n📋 輸入【菜單】查看餐點\n🛒 輸入【餐點 x數量】點餐\n📝 輸入【查看訂單】確認\n✅ 輸入【確認送出】送出\n❌ 輸入【取消訂單】取消" }] });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`伺服器啟動 v2，port: ${PORT}`));
