# Telegram Reservation Bot (English Form, No Phone)

This bot collects reservation requests **in English**, without phone field, and with **optional Notes**. It sends a formatted summary to your staff chat (or your own DM).

## What it asks
- Full name
- Restaurant link (TheFork URL)
- Date & time
- Number of guests
- Notes (optional)

## Quick start (local)
1. Create a bot with **@BotFather** and copy the **token**.
2. Get your **STAFF_CHAT_ID** (use @RawDataBot or @userinfobot).
3. Create a `.env` file with:
   ```
   BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
   STAFF_CHAT_ID=YOUR_STAFF_CHAT_ID
   ```
4. Install & run:
   ```bash
   npm install
   npm start
   ```

## 24/7 hosting (Railway/Render)
- Deploy this project as a **background worker** (command: `node index.js`).
- Add the environment variables `BOT_TOKEN` and `STAFF_CHAT_ID` in the platform dashboard.
- The bot uses **long polling** (no need for webhooks). Keep the worker always on.

## Commands
- `/start` — Greets and shows the DM button (also handles deep-link `?start=form`).
- `/panel` — Posts the button in a group/topic (pin it if you like).
- `/cancel` — Cancels the form.

## Notes
- The form runs in **private** so user data is not public in your group.
- Final user message:
  ```
  🎉 Done! We received your request.
  We will contact you shortly here in private for the last details.
  ```