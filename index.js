require('dotenv').config();
const { Telegraf, session, Scenes, Markup } = require('telegraf');

// —— Wizard (form steps) ——
const formWizard = new Scenes.WizardScene(
  'reservation-form',
  async (ctx) => {
    ctx.wizard.state.form = {};
    await ctx.reply('Full name (to give at the restaurant):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.form.fullName = ctx.message?.text?.trim() || '';
    if (!ctx.wizard.state.form.fullName) {
      return ctx.reply('Please write your full name:');
    }
    await ctx.reply('Restaurant link (full TheFork URL):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.form.restaurant = ctx.message?.text?.trim() || '';
    if (!ctx.wizard.state.form.restaurant) {
      return ctx.reply('Please send the restaurant link (URL):');
    }
    await ctx.reply('Date & time (e.g., 2025-09-18 21:00):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.form.datetime = ctx.message?.text?.trim() || '';
    if (!ctx.wizard.state.form.datetime) {
      return ctx.reply('Please write the date & time:');
    }
    await ctx.reply('Number of guests (e.g., 2):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.form.guests = ctx.message?.text?.trim() || '';
    if (!ctx.wizard.state.form.guests) {
      return ctx.reply('Please write the number of guests:');
    }
    await ctx.reply('Notes (optional). If none, write "no":');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const notes = ctx.message?.text?.trim() || '';
    const normalized = notes.toLowerCase();
    ctx.wizard.state.form.notes = (normalized === 'no' || normalized === 'none') ? '' : notes;

    const f = ctx.wizard.state.form;
    const summary =
`✅ *New reservation request*

*Full name:* ${f.fullName}
*Restaurant:* ${f.restaurant}
*Date & time:* ${f.datetime}
*Guests:* ${f.guests}
*Notes:* ${f.notes || '—'}

*From:* ${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''} (@${ctx.from?.username || 'no_username'})`;

    const staffId = process.env.STAFF_CHAT_ID;
    try {
      await ctx.telegram.sendMessage(staffId, summary, { parse_mode: 'Markdown' });
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

// /start (with deep-link support to jump straight into the form)
bot.start(async (ctx) => {
  if (ctx.startPayload === 'form') {
    return ctx.scene.enter('reservation-form');
  }
  const username = bot.botInfo?.username || 'your_bot_username';
  const link = `https://t.me/${username}?start=form`;
  await ctx.reply(
    'Hi! Press the button to open the reservation form.',
    Markup.inlineKeyboard([Markup.button.url('📝 Open reservation form', link)])
  );
});

// /panel: post the button (use it in your group/topic and pin it if you want)
bot.command('panel', async (ctx) => {
  const username = bot.botInfo?.username || 'your_bot_username';
  const link = `https://t.me/${username}?start=form`;
  await ctx.reply(
    'Press to open the reservation form (opens in a private chat):',
    Markup.inlineKeyboard([Markup.button.url('📝 Open reservation form', link)])
  );
});

// /cancel: exit the form
bot.command('cancel', async (ctx) => {
  await ctx.reply('Form canceled. You can start again anytime with /start.');
  try { await ctx.scene.leave(); } catch (_) {}
});

// Launch (long polling) — good for Railway/Render worker to run 24/7
bot.launch().then(() => console.log('Bot started ✅'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));