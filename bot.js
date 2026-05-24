const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = '8989739941:AAERbGHiWYKiBrnzU4s64sRbUmsX5Cz1gu8';
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emNxbXlrcnZ2anZ0Z2t4dXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYwNDUwOCwiZXhwIjoyMDk1MTgwNTA4fQ.nGKWDkUGdeA1kjqhAyqdFMVfg29IvNMK6wukiTxUlaU';
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';

const bot = new Telegraf(BOT_TOKEN);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MN = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

// ── СТАРТ ────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const username = ctx.from.username;

  const { data: existing } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();

  if (existing?.is_blocked) {
    return ctx.reply('❌ Ваш доступ заблокирован. Обратитесь к администратору.');
  }

  if (!existing) {
    await sb.from('coaches').insert({ telegram_id: tgId, name, username });
  }

  await ctx.reply(
    `👋 Привет, ${ctx.from.first_name}!\n\nДобро пожаловать в платформу *Десятка*.\nЗдесь ты управляешь своими группами предпринимателей.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Открыть дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)],
        [Markup.button.callback('📋 Мои десятки', 'my_groups')],
      ])
    }
  );
});

// ── МОИ ДЕСЯТКИ ──────────────────────────────────────────────────
bot.action('my_groups', async (ctx) => {
  const tgId = ctx.from.id;
  const { data: coach } = await sb.from('coaches').select('id,is_blocked').eq('telegram_id', tgId).maybeSingle();

  if (!coach) return ctx.reply('Сначала запусти /start');
  if (coach.is_blocked) return ctx.reply('❌ Ваш доступ заблокирован.');

  const { data: groups } = await sb.from('groups').select('id,name,start_date').eq('coach_id', coach.id);

  if (!groups || !groups.length) {
    return ctx.editMessageText('У тебя пока нет десяток. Создай первую в дашборде!', {
      ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)]])
    });
  }

  const buttons = groups.map(g => [
    Markup.button.webApp(`📊 ${g.name}`, `${MINI_APP_URL}?group=${g.id}&tg_id=${tgId}`)
  ]);
  buttons.push([Markup.button.webApp('🚀 Все десятки', `${MINI_APP_URL}?tg_id=${tgId}`)]);

  await ctx.editMessageText(`📋 *Твои десятки (${groups.length}):*`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
});

// ── РЕФЛЕКСИЯ ИЗ ГРУППОВОГО ЧАТА ────────────────────────────────
// Ловим #рефлексия от любого участника чата
bot.hears(/^#рефлексия\s*([\s\S]*)/i, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return;

  const chatId = ctx.chat.id;
  const text = ctx.match[1].trim();

  if (!text) {
    return ctx.reply(`${ctx.from.first_name}, напиши текст рефлексии после хештега:\n#рефлексия Этот месяц я...`);
  }

  const authorName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const authorUsername = ctx.from.username;
  const authorTgId = ctx.from.id;

  // Находим группу по chat_id
  const { data: groupChat } = await sb.from('group_chats').select('group_id').eq('chat_id', chatId).maybeSingle();

  if (!groupChat) {
    // Чат не привязан — молча игнорируем (не спамим в непривязанных чатах)
    return;
  }

  // Сохраняем рефлексию
  const { error } = await sb.from('group_reflections').insert({
    group_id: groupChat.group_id,
    chat_id: chatId,
    author_name: authorName,
    author_username: authorUsername,
    telegram_user_id: authorTgId,
    text: text
  });

  if (error) {
    console.error('Error saving reflection:', error);
    return ctx.reply(`${authorName}, не удалось сохранить рефлексию. Попробуй позже.`);
  }

  const now = new Date();
  await ctx.reply(
    `✅ ${authorName}, рефлексия сохранена!\n📅 ${now.getDate()} ${MN[now.getMonth()]} ${now.getFullYear()}\n\nКоуч увидит её в дашборде десятки.`,
    { reply_to_message_id: ctx.message.message_id }
  );
});

// ── ПРИВЯЗКА ЧАТА К ДЕСЯТКЕ ──────────────────────────────────────
bot.command('link_group', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Эту команду нужно писать в групповом чате десятки');
  }

  const groupId = parseInt(ctx.message.text.split(' ')[1]);
  if (!groupId) return ctx.reply('Укажи ID десятки: /link_group 123');

  const tgId = ctx.from.id;
  const { data: coach } = await sb.from('coaches').select('id').eq('telegram_id', tgId).maybeSingle();
  if (!coach) return ctx.reply('Ты не зарегистрирован как коуч. Напиши /start боту в личку.');

  const { data: group } = await sb.from('groups').select('id,name').eq('id', groupId).eq('coach_id', coach.id).maybeSingle();
  if (!group) return ctx.reply('Десятка не найдена или не твоя');

  await sb.from('group_chats').upsert({
    group_id: groupId,
    chat_id: ctx.chat.id,
    chat_title: ctx.chat.title
  }, { onConflict: 'chat_id' });

  ctx.reply(
    `✅ Чат *"${ctx.chat.title}"* привязан к десятке *"${group.name}"*!\n\n` +
    `Теперь участники могут писать рефлексию:\n` +
    `#рефлексия Этот месяц я...\n\n` +
    `Коуч будет видеть все записи в дашборде.`,
    { parse_mode: 'Markdown' }
  );
});

// ── МОЙ ID ───────────────────────────────────────────────────────
bot.command('myid', (ctx) => {
  ctx.reply(`Твой Telegram ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// ── ПОМОЩЬ ───────────────────────────────────────────────────────
bot.command('help', (ctx) => {
  ctx.reply(
    `📖 *Команды бота:*\n\n` +
    `*/start* — открыть дашборд\n` +
    `*/myid* — узнать свой Telegram ID\n\n` +
    `*Для коучей (в чате десятки):*\n` +
    `*/link_group ID* — привязать чат к десятке\n\n` +
    `*Для участников (в чате десятки):*\n` +
    `*#рефлексия* текст — сохранить рефлексию месяца`,
    { parse_mode: 'Markdown' }
  );
});

bot.launch();
console.log('🤖 Бот запущен с поддержкой групповой рефлексии');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
