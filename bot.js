const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = '8989739941:AAERbGHiWYKiBrnzU4s64sRbUmsX5Cz1gu8';
const SUPABASE_URL = 'https://atzcqmykrvvjvtgkxuxy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emNxbXlrcnZ2anZ0Z2t4dXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYwNDUwOCwiZXhwIjoyMDk1MTgwNTA4fQ.nGKWDkUGdeA1kjqhAyqdFMVfg29IvNMK6wukiTxUlaU';
const MINI_APP_URL = 'https://strong-sopapillas-be36e8.netlify.app';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function monthName(m) {
  return ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][m];
}

// ── СТАРТ ────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const username = ctx.from.username;

  const { data: existing } = await supabase
    .from('coaches')
    .select('id')
    .eq('telegram_id', tgId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('coaches').insert({ telegram_id: tgId, name, username });
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
  const { data: coach } = await supabase
    .from('coaches').select('id').eq('telegram_id', tgId).maybeSingle();

  if (!coach) return ctx.reply('Сначала запусти /start');

  const { data: groups } = await supabase
    .from('groups').select('id, name, start_date').eq('coach_id', coach.id);

  if (!groups || !groups.length) {
    return ctx.editMessageText('У тебя пока нет десяток. Создай первую в дашборде!', {
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Открыть дашборд', `${MINI_APP_URL}?tg_id=${tgId}`)]
      ])
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
bot.hears(/^#рефлексия\s+(.+)/si, async (ctx) => {
  if (!ctx.chat || ctx.chat.type === 'private') return;

  const chatId = ctx.chat.id;
  const text = ctx.match[1].trim();
  const fromUsername = ctx.from.username;
  const fromName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

  const { data: groupChat } = await supabase
    .from('group_chats').select('group_id').eq('chat_id', chatId).maybeSingle();

  if (!groupChat) return;

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('group_id', groupChat.group_id)
    .or(`telegram_username.eq.${fromUsername},name.ilike.%${fromName}%`)
    .maybeSingle();

  if (!member) {
    return ctx.reply(`@${fromUsername}, не нашёл тебя в этой десятке. Обратись к коучу.`);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  await supabase.from('monthly_entries').upsert({
    member_id: member.id,
    year, month,
    reflection: text,
    reflection_date: now.toISOString()
  }, { onConflict: 'member_id,year,month' });

  await ctx.reply(`✅ ${fromName}, рефлексия за ${monthName(month)} сохранена в дашборд!`);
});

// ── ПРИВЯЗКА ЧАТА К ДЕСЯТКЕ ──────────────────────────────────────
bot.command('link_group', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Эту команду нужно писать в групповом чате десятки');
  }

  const groupId = parseInt(ctx.message.text.split(' ')[1]);
  if (!groupId) return ctx.reply('Укажи ID десятки: /link_group 123');

  const tgId = ctx.from.id;
  const { data: coach } = await supabase
    .from('coaches').select('id').eq('telegram_id', tgId).maybeSingle();

  if (!coach) return ctx.reply('Ты не зарегистрирован как коуч');

  const { data: group } = await supabase
    .from('groups').select('id,name')
    .eq('id', groupId).eq('coach_id', coach.id).maybeSingle();

  if (!group) return ctx.reply('Десятка не найдена или не твоя');

  await supabase.from('group_chats').upsert({
    group_id: groupId,
    chat_id: ctx.chat.id,
    chat_title: ctx.chat.title
  }, { onConflict: 'chat_id' });

  ctx.reply(
    `✅ Чат привязан к десятке *${group.name}*!\n\nТеперь участники могут писать:\n#рефлексия Этот месяц я...\n\nИ текст автоматически попадёт в дашборд.`,
    { parse_mode: 'Markdown' }
  );
});

// ── МОЙ ID ───────────────────────────────────────────────────────
bot.command('myid', (ctx) => {
  ctx.reply(`Твой Telegram ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.launch();
console.log('🤖 Бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
