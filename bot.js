const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN || '8989739941:AAEnZBplX1aFUT2kOoCOzvafSXqcAruoSIo';
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emNxbXlrcnZ2anZ0Z2t4dXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYwNDUwOCwiZXhwIjoyMDk1MTgwNTA4fQ.nGKWDkUGdeA1kjqhAyqdFMVfg29IvNMK6wukiTxUlaU';
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';
const BOT_USERNAME = 'desetka_coaching_bot';

const bot = new Telegraf(BOT_TOKEN);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const MN = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
const sessions = {};

const PERMA_Q = [
  { key: 'P', title: 'P — Позитивные эмоции', text: 'Насколько часто ты живёшь в состоянии умиротворения, благодарности, вдохновения и любви?\n\n1 — редко, часто стресс\n5 — живу на пике интереса и любви к жизни' },
  { key: 'E', title: 'E — Вовлечённость', text: 'Как часто ты испытываешь состояние потока — когда не чувствуешь времени?\n\n1 — крайне редко, всё скучно\n5 — каждый день по несколько часов' },
  { key: 'R', title: 'R — Взаимоотношения', text: 'Насколько ты удовлетворён своими отношениями с людьми?\n\n1 — связей нет или они разрушены\n5 — есть глубокие значимые связи' },
  { key: 'M', title: 'M — Смысл', text: 'Насколько ты реализуешь свои смыслы?\n\n1 — жизнь не имеет смысла\n5 — тружусь над важным, жизнь наполнена смыслом' },
  { key: 'A', title: 'A — Достижения', text: 'Насколько ты горд своими достижениями?\n\n1 — не могу оценить своих достижений\n5 — горжусь и знаю вес каждой победы' }
];

const ONBOARD_STEPS = [
  { key: 'name',           q: 'Напиши своё Имя и Фамилию\n\nНапример: Алексей Попов' },
  { key: 'niche',          q: 'Напиши свою нишу / сферу деятельности\n\nНапример: E-commerce, консалтинг, IT' },
  { key: 'year_goal',      q: 'Напиши главную цель на год\n\nНапример: Выйти на 2 млн/мес чистой прибыли' },
  { key: 'q3_goal',        q: 'Напиши цель на ближайшие 3 месяца' },
  { key: 'point_a_date',   q: 'Напиши дату начала работы в десятке\n\nНапример: 20.05.2026' },
  { key: 'point_a_profit', q: 'Напиши текущую чистую прибыль в месяц (только цифра в рублях)\n\nНапример: 150000' },
  { key: 'debt_biz',       q: 'Напиши бизнес-долги (только цифра в рублях)\n\nЕсли нет — напиши 0' },
  { key: 'debt_personal',  q: 'Напиши личные долги — ипотека, кредиты (только цифра в рублях)\n\nЕсли нет — напиши 0' }
];

function getResult(total) {
  if (total <= 12) return { zone: 'Запрос на стабилизацию', desc: 'Важно восстановить внутренний ресурс. Задача — действовать опираясь на факты.', strategy: 'Стратегия: Зритель' };
  if (total <= 18) return { zone: 'Запрос на смелость', desc: 'Хочется двигаться, но не виден следующий шаг. Задача — небольшие шаги вперёд.', strategy: 'Стратегия: Практик' };
  return { zone: 'Запрос на рост личности', desc: 'Готов к новому прецеденту. Задача — расширить горизонт и поставить яркую цель.', strategy: 'Стратегия: Исследователь' };
}

function keyboard5() {
  return Markup.inlineKeyboard([[
    Markup.button.callback('1', 'sc_1'),
    Markup.button.callback('2', 'sc_2'),
    Markup.button.callback('3', 'sc_3'),
    Markup.button.callback('4', 'sc_4'),
    Markup.button.callback('5', 'sc_5')
  ]]);
}

// ── START ─────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const payload = ctx.startPayload;

  if (payload && payload.startsWith('onboard_')) {
    const groupId = parseInt(payload.replace('onboard_', ''));
    sessions[tgId] = { type: 'onboard', step: 0, data: {}, group_id: groupId, perma_step: 0, perma_scores: {} };
    await ctx.reply('Привет, ' + ctx.from.first_name + '! Твой коуч приглашает заполнить карточку участника.\n\nЭто займёт 3-5 минут. Поехали!');
    return ctx.reply(ONBOARD_STEPS[0].q);
  }

  if (payload === 'perma') {
    sessions[tgId] = { type: 'perma', step: 0, scores: {} };
    await ctx.reply('Привет, ' + ctx.from.first_name + '! Коуч приглашает пройти диагностику PERMA.\n5 вопросов, 2 минуты. Поехали!');
    return ctx.reply('Вопрос 1 из 5\n\n' + PERMA_Q[0].title + '\n\n' + PERMA_Q[0].text, keyboard5());
  }

  const { data: existing } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (existing && existing.is_blocked) return ctx.reply('Доступ заблокирован.');
  if (!existing) await sb.from('coaches').insert({ telegram_id: tgId, name: name, username: ctx.from.username });
  return ctx.reply(
    'Привет, ' + ctx.from.first_name + '! Добро пожаловать в платформу Десятка.',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Открыть дашборд', MINI_APP_URL + '?tg_id=' + tgId)],
      [Markup.button.callback('Мои десятки', 'my_groups')]
    ])
  );
});

// ── COMMANDS ──────────────────────────────────────────────────────
bot.command('myid', (ctx) => ctx.reply('Твой ID: ' + ctx.from.id));

bot.command('help', (ctx) => ctx.reply(
  'Команды:\n' +
  '/start — дашборд\n' +
  '/myid — твой ID\n' +
  '/permatest — тест PERMA\n' +
  '/permalink — ссылка на тест\n\n' +
  'В чате десятки:\n' +
  '/link_group ID — привязать чат\n' +
  '/invite — анкета участника\n' +
  '#рефлексия текст — рефлексия'
));

bot.command('permatest', async (ctx) => {
  const tgId = ctx.from.id;
  if (ctx.chat.type !== 'private') {
    return ctx.reply('Тест проходится в личных сообщениях:',
      Markup.inlineKeyboard([[Markup.button.url('Пройти тест PERMA', 'https://t.me/' + BOT_USERNAME + '?start=perma')]])
    );
  }
  sessions[tgId] = { type: 'perma', step: 0, scores: {} };
  await ctx.reply('Диагностика PERMA. 5 вопросов по шкале 1-5. Поехали!');
  return ctx.reply('Вопрос 1 из 5\n\n' + PERMA_Q[0].title + '\n\n' + PERMA_Q[0].text, keyboard5());
});

bot.command('permalink', (ctx) => {
  ctx.reply('Ссылка на тест PERMA:\nhttps://t.me/' + BOT_USERNAME + '?start=perma\n\nОтправь участникам десятки.');
});

bot.command('link_group', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Пиши эту команду в чате десятки');
  const parts = ctx.message.text.split(' ');
  const groupId = parseInt(parts[1]);
  if (!groupId) return ctx.reply('Укажи ID: /link_group 123');
  const { data: coach } = await sb.from('coaches').select('id').eq('telegram_id', ctx.from.id).maybeSingle();
  if (!coach) return ctx.reply('Ты не коуч. Напиши /start боту в личку.');
  const { data: group } = await sb.from('groups').select('id,name').eq('id', groupId).eq('coach_id', coach.id).maybeSingle();
  if (!group) return ctx.reply('Десятка не найдена');
  await sb.from('group_chats').upsert({ group_id: groupId, chat_id: ctx.chat.id, chat_title: ctx.chat.title }, { onConflict: 'chat_id' });
  ctx.reply('Чат привязан к "' + group.name + '"!\n\n/invite — пригласить участников\n#рефлексия текст — рефлексия');
});

bot.command('invite', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Пиши эту команду в чате десятки');
  const { data: gc } = await sb.from('group_chats').select('group_id').eq('chat_id', ctx.chat.id).maybeSingle();
  if (!gc) return ctx.reply('Сначала привяжи чат: /link_group ID');
  const link = 'https://t.me/' + BOT_USERNAME + '?start=onboard_' + gc.group_id;
  ctx.reply(
    'Заполни карточку участника — займёт 3-5 минут.\nДанные видит только твой коуч.',
    Markup.inlineKeyboard([[Markup.button.url('Заполнить карточку', link)]])
  );
});

// ── ACTIONS ───────────────────────────────────────────────────────
bot.action('my_groups', async (ctx) => {
  const tgId = ctx.from.id;
  const { data: coach } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (!coach) return ctx.answerCbQuery('Сначала /start');
  if (coach.is_blocked) return ctx.answerCbQuery('Доступ заблокирован');
  const { data: groups } = await sb.from('groups').select('id,name').eq('coach_id', coach.id);
  await ctx.answerCbQuery();
  if (!groups || !groups.length) {
    return ctx.editMessageText('Десяток нет. Создай в дашборде!',
      Markup.inlineKeyboard([[Markup.button.webApp('Дашборд', MINI_APP_URL + '?tg_id=' + tgId)]])
    );
  }
  const buttons = groups.map(g => [Markup.button.webApp(g.name, MINI_APP_URL + '?group=' + g.id + '&tg_id=' + tgId)]);
  buttons.push([Markup.button.webApp('Все десятки', MINI_APP_URL + '?tg_id=' + tgId)]);
  return ctx.editMessageText('Твои десятки (' + groups.length + '):', Markup.inlineKeyboard(buttons));
});

bot.action(/^sc_(\d)$/, async (ctx) => {
  const tgId = ctx.from.id;
  const score = parseInt(ctx.match[1]);
  const s = sessions[tgId];
  if (!s) return ctx.answerCbQuery('Начни заново');
  await ctx.answerCbQuery('Принято: ' + score);

  if (s.type === 'onboard') {
    s.perma_scores[PERMA_Q[s.perma_step].key] = score;
    s.perma_step++;
    if (s.perma_step < PERMA_Q.length) {
      return ctx.reply('Вопрос ' + (s.perma_step + 1) + ' из 5\n\n' + PERMA_Q[s.perma_step].title + '\n\n' + PERMA_Q[s.perma_step].text, keyboard5());
    }
    const total = Object.values(s.perma_scores).reduce((a,b) => a+b, 0);
    const result = getResult(total);
    const d = s.data;
    const ps = s.perma_scores;
    try {
      const initials = (d.name||'').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const { data: member } = await sb.from('members').upsert({
        group_id: s.group_id, name: d.name, initials: initials,
        niche: d.niche, year_goal: d.year_goal, q3_goal: d.q3_goal,
        point_a_date: d.point_a_date, point_a_profit: d.point_a_profit || 0,
        point_a_debt_biz: d.debt_biz || 0, point_a_debt_personal: d.debt_personal || 0,
        telegram_username: ctx.from.username, telegram_user_id: tgId
      }, { onConflict: 'telegram_user_id' }).select('id').single();
      if (member) {
        const now = new Date();
        await sb.from('monthly_entries').upsert({
          member_id: member.id, year: now.getFullYear(), month: now.getMonth(),
          perma_p: ps.P, perma_e: ps.E, perma_r: ps.R, perma_m: ps.M, perma_a: ps.A
        }, { onConflict: 'member_id,year,month' });
        await sb.from('standards').upsert({
          member_id: member.id, health: 50, environment: 50, learning: 50, sport: 50, sleep: 50
        }, { onConflict: 'member_id' });
      }
    } catch(e) { console.error('Save error:', e); }
    delete sessions[tgId];
    return ctx.reply(
      'Карточка заполнена!\n\n' +
      'Баллы PERMA:\nP: ' + ps.P + '/5\nE: ' + ps.E + '/5\nR: ' + ps.R + '/5\nM: ' + ps.M + '/5\nA: ' + ps.A + '/5\n\n' +
      'Итого: ' + total + '/25 — ' + result.zone + '\n\n' +
      'Коуч уже видит твою карточку. Спасибо!'
    );
  }

  if (s.type === 'perma') {
    s.scores[PERMA_Q[s.step].key] = score;
    s.step++;
    if (s.step < PERMA_Q.length) {
      return ctx.reply('Вопрос ' + (s.step + 1) + ' из 5\n\n' + PERMA_Q[s.step].title + '\n\n' + PERMA_Q[s.step].text, keyboard5());
    }
    const total = Object.values(s.scores).reduce((a,b) => a+b, 0);
    const r = getResult(total);
    const sc = s.scores;
    delete sessions[tgId];
    try {
      const now = new Date();
      await sb.from('test_results').upsert({
        telegram_id: tgId, test_type: 'perma',
        year: now.getFullYear(), month: now.getMonth(),
        result_json: JSON.stringify({P:sc.P,E:sc.E,R:sc.R,M:sc.M,A:sc.A,total:total}),
        created_at: now.toISOString()
      }, { onConflict: 'telegram_id,test_type,year,month' });
      const { data: member } = await sb.from('members').select('id').eq('telegram_user_id', tgId).maybeSingle();
      if (member) {
        await sb.from('monthly_entries').upsert({
          member_id: member.id, year: now.getFullYear(), month: now.getMonth(),
          perma_p: sc.P, perma_e: sc.E, perma_r: sc.R, perma_m: sc.M, perma_a: sc.A
        }, { onConflict: 'member_id,year,month' });
      }
    } catch(e) { console.error('Save error:', e); }
    return ctx.reply(
      'Тест PERMA завершён!\n\n' +
      'Баллы:\nP: ' + sc.P + '/5\nE: ' + sc.E + '/5\nR: ' + sc.R + '/5\nM: ' + sc.M + '/5\nA: ' + sc.A + '/5\n\n' +
      'Итого: ' + total + '/25 — ' + r.zone + '\n\n' + r.desc + '\n' + r.strategy + '\n\nРезультаты переданы коучу.'
    );
  }
});

// ── REFLEKSIYA ────────────────────────────────────────────────────
bot.hears(/^#рефлексия\s*([\s\S]*)/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return;
  const text = ctx.match[1].trim();
  if (!text) return ctx.reply(ctx.from.first_name + ', напиши текст:\n#рефлексия Этот месяц я...');
  const { data: gc } = await sb.from('group_chats').select('group_id').eq('chat_id', ctx.chat.id).maybeSingle();
  if (!gc) return;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  await sb.from('group_reflections').insert({
    group_id: gc.group_id, chat_id: ctx.chat.id,
    author_name: name, author_username: ctx.from.username,
    telegram_user_id: ctx.from.id, text: text
  });
  const now = new Date();
  return ctx.reply(name + ', рефлексия за ' + now.getDate() + ' ' + MN[now.getMonth()] + ' сохранена!', {
    reply_to_message_id: ctx.message.message_id
  });
});

// ── ONBOARD TEXT HANDLER ──────────────────────────────────────────
bot.on('text', async (ctx) => {
  const tgId = ctx.from.id;
  const s = sessions[tgId];
  const text = ctx.message.text;
  if (!s || s.type !== 'onboard' || s.step >= ONBOARD_STEPS.length) return;
  const step = ONBOARD_STEPS[s.step];
  if (['point_a_profit', 'debt_biz', 'debt_personal'].includes(step.key)) {
    const num = parseInt(text.replace(/\s/g, '').replace(/,/g, ''));
    if (isNaN(num)) return ctx.reply('Напиши только цифру. Например: 150000');
    s.data[step.key] = num;
  } else {
    s.data[step.key] = text;
  }
  s.step++;
  if (s.step < ONBOARD_STEPS.length) {
    return ctx.reply(ONBOARD_STEPS[s.step].q);
  } else {
    s.perma_step = 0;
    s.perma_scores = {};
    await ctx.reply('Отлично! Теперь пройдём тест PERMA.\n5 вопросов по шкале 1-5. Отвечай честно!');
    return ctx.reply('Вопрос 1 из 5\n\n' + PERMA_Q[0].title + '\n\n' + PERMA_Q[0].text, keyboard5());
  }
});

bot.launch();
console.log('Бот запущен v2');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
