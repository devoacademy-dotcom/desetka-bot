const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = '8989739941:AAERbGHiWYKiBrnzU4s64sRbUmsX5Cz1gu8';
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emNxbXlrcnZ2anZ0Z2t4dXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYwNDUwOCwiZXhwIjoyMDk1MTgwNTA4fQ.nGKWDkUGdeA1kjqhAyqdFMVfg29IvNMK6wukiTxUlaU';
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';

const bot = new Telegraf(BOT_TOKEN);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const MN = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
const testSessions = {};

const PERMA_QUESTIONS = [
  { key: 'P', title: '🌟 P — Позитивные эмоции', text: 'Оцени, насколько часто ты живёшь в состоянии умиротворения, благодарности, вдохновения, удовольствия и любви.\n\n1 — редко испытываю эти эмоции, часто стресс\n5 — живу на пике интереса и любви к жизни' },
  { key: 'E', title: '🔥 E — Вовлечённость', text: 'Оцени, как часто ты испытываешь состояние потока — когда не чувствуешь времени и полностью поглощён делом.\n\n1 — крайне редко, всё скучно и рутинно\n5 — каждый день по несколько часов' },
  { key: 'R', title: '🤝 R — Взаимоотношения', text: 'Оцени, насколько ты удовлетворён своими отношениями с людьми.\n\n1 — связей нет или они разрушены\n5 — есть глубокие значимые связи' },
  { key: 'M', title: '💡 M — Смысл', text: 'Оцени, насколько ты реализуешь свои смыслы и понимаешь зачем делаешь то, что делаешь.\n\n1 — жизнь не имеет смысла, чувствую себя потерянным\n5 — тружусь над важным, жизнь наполнена смыслом' },
  { key: 'A', title: '🏆 A — Достижения', text: 'Оцени, насколько ты горд собой и своими достижениями.\n\n1 — не могу оценить своих достижений\n5 — горжусь тем, чего достиг, и знаю вес каждой победы' }
];

function getResultText(total) {
  if (total <= 12) return { zone: '🟡 Запрос на стабилизацию', desc: 'Ты сейчас в зоне, где важно восстановить внутренний ресурс. Поведение может быть реактивным. Задача — научиться действовать опираясь на факты, а не на эмоции.', strategy: 'Стратегия обучения: Зритель 👁' };
  if (total <= 18) return { zone: '🟠 Запрос на смелость', desc: 'Хочется двигаться, но не виден следующий шаг. Ты уже накопил опыт и стал осторожнее. Задача — сделать небольшие шаги вперёд.', strategy: 'Стратегия обучения: Практик 💪' };
  return { zone: '🟢 Запрос на рост личности', desc: 'Ты чувствуешь, что способен на большее, и готов к новому прецеденту. Задача — расширить горизонт и поставить яркую цель.', strategy: 'Стратегия обучения: Исследователь 🔍' };
}

function scoreKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('1','score_1'),Markup.button.callback('2','score_2'),Markup.button.callback('3','score_3'),Markup.button.callback('4','score_4'),Markup.button.callback('5','score_5')]]);
}

async function sendQuestion(ctx, tgId) {
  const session = testSessions[tgId];
  const q = PERMA_QUESTIONS[session.step];
  await ctx.reply(`📋 *Вопрос ${session.step + 1} из 5*\n\n*${q.title}*\n\n${q.text}`, { parse_mode: 'Markdown', ...scoreKeyboard() });
}

bot.command('permalink', async (ctx) => {
  ctx.reply(`🔗 *Ссылка на тест PERMA:*\n\nhttps://t.me/desetka_coaching_bot?start=perma\n\nОтправь участникам десятки.`, { parse_mode: 'Markdown' });
});
  }
  testSessions[ctx.from.id] = { type: 'perma', step: 0, scores: {} };
  await ctx.reply(`🧠 *Диагностика PERMA*\n\n5 вопросов по шкале 1–5.\nОтвечай честно — это для тебя и твоего коуча.\n\nПоехали! 🚀`, { parse_mode: 'Markdown' });
  await sendQuestion(ctx, ctx.from.id);
});

bot.action(/^score_(\d)$/, async (ctx) => {
  const tgId = ctx.from.id;
  const score = parseInt(ctx.match[1]);
  const session = testSessions[tgId];
  if (!session || session.type !== 'perma') return ctx.answerCbQuery('Начни тест: /permatest');
  await ctx.answerCbQuery(`Оценка ${score} принята ✓`);
  session.scores[PERMA_QUESTIONS[session.step].key] = score;
  session.step++;
  if (session.step < PERMA_QUESTIONS.length) {
    await sendQuestion(ctx, tgId);
  } else {
    const total = Object.values(session.scores).reduce((a,b) => a+b, 0);
    const result = getResultText(total);
    const s = session.scores;
    await ctx.reply(`✅ *Тест PERMA завершён!*\n\n*Баллы:*\n🌟 P: ${s.P}/5\n🔥 E: ${s.E}/5\n🤝 R: ${s.R}/5\n💡 M: ${s.M}/5\n🏆 A: ${s.A}/5\n\n*Итого: ${total}/25*\n\n*${result.zone}*\n\n${result.desc}\n\n${result.strategy}\n\n_Результаты переданы коучу._`, { parse_mode: 'Markdown' });
    try {
      const now = new Date();
      await sb.from('test_results').upsert({ telegram_id: tgId, test_type: 'perma', year: now.getFullYear(), month: now.getMonth(), result_json: JSON.stringify({...s, total}), created_at: now.toISOString() }, { onConflict: 'telegram_id,test_type,year,month' });
      const { data: member } = await sb.from('members').select('id').eq('telegram_user_id', tgId).maybeSingle();
      if (member) await sb.from('monthly_entries').upsert({ member_id: member.id, year: now.getFullYear(), month: now.getMonth(), perma_p: s.P, perma_e: s.E, perma_r: s.R, perma_m: s.M, perma_a: s.A }, { onConflict: 'member_id,year,month' });
    } catch(e) { console.error('Save error:', e); }
    delete testSessions[tgId];
  }
});

bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  if (ctx.startPayload === 'perma') {
    testSessions[tgId] = { type: 'perma', step: 0, scores: {} };
    await ctx.reply(`👋 Привет, ${ctx.from.first_name}!\n\nКоуч приглашает пройти диагностику PERMA.\n5 вопросов, 2 минуты. Поехали! 🚀`);
    return sendQuestion(ctx, tgId);
  }
  const { data: existing } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (existing?.is_blocked) return ctx.reply('❌ Доступ заблокирован.');
  if (!existing) await sb.from('coaches').insert({ telegram_id: tgId, name, username: ctx.from.username });
  await ctx.reply(`👋 Привет, ${ctx.from.first_name}!\n\nДобро пожаловать в платформу *Десятка*.`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)],[Markup.button.callback('📋 Мои десятки','my_groups')]]) });
});

bot.action('my_groups', async (ctx) => {
  const tgId = ctx.from.id;
  const { data: coach } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (!coach) return ctx.reply('Сначала /start');
  if (coach.is_blocked) return ctx.reply('❌ Заблокирован.');
  const { data: groups } = await sb.from('groups').select('id,name').eq('coach_id', coach.id);
  if (!groups?.length) return ctx.editMessageText('Десяток нет. Создай в дашборде!', { ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)]]) });
  const buttons = groups.map(g => [Markup.button.webApp(`📊 ${g.name}`, `${MINI_APP_URL}?group=${g.id}&tg_id=${tgId}`)]);
  buttons.push([Markup.button.webApp('🚀 Все десятки', `${MINI_APP_URL}?tg_id=${tgId}`)]);
  await ctx.editMessageText(`📋 *Десятки (${groups.length}):*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.hears(/^#рефлексия\s*([\s\S]*)/i, async (ctx) => {
  if (ctx.chat?.type === 'private') return;
  const text = ctx.match[1].trim();
  if (!text) return ctx.reply(`${ctx.from.first_name}, напиши текст:\n#рефлексия Этот месяц я...`);
  const { data: gc } = await sb.from('group_chats').select('group_id').eq('chat_id', ctx.chat.id).maybeSingle();
  if (!gc) return;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  await sb.from('group_reflections').insert({ group_id: gc.group_id, chat_id: ctx.chat.id, author_name: name, author_username: ctx.from.username, telegram_user_id: ctx.from.id, text });
  const now = new Date();
  await ctx.reply(`✅ ${name}, рефлексия за ${now.getDate()} ${MN[now.getMonth()]} сохранена!`, { reply_to_message_id: ctx.message.message_id });
});

bot.command('link_group', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Пиши эту команду в чате десятки');
  const groupId = parseInt(ctx.message.text.split(' ')[1]);
  if (!groupId) return ctx.reply('Укажи ID: /link_group 123');
  const { data: coach } = await sb.from('coaches').select('id').eq('telegram_id', ctx.from.id).maybeSingle();
  if (!coach) return ctx.reply('Ты не коуч. Напиши /start боту.');
  const { data: group } = await sb.from('groups').select('id,name').eq('id', groupId).eq('coach_id', coach.id).maybeSingle();
  if (!group) return ctx.reply('Десятка не найдена');
  await sb.from('group_chats').upsert({ group_id: groupId, chat_id: ctx.chat.id, chat_title: ctx.chat.title }, { onConflict: 'chat_id' });
  ctx.reply(`✅ Чат привязан к *"${group.name}"*!\n\nУчастники могут:\n• #рефлексия Текст...\n• /permatest — пройти тест PERMA`, { parse_mode: 'Markdown' });
});

bot.command('permalink', async (ctx) => {
return ctx.reply('Тест проходится в личных сообщениях. Нажми кнопку:', { ...Markup.inlineKeyboard([[Markup.button.url('Пройти тест PERMA', `https://t.me/desetka_coaching_bot?start=perma`)]]) });

bot.command('myid', (ctx) => ctx.reply(`Твой ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));
bot.command('help', (ctx) => ctx.reply(`📖 *Команды:*\n\n*/start* — дашборд\n*/permatest* — тест PERMA\n*/permalink* — ссылка для участников\n*/myid* — твой ID\n\n*В чате десятки:*\n*/link_group ID* — привязать чат\n*#рефлексия* текст — рефлексия`, { parse_mode: 'Markdown' }));

bot.launch();
console.log('🤖 Бот запущен');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
