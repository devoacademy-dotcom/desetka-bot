const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = '8989739941:AAERbGHiWYKiBrnzU4s64sRbUmsX5Cz1gu8';
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emNxbXlrcnZ2anZ0Z2t4dXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYwNDUwOCwiZXhwIjoyMDk1MTgwNTA4fQ.nGKWDkUGdeA1kjqhAyqdFMVfg29IvNMK6wukiTxUlaU';
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';

const bot = new Telegraf(BOT_TOKEN);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MN = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

const PERMA_QUESTIONS = [
  { key: 'P', title: '🌟 P — Позитивные эмоции', text: 'Оцени, насколько часто ты живёшь в состоянии умиротворения, благодарности, вдохновения, удовольствия и любви.\n\n1 — редко испытываю эти эмоции, часто стресс и напряжение\n5 — живу на пике интереса и любви к жизни' },
  { key: 'E', title: '🔥 E — Вовлечённость', text: 'Оцени, как часто в течение дня ты испытываешь состояние потока — когда не чувствуешь времени и полностью поглощён делом.\n\n1 — крайне редко, все занятия скучные и рутинные\n5 — испытываю это состояние каждый день по несколько часов' },
  { key: 'R', title: '🤝 R — Взаимоотношения', text: 'Оцени, насколько ты удовлетворён своими отношениями с людьми и социальными связями.\n\n1 — связей нет, их мало или они разрушены\n5 — есть глубокие, значимые связи: люди, на которых можно положиться' },
  { key: 'M', title: '💡 M — Смысл', text: 'Оцени, насколько сейчас ты реализуешь свои смыслы и понимаешь, зачем делаешь то, что делаешь.\n\n1 — жизнь не имеет смысла, чувствую себя потерянным\n5 — тружусь над важным, жизнь наполнена смыслом' },
  { key: 'A', title: '🏆 A — Достижения', text: 'Оцени, насколько ты удовлетворён своими достижениями и горд собой.\n\n1 — не могу оценить своих достижений, всё кажется обычным делом\n5 — горжусь тем, чего достиг, и знаю вес каждой победы' }
];

const testSessions = {};

function getResultText(total) {
  if (total <= 12) return { zone: '🟡 Запрос на стабилизацию', desc: 'Ты сейчас в зоне, где важно прежде всего восстановить внутренний ресурс. Поведение может быть реактивным, эмоции — захлёстывать. Задача — научиться действовать не реактивно, а опираясь на факты.', strategy: 'Стратегия: Зритель 👁' };
  if (total <= 18) return { zone: '🟠 Запрос на смелость', desc: 'Ты чувствуешь себя как рыба в мутной воде — хочется двигаться, но не виден следующий шаг. Задача — сделать небольшие шаги, чтобы выйти из "мутной воды".', strategy: 'Стратегия: Практик 💪' };
  return { zone: '🟢 Запрос на рост личности', desc: 'Ты чувствуешь, что способен на большее, и готов к новому прецеденту. Задача — расширить горизонт и поставить яркую цель.', strategy: 'Стратегия: Исследователь 🔍' };
}

function scoreKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('1','score_1'),Markup.button.callback('2','score_2'),Markup.button.callback('3','score_3'),Markup.button.callback('4','score_4'),Markup.button.callback('5','score_5')]]);
}

async function sendQuestion(ctx, tgId) {
  const session = testSessions[tgId];
  const q = PERMA_QUESTIONS[session.step];
  await ctx.reply(`📋 *Вопрос ${session.step + 1} из 5*\n\n*${q.title}*\n\n${q.text}`, { parse_mode: 'Markdown', ...scoreKeyboard() });
}

bot.command('тест_perma', async (ctx) => {
  if (ctx.chat.type !== 'private') {
    const info = await bot.telegram.getMe();
    return ctx.reply('Тест проходится в личных сообщениях. Нажми кнопку:', { ...Markup.inlineKeyboard([[Markup.button.url('Пройти тест PERMA', `https://t.me/${info.username}?start=perma`)]]) });
  }
  const tgId = ctx.from.id;
  testSessions[tgId] = { type: 'perma', step: 0, scores: {} };
  await ctx.reply(`🧠 *Диагностика по модели PERMA*\n\nСейчас я задам тебе 5 вопросов. На каждый ответь по шкале от 1 до 5.\n\nОтвечай честно — это только для тебя и твоего коуча.\n\nГотов? Поехали! 🚀`, { parse_mode: 'Markdown' });
  await sendQuestion(ctx, tgId);
});

bot.action(/^score_(\d)$/, async (ctx) => {
  const tgId = ctx.from.id;
  const score = parseInt(ctx.match[1]);
  const session = testSessions[tgId];
  if (!session || session.type !== 'perma') return ctx.answerCbQuery('Начни тест командой /тест_perma');
  await ctx.answerCbQuery(`Оценка ${score} принята ✓`);
  const q = PERMA_QUESTIONS[session.step];
  session.scores[q.key] = score;
  session.step++;
  if (session.step < PERMA_QUESTIONS.length) {
    await sendQuestion(ctx, tgId);
  } else {
    const total = Object.values(session.scores).reduce((a, b) => a + b, 0);
    const result = getResultText(total);
    const s = session.scores;
    await ctx.reply(`✅ *Тест PERMA завершён!*\n\n*Твои баллы:*\n🌟 P (Позитив): ${s.P}/5\n🔥 E (Вовлечённость): ${s.E}/5\n🤝 R (Отношения): ${s.R}/5\n💡 M (Смысл): ${s.M}/5\n🏆 A (Достижения): ${s.A}/5\n\n*Итого: ${total}/25*\n\n*${result.zone}*\n\n${result.desc}\n\n${result.strategy}\n\n_Результаты переданы твоему коучу._`, { parse_mode: 'Markdown' });
    await savePermaResults(tgId, s, total);
    delete testSessions[tgId];
  }
});

async function savePermaResults(tgId, scores, total) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    await sb.from('test_results').upsert({ telegram_id: tgId, test_type: 'perma', year, month, result_json: JSON.stringify({ ...scores, total }), created_at: now.toISOString() }, { onConflict: 'telegram_id,test_type,year,month' });
    const { data: member } = await sb.from('members').select('id').eq('telegram_user_id', tgId).maybeSingle();
    if (member) {
      await sb.from('monthly_entries').upsert({ member_id: member.id, year, month, perma_p: scores.P, perma_e: scores.E, perma_r: scores.R, perma_m: scores.M, perma_a: scores.A }, { onConflict: 'member_id,year,month' });
    }
  } catch (e) { console.error('Error saving PERMA:', e); }
}

bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const startParam = ctx.startPayload;
  if (startParam === 'perma') {
    testSessions[tgId] = { type: 'perma', step: 0, scores: {} };
    await ctx.reply(`👋 Привет, ${ctx.from.first_name}!\n\nТвой коуч приглашает тебя пройти диагностику PERMA.\n\n5 вопросов, 2 минуты. Отвечай честно! 🚀`, { parse_mode: 'Markdown' });
    return sendQuestion(ctx, tgId);
  }
  const { data: existing } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (existing?.is_blocked) return ctx.reply('❌ Ваш доступ заблокирован.');
  if (!existing) await sb.from('coaches').insert({ telegram_id: tgId, name, username: ctx.from.username });
  await ctx.reply(`👋 Привет, ${ctx.from.first_name}!\n\nДобро пожаловать в платформу *Десятка*.`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)],[Markup.button.callback('📋 Мои десятки', 'my_groups')]]) });
});

bot.action('my_groups', async (ctx) => {
  const tgId = ctx.from.id;
  const { data: coach } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (!coach) return ctx.reply('Сначала запусти /start');
  if (coach.is_blocked) return ctx.reply('❌ Заблокирован.');
  const { data: groups } = await sb.from('groups').select('id,name,start_date').eq('coach_id', coach.id);
  if (!groups || !groups.length) return ctx.editMessageText('Десяток нет. Создай в дашборде!', { ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)]]) });
  const buttons = groups.map(g => [Markup.button.webApp(`📊 ${g.name}`, `${MINI_APP_URL}?group=${g.id}&tg_id=${tgId}`)]);
  buttons.push([Markup.button.webApp('🚀 Все десятки', `${MINI_APP_URL}?tg_id=${tgId}`)]);
  await ctx.editMessageText(`📋 *Твои десятки (${groups.length}):*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.hears(/^#рефлексия\s*([\s\S]*)/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return;
  const text = ctx.match[1].trim();
  if (!text) return ctx.reply(`${ctx.from.first_name}, напиши текст:\n#рефлексия Этот месяц я...`);
  const authorName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const { data: groupChat } = await sb.from('group_chats').select('group_id').eq('chat_id', ctx.chat.id).maybeSingle();
  if (!groupChat) return;
  await sb.from('group_reflections').insert({ group_id: groupChat.group_id, chat_id: ctx.chat.id, author_name: authorName, author_username: ctx.from.username, telegram_user_id: ctx.from.id, text });
  const now = new Date();
  await ctx.reply(`✅ ${authorName}, рефлексия за ${now.getDate()} ${MN[now.getMonth()]} сохранена!`, { reply_to_message_id: ctx.message.message_id });
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
  ctx.reply(`✅ Чат привязан к *"${group.name}"*!\n\nУчастники могут:\n• #рефлексия Текст...\n• /тест_perma`, { parse_mode: 'Markdown' });
});

bot.command('ссылка_теста', async (ctx) => {
  const info = await bot.telegram.getMe();
  ctx.reply(`🔗 *Ссылка на тест PERMA:*\n\nhttps://t.me/${info.username}?start=perma\n\nОтправь участникам десятки.`, { parse_mode: 'Markdown' });
});

bot.command('myid', (ctx) => ctx.reply(`Твой ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' }));
bot.command('help', (ctx) => ctx.reply(`📖 *Команды:*\n\n*/start* — дашборд\n*/тест_perma* — тест PERMA\n*/ссылка_теста* — ссылка для участников\n*/myid* — твой ID\n\n*В чате десятки:*\n*/link_group ID* — привязать чат\n*#рефлексия* текст — рефлексия`, { parse_mode: 'Markdown' }));

bot.launch();
console.log('🤖 Бот запущен с тестом PERMA');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
