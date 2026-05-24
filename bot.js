const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = '8989739941:AAERbGHiWYKiBrnzU4s64sRbUmsX5Cz1gu8';
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emNxbXlrcnZ2anZ0Z2t4dXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYwNDUwOCwiZXhwIjoyMDk1MTgwNTA4fQ.nGKWDkUGdeA1kjqhAyqdFMVfg29IvNMK6wukiTxUlaU';
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';
const BOT_USERNAME = 'desetka_coaching_bot';

const bot = new Telegraf(BOT_TOKEN);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const MN = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
const testSessions = {};

const PERMA_Q = [
  { key: 'P', title: '🌟 P — Позитивные эмоции', text: 'Оцени, насколько часто ты живёшь в состоянии умиротворения, благодарности, вдохновения и любви.\n\n1 — редко, часто стресс\n5 — живу на пике интереса и любви к жизни' },
  { key: 'E', title: '🔥 E — Вовлечённость', text: 'Оцени, как часто ты испытываешь состояние потока — когда не чувствуешь времени.\n\n1 — крайне редко, всё скучно\n5 — каждый день по несколько часов' },
  { key: 'R', title: '🤝 R — Взаимоотношения', text: 'Оцени, насколько ты удовлетворён своими отношениями с людьми.\n\n1 — связей нет или они разрушены\n5 — есть глубокие значимые связи' },
  { key: 'M', title: '💡 M — Смысл', text: 'Оцени, насколько ты реализуешь свои смыслы.\n\n1 — жизнь не имеет смысла\n5 — тружусь над важным, жизнь наполнена смыслом' },
  { key: 'A', title: '🏆 A — Достижения', text: 'Оцени, насколько ты горд своими достижениями.\n\n1 — не могу оценить своих достижений\n5 — горжусь и знаю вес каждой победы' }
];

function getResult(total) {
  if (total <= 12) return { zone: '🟡 Запрос на стабилизацию', desc: 'Важно восстановить внутренний ресурс. Задача — действовать опираясь на факты, а не на эмоции.', strategy: 'Стратегия: Зритель 👁' };
  if (total <= 18) return { zone: '🟠 Запрос на смелость', desc: 'Хочется двигаться, но не виден следующий шаг. Задача — сделать небольшие шаги вперёд.', strategy: 'Стратегия: Практик 💪' };
  return { zone: '🟢 Запрос на рост личности', desc: 'Готов к новому прецеденту. Задача — расширить горизонт и поставить яркую цель.', strategy: 'Стратегия: Исследователь 🔍' };
}

function keyboard() {
  return Markup.inlineKeyboard([[
    Markup.button.callback('1', 'sc_1'),
    Markup.button.callback('2', 'sc_2'),
    Markup.button.callback('3', 'sc_3'),
    Markup.button.callback('4', 'sc_4'),
    Markup.button.callback('5', 'sc_5')
  ]]);
}

async function askQ(ctx, tgId) {
  const s = testSessions[tgId];
  const q = PERMA_Q[s.step];
  await ctx.reply('📋 *Вопрос ' + (s.step + 1) + ' из 5*\n\n*' + q.title + '*\n\n' + q.text, { parse_mode: 'Markdown', ...keyboard() });
}

bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  if (ctx.startPayload === 'perma') {
    testSessions[tgId] = { step: 0, scores: {} };
    await ctx.reply('👋 Привет, ' + ctx.from.first_name + '!\n\nКоуч приглашает пройти диагностику PERMA.\n5 вопросов, 2 минуты. Поехали! 🚀');
    return askQ(ctx, tgId);
  }
  const { data: existing } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (existing && existing.is_blocked) return ctx.reply('❌ Доступ заблокирован.');
  if (!existing) await sb.from('coaches').insert({ telegram_id: tgId, name: name, username: ctx.from.username });
  await ctx.reply('👋 Привет, ' + ctx.from.first_name + '!\n\nДобро пожаловать в платформу Десятка.', {
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Открыть дашборд', MINI_APP_URL + '?tg_id=' + tgId)],
      [Markup.button.callback('📋 Мои десятки', 'my_groups')]
    ])
  });
});

bot.command('permatest', async (ctx) => {
  const tgId = ctx.from.id;
  if (ctx.chat.type !== 'private') {
    return ctx.reply('Тест проходится в личных сообщениях. Нажми кнопку:', {
      ...Markup.inlineKeyboard([[Markup.button.url('Пройти тест PERMA', 'https://t.me/' + BOT_USERNAME + '?start=perma')]])
    });
  }
  testSessions[tgId] = { step: 0, scores: {} };
  await ctx.reply('🧠 *Диагностика PERMA*\n\n5 вопросов по шкале 1–5.\nОтвечай честно!\n\nПоехали! 🚀', { parse_mode: 'Markdown' });
  await askQ(ctx, tgId);
});

bot.action(/^sc_(\d)$/, async (ctx) => {
  const tgId = ctx.from.id;
  const score = parseInt(ctx.match[1]);
  const s = testSessions[tgId];
  if (!s) return ctx.answerCbQuery('Начни тест: /permatest');
  await ctx.answerCbQuery('Оценка ' + score + ' принята ✓');
  s.scores[PERMA_Q[s.step].key] = score;
  s.step++;
  if (s.step < PERMA_Q.length) {
    return askQ(ctx, tgId);
  }
  const total = Object.values(s.scores).reduce(function(a, b) { return a + b; }, 0);
  const r = getResult(total);
  const sc = s.scores;
  await ctx.reply(
    '✅ *Тест PERMA завершён!*\n\n' +
    '*Баллы:*\n' +
    '🌟 P: ' + sc.P + '/5\n' +
    '🔥 E: ' + sc.E + '/5\n' +
    '🤝 R: ' + sc.R + '/5\n' +
    '💡 M: ' + sc.M + '/5\n' +
    '🏆 A: ' + sc.A + '/5\n\n' +
    '*Итого: ' + total + '/25*\n\n' +
    '*' + r.zone + '*\n\n' +
    r.desc + '\n\n' +
    r.strategy + '\n\n' +
    '_Результаты переданы коучу._',
    { parse_mode: 'Markdown' }
  );
  try {
    const now = new Date();
    await sb.from('test_results').upsert({
      telegram_id: tgId,
      test_type: 'perma',
      year: now.getFullYear(),
      month: now.getMonth(),
      result_json: JSON.stringify({ P: sc.P, E: sc.E, R: sc.R, M: sc.M, A: sc.A, total: total }),
      created_at: now.toISOString()
    }, { onConflict: 'telegram_id,test_type,year,month' });
    const { data: member } = await sb.from('members').select('id').eq('telegram_user_id', tgId).maybeSingle();
    if (member) {
      await sb.from('monthly_entries').upsert({
        member_id: member.id,
        year: now.getFullYear(),
        month: now.getMonth(),
        perma_p: sc.P, perma_e: sc.E, perma_r: sc.R, perma_m: sc.M, perma_a: sc.A
      }, { onConflict: 'member_id,year,month' });
    }
  } catch(e) {
    console.error('Save error:', e);
  }
  delete testSessions[tgId];
});

bot.action('my_groups', async (ctx) => {
  const tgId = ctx.from.id;
  const { data: coach } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (!coach) return ctx.reply('Сначала /start');
  if (coach.is_blocked) return ctx.reply('❌ Заблокирован.');
  const { data: groups } = await sb.from('groups').select('id,name').eq('coach_id', coach.id);
  if (!groups || !groups.length) {
    return ctx.editMessageText('Десяток нет. Создай в дашборде!', {
      ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Дашборд', MINI_APP_URL + '?tg_id=' + tgId)]])
    });
  }
  const buttons = groups.map(function(g) {
    return [Markup.button.webApp('📊 ' + g.name, MINI_APP_URL + '?group=' + g.id + '&tg_id=' + tgId)];
  });
  buttons.push([Markup.button.webApp('🚀 Все десятки', MINI_APP_URL + '?tg_id=' + tgId)]);
  await ctx.editMessageText('📋 Десятки (' + groups.length + '):', {
    ...Markup.inlineKeyboard(buttons)
  });
});

bot.hears(/^#рефлексия\s*([\s\S]*)/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return;
  const text = ctx.match[1].trim();
  if (!text) return ctx.reply(ctx.from.first_name + ', напиши текст:\n#рефлексия Этот месяц я...');
  const { data: gc } = await sb.from('group_chats').select('group_id').eq('chat_id', ctx.chat.id).maybeSingle();
  if (!gc) return;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  await sb.from('group_reflections').insert({
    group_id: gc.group_id,
    chat_id: ctx.chat.id,
    author_name: name,
    author_username: ctx.from.username,
    telegram_user_id: ctx.from.id,
    text: text
  });
  const now = new Date();
  await ctx.reply('✅ ' + name + ', рефлексия за ' + now.getDate() + ' ' + MN[now.getMonth()] + ' сохранена!', {
    reply_to_message_id: ctx.message.message_id
  });
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
  ctx.reply('✅ Чат привязан к "' + group.name + '"!\n\nУчастники могут:\n• #рефлексия Текст...\n• /permatest — пройти тест PERMA');
});

bot.command('permalink', async (ctx) => {
  ctx.reply('🔗 Ссылка на тест PERMA:\n\nhttps://t.me/' + BOT_USERNAME + '?start=perma\n\nОтправь участникам десятки.');
});

bot.command('myid', function(ctx) {
  ctx.reply('Твой ID: ' + ctx.from.id);
});

bot.command('help', function(ctx) {
  ctx.reply('📖 Команды:\n\n/start — дашборд\n/permatest — тест PERMA\n/permalink — ссылка для участников\n/myid — твой ID\n\nВ чате десятки:\n/link_group ID — привязать чат\n#рефлексия текст — рефлексия');
});

bot.launch();
console.log('Бот запущен');
process.once('SIGINT', function() { bot.stop('SIGINT'); });
process.once('SIGTERM', function() { bot.stop('SIGTERM'); });
