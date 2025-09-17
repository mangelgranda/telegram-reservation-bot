require('dotenv').config();
const { Telegraf, session, Scenes, Markup } = require('telegraf');

// Helper: escapar HTML para que nunca rompa el parseo
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// —— Wizard (form steps) ——
const formWizard = new Scenes.WizardScene(
  'reservation-form',

  // Paso 0: pedir nombre y NO avanzar todavía (evita que /start form se tome como nombre)
  async (ctx) => {
    // Si ya venimos con texto del usuario y NO es un comando, lo tomamos como nombre
    const txt = ctx.message?.text?.trim() || '';
    const isCommand = txt.startsWith('/');

    if (!ctx.wizard.state.form) ctx.wizard.state.form = {};

    if (txt && !isCommand && !ctx.wizard.state.form.fullName) {
      // Guardamos nombre y pasamos al paso de restaurante
      ctx.wizard.state.form.fullName = txt;
      await ctx.reply('Restaurant link (full TheFork URL):');
      return ctx.wizard.next(); // -> Paso 1
    }

    // Si es la primera vez (o vino un comando como /start form), solo preguntamos el nombre
    await ctx.reply('Full name (to give at the restaurant):');
    // NO next: nos quedamos en el paso 0 esperando la próxima respuesta con el nombre
  },

  // Paso 1: restaurante
  async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text) return ctx.reply('Please send the restaurant link (URL):');

    ctx.wizard.state.form.restaurant = text;
    await ctx.reply('Date & time (e.g., 2025-09-18 21:00):');
    return ctx.wizard.next(); // -> Paso 2
  },

  // Paso 2: fecha/hora
  async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text) return ctx.reply('Please write the date & time:');

    ctx.wizard.state.form.datetime = text;
    await ctx.reply('Number of guests (e.g., 2):');
    return ctx.wizard.next(); // -> Paso 3
  },

  // Paso 3: invitados
  async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (!text) return ctx.reply('Please write the number of guests:');

    ctx.wizard.state.form.guests = text;
    await ctx.reply('Notes (optional). If none, write "no":');
    return ctx.wizard.next(); // -> Paso 4
  },

  // Paso 4: notas y envío
  async (ctx) => {
    const notes = ctx.message?.text?.trim() || '';
    const normalized = notes.toLowerCase();
    ctx.wizard.state.form.notes = (normalized === 'no' || normalized === 'none') ? '' : notes;

    const f = ctx.wizard.state.form;
    const from = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''} (@${ctx.from?.username || 'no_username'})`;

    const summary = `✅ <b>New reservation request</b>

<b>Full name:</b> ${esc(f.fullName)}
<b>Restaurant:</b> ${esc(f.restaurant)}
<b>Date & time:</b> ${esc(f.datetime)}
<b>Guests:</b> ${esc(f.guests)}
<b>Notes:</b> ${esc(f.notes || '—')}

<b>From:</b> ${esc(from)}`;

    const staffId = process.env.STAFF_CHAT_ID;
    try {
      await ctx.telegram.sendMessage(staffId, summary, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    } catch (e) {
      console.error('Error sending to staff:', e.message);
    }

    await ctx.reply('🎉 Done! We received your request.\nWe will contact you shortly here in private for the last details.');
    return ctx.scene.leave();
  }
);
// —— Stage & session ——
const stage = new Scenes.Stage([formWizard]);

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use(stage.middleware());

// /start — si viene con payload "form", entra al wizard; si no, muestra el botón
bot.start(async (ctx) => {
  if (ctx.startPayload === 'form') {
    return ctx.scene.enter('reservation-form'); // empieza desde el paso 0
  }
  const username = bot.botInfo?.username || 'your_bot_username';
  const link = `https://t.me/${username}?start=form`;
  await ctx.reply(
    'Hi! Press the button to open the reservation form.',
    Markup.inlineKeyboard([Markup.button.url('📝 Open reservation form', link)])
  );
});

// /panel — publica el botón en el tema donde lo escribas (para pinearlo)
bot.command('panel', async (ctx) => {
  const username = bot.botInfo?.username || 'your_bot_username';
  const link = `https://t.me/${username}?start=form`;

  const replyOpts = {};
  if (ctx.message?.is_topic_message && ctx.message?.message_thread_id) {
    replyOpts.message_thread_id = ctx.message.message_thread_id; // queda en ese tema
  }

  await ctx.reply(
    'Press to open the reservation form (opens in a private chat):',
    {
      ...replyOpts,
      reply_markup: Markup.inlineKeyboard([
        Markup.button.url('📝 Open reservation form', link),
      ]).reply_markup
    }
  );
});

// /cancel — salir de la escena
bot.command('cancel', async (ctx) => {
  await ctx.reply('Form canceled. You can start again anytime with /start.');
  try { await ctx.scene.leave(); } catch (_) {}
});

// Launch
bot.launch().then(() => console.log('Bot started ✅'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
