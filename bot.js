const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
// v2
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';
const BOT_USERNAME = 'desetka_coaching_bot';

const bot = new Telegraf(BOT_TOKEN);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const MN = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

// Сессии (тест + анкета)
const sessions = {};

// ── PERMA ────────────────────────────────────────────────────────
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

function scoreKeyboard() {
  return Markup.inlineKeyboard([[
    Markup.button.callback('1', 'sc_1'),
    Markup.button.callback('2', 'sc_2'),
    Markup.button.callback('3', 'sc_3'),
    Markup.button.callback('4', 'sc_4'),
    Markup.button.callback('5', 'sc_5')
  ]]);
}

// ── АНКЕТА — шаги ────────────────────────────────────────────────
const ONBOARD_STEPS = [
  { key: 'name',         q: '👤 Напиши своё *Имя и Фамилию*\n\nНапример: Алексей Попов' },
  { key: 'niche',        q: '💼 Напиши свою *нишу / сферу деятельности*\n\nНапример: E-commerce, консалтинг, IT-продукты' },
  { key: 'year_goal',    q: '🎯 Напиши свою *главную цель на год*\n\nНапример: Выйти на 2 млн/мес чистой прибыли' },
  { key: 'q3_goal',      q: '📅 Напиши *цель на ближайшие 3 месяца*\n\nНапример: Запустить новый продукт и выйти на 800 тыс/мес' },
  { key: 'point_a_date', q: '📆 Напиши *дату начала работы в десятке*\n\nНапример: 20.05.2026' },
  { key: 'point_a_profit', q: '💰 Напиши *текущую чистую прибыль в месяц* (цифрой в рублях)\n\nНапример: 150000' },
  { key: 'debt_biz',     q: '🏢 Напиши *бизнес-долги* (цифрой в рублях)\n\nЕсли нет — напиши 0' },
  { key: 'debt_personal', q: '🏠 Напиши *личные долги* (ипотека, кредиты — цифрой в рублях)\n\nЕсли нет — напиши 0' },
];

async function sendOnboardStep(ctx, tgId) {
  const s = sessions[tgId];
  if (s.type === 'onboard') {
    if (s.step < ONBOARD_STEPS.length) {
      const step = ONBOARD_STEPS[s.step];
      await ctx.reply(step.q, { parse_mode: 'Markdown' });
    } else if (s.step === ONBOARD_STEPS.length) {
      // Переходим к PERMA
      await ctx.reply(
        '🧠 *Отлично! Теперь пройдём тест PERMA*\n\n5 вопросов по шкале от 1 до 5.\nОтвечай честно — это поможет коучу лучше тебя понять.\n\nПоехали! 🚀',
        { parse_mode: 'Markdown' }
      );
      s.perma_step = 0;
      s.perma_scores = {};
      await sendPermaQ(ctx, tgId);
    }
  }
}

async function sendPermaQ(ctx, tgId) {
  const s = sessions[tgId];
  const q = PERMA_Q[s.perma_step];
  await ctx.reply(
    '📋 *Вопрос ' + (s.perma_step + 1) + ' из 5*\n\n*' + q.title + '*\n\n' + q.text,
    { parse_mode: 'Markdown', ...scoreKeyboard() }
  );
}

// ── СТАРТ ────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const payload = ctx.startPayload;

  // Участник пришёл по ссылке онбординга
  if (payload && payload.startsWith('onboard_')) {
    const groupId = parseInt(payload.replace('onboard_', ''));
    sessions[tgId] = { type: 'onboard', step: 0, data: {}, group_id: groupId, perma_step: 0, perma_scores: {} };
    await ctx.reply(
      '👋 Привет, ' + ctx.from.first_name + '!\n\n' +
      'Твой коуч приглашает тебя заполнить карточку участника десятки.\n\n' +
      'Я задам несколько вопросов — это займёт 3-5 минут.\n' +
      'Отвечай честно, данные увидит только твой коуч. 🤝\n\n' +
      'Поехали!',
      { parse_mode: 'Markdown' }
    );
    return sendOnboardStep(ctx, tgId);
  }

  // Участник пришёл пройти тест PERMA
  if (payload === 'perma') {
    sessions[tgId] = { type: 'perma', step: 0, scores: {} };
    await ctx.reply('👋 Привет, ' + ctx.from.first_name + '!\n\nКоуч приглашает пройти диагностику PERMA.\n5 вопросов, 2 минуты. Поехали! 🚀');
    return sendPermaStandalone(ctx, tgId);
  }

  // Коуч
  const { data: existing } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();
  if (existing && existing.is_blocked) return ctx.reply('❌ Доступ заблокирован.');
  if (!existing) await sb.from('coaches').insert({ telegram_id: tgId, name: name, username: ctx.from.username });
  await ctx.reply(
    '👋 Привет, ' + ctx.from.first_name + '!\n\nДобро пожаловать в платформу Десятка.',
    {
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Открыть дашборд', MINI_APP_URL + '?tg_id=' + tgId)],
        [Markup.button.callback('📋 Мои десятки', 'my_groups')]
      ])
    }
  );
});

// ── ОБРАБОТКА ТЕКСТОВЫХ ОТВЕТОВ АНКЕТЫ ──────────────────────────
bot.on('text', async (ctx) => {
  const tgId = ctx.from.id;
  const s = sessions[tgId];
  const text = ctx.message.text;

  // Игнорируем команды
  if (text.startsWith('/')) return;
  // Игнорируем хештеги
  if (text.startsWith('#')) return;

  if (!s || s.type !== 'onboard' || s.step >= ONBOARD_STEPS.length) return;

  const step = ONBOARD_STEPS[s.step];

  // Валидация числовых полей
  if (['point_a_profit', 'debt_biz', 'debt_personal'].includes(step.key)) {
    const num = parseInt(text.replace(/\s/g, '').replace(/,/g, ''));
    if (isNaN(num)) {
      return ctx.reply('Пожалуйста, напиши число. Например: 150000');
    }
    s.data[step.key] = num;
  } else {
    s.data[step.key] = text;
  }

  s.step++;
  await sendOnboardStep(ctx, tgId);
});

// ── PERMA В АНКЕТЕ (кнопки) ──────────────────────────────────────
bot.action(/^sc_(\d)$/, async (ctx) => {
  const tgId = ctx.from.id;
  const score = parseInt(ctx.match[1]);
  const s = sessions[tgId];

  if (!s) return ctx.answerCbQuery('Начни анкету по ссылке от коуча');
  await ctx.answerCbQuery('Оценка ' + score + ' принята ✓');

  // Анкета + PERMA
  if (s.type === 'onboard') {
    s.perma_scores[PERMA_Q[s.perma_step].key] = score;
    s.perma_step++;

    if (s.perma_step < PERMA_Q.length) {
      return sendPermaQ(ctx, tgId);
    }

    // PERMA завершён — сохраняем всё
    const total = Object.values(s.perma_scores).reduce(function(a, b) { return a + b; }, 0);
    const result = getResult(total);
    const d = s.data;
    const ps = s.perma_scores;
    const now = new Date();

    try {
      // Создаём участника
      const initials = (d.name || '').split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
      const { data: member } = await sb.from('members').upsert({
        group_id: s.group_id,
        name: d.name,
        initials: initials,
        niche: d.niche,
        year_goal: d.year_goal,
        q3_goal: d.q3_goal,
        point_a_date: d.point_a_date,
        point_a_profit: d.point_a_profit || 0,
        point_a_debt_biz: d.debt_biz || 0,
        point_a_debt_personal: d.debt_personal || 0,
        telegram_username: ctx.from.username,
        telegram_user_id: tgId
      }, { onConflict: 'telegram_user_id' }).select('id').single();

      if (member) {
        // Сохраняем PERMA
        await sb.from('monthly_entries').upsert({
          member_id: member.id,
          year: now.getFullYear(),
          month: now.getMonth(),
          perma_p: ps.P, perma_e: ps.E, perma_r: ps.R, perma_m: ps.M, perma_a: ps.A,
          point_a_debt_biz: d.debt_biz || 0,
          point_a_debt_personal: d.debt_personal || 0
        }, { onConflict: 'member_id,year,month' });

        // Сохраняем стандарты (базовые)
        await sb.from('standards').upsert({
          member_id: member.id,
          health: 50, environment: 50, learning: 50, sport: 50, sleep: 50
        }, { onConflict: 'member_id' });
      }
    } catch(e) {
      console.error('Onboard save error:', e);
    }

    await ctx.reply(
      '✅ *Карточка заполнена!*\n\n' +
      '*Твои данные PERMA:*\n' +
      '🌟 P: ' + ps.P + '/5\n' +
      '🔥 E: ' + ps.E + '/5\n' +
      '🤝 R: ' + ps.R + '/5\n' +
      '💡 M: ' + ps.M + '/5\n' +
      '🏆 A: ' + ps.A + '/5\n\n' +
      '*Итого: ' + total + '/25*\n\n' +
      '*' + result.zone + '*\n' +
      result.desc + '\n\n' +
      '_Твой коуч уже видит твою карточку в дашборде. Спасибо! 🙏_',
      { parse_mode: 'Markdown' }
    );
    delete sessions[tgId];
    return;
  }

  // Отдельный тест PERMA
  if (s.type === 'perma') {
    s.scores[PERMA_Q[s.step].key] = score;
    s.step++;
    if (s.step < PERMA_Q.length) {
      return sendPermaStandaloneQ(ctx, tgId);
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
        telegram_id: tgId, test_type: 'perma',
        year: now.getFullYear(), month: now.getMonth(),
        result_json: JSON.stringify({ P: sc.P, E: sc.E, R: sc.R, M: sc.M, A: sc.A, total: total }),
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
    delete sessions[tgId];
  }
});

async function sendPermaStandalone(ctx, tgId) {
  const s = sessions[tgId];
  const q = PERMA_Q[s.step];
  await ctx.reply('📋 *Вопрос ' + (s.step + 1) + ' из 5*\n\n*' + q.title + '*\n\n' + q.text, { parse_mode: 'Markdown', ...scoreKeyboard() });
}

async function sendPermaStandaloneQ(ctx, tgId) {
  const s = sessions[tgId];
  const q = PERMA_Q[s.step];
  await ctx.reply('📋 *Вопрос ' + (s.step + 1) + ' из 5*\n\n*' + q.title + '*\n\n' + q.text, { parse_mode: 'Markdown', ...scoreKeyboard() });
}

// ── МОИ ДЕСЯТКИ ──────────────────────────────────────────────────
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
  await ctx.editMessageText('📋 Десятки (' + groups.length + '):', { ...Markup.inlineKeyboard(buttons) });
});

// ── РЕФЛЕКСИЯ ────────────────────────────────────────────────────
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
  await ctx.reply('✅ ' + name + ', рефлексия за ' + now.getDate() + ' ' + MN[now.getMonth()] + ' сохранена!', {
    reply_to_message_id: ctx.message.message_id
  });
});

// ── КОМАНДЫ КОУЧА ─────────────────────────────────────────────────

// Привязка чата к десятке
bot.command('link_group', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Пиши эту команду в чате десятки');
  const groupId = parseInt(ctx.message.text.split(' ')[1]);
  if (!groupId) return ctx.reply('Укажи ID: /link_group 123');
  const { data: coach } = await sb.from('coaches').select('id').eq('telegram_id', ctx.from.id).maybeSingle();
  if (!coach) return ctx.reply('Ты не коуч. Напиши /start боту.');
  const { data: group } = await sb.from('groups').select('id,name').eq('id', groupId).eq('coach_id', coach.id).maybeSingle();
  if (!group) return ctx.reply('Десятка не найдена');
  await sb.from('group_chats').upsert({ group_id: groupId, chat_id: ctx.chat.id, chat_title: ctx.chat.title }, { onConflict: 'chat_id' });
  ctx.reply(
    '✅ Чат привязан к "' + group.name + '"!\n\n' +
    'Теперь доступны команды:\n' +
    '• /invite — пригласить участников заполнить карточку\n' +
    '• #рефлексия Текст... — сохранить рефлексию\n' +
    '• /permatest — пройти тест PERMA'
  );
});

// Приглашение участников заполнить анкету
bot.command('invite', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Пиши эту команду в чате десятки');
  const { data: gc } = await sb.from('group_chats').select('group_id').eq('chat_id', ctx.chat.id).maybeSingle();
  if (!gc) return ctx.reply('Сначала привяжи чат командой /link_group ID');
  const link = 'https://t.me/' + BOT_USERNAME + '?start=onboard_' + gc.group_id;
  ctx.reply(
    '📋 *Анкета участника десятки*\n\n' +
    'Каждый участник заполняет карточку один раз — имя, ниша, цели, точка А, долги и тест PERMA.\n\n' +
    '👇 Нажми кнопку чтобы заполнить:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.url('📝 Заполнить карточку', link)]])
    }
  );
});

// Ссылка на тест PERMA
bot.command('permalink', async (ctx) => {
  ctx.reply('🔗 Ссылка на тест PERMA:\n\nhttps://t.me/' + BOT_USERNAME + '?start=perma\n\nОтправь участникам десятки.');
});

// Отдельный тест PERMA
bot.command('permatest', async (ctx) => {
  const tgId = ctx.from.id;
  if (ctx.chat.type !== 'private') {
    return ctx.reply('Тест проходится в личных сообщениях. Нажми кнопку:', {
      ...Markup.inlineKeyboard([[Markup.button.url('Пройти тест PERMA', 'https://t.me/' + BOT_USERNAME + '?start=perma')]])
    });
  }
  sessions[tgId] = { type: 'perma', step: 0, scores: {} };
  await ctx.reply('🧠 *Диагностика PERMA*\n\n5 вопросов по шкале 1–5. Поехали! 🚀', { parse_mode: 'Markdown' });
  await sendPermaStandalone(ctx, tgId);
});

bot.command('myid', function(ctx) { ctx.reply('Твой ID: ' + ctx.from.id); });

bot.command('help', function(ctx) {
  ctx.reply(
    '📖 Команды:\n\n' +
    '/start — дашборд\n' +
    '/permatest — тест PERMA\n' +
    '/permalink — ссылка на тест\n' +
    '/myid — твой ID\n\n' +
    'В чате десятки:\n' +
    '/link_group ID — привязать чат\n' +
    '/invite — пригласить участников заполнить карточку\n' +
    '#рефлексия текст — сохранить рефлексию'
  );
});

bot.launch();
console.log('Бот запущен с онбордингом участников');
process.once('SIGINT', function() { bot.stop('SIGINT'); });
process.once('SIGTERM', function() { bot.stop('SIGTERM'); });
