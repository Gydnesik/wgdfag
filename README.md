# Школьный Помощник — Supabase edition

В этой версии:
- Supabase Auth для входа и регистрации по нику + паролю;
- класс хранится в `profiles`;
- расписание хранится в Supabase по классам;
- только роль `admin` может менять расписание;
- Gemini 3.6 Flash вызывается через Supabase Edge Function, поэтому Gemini API key не попадает в GitHub/браузер;
- рабочее меню ☰ и раздел Аккаунт;
- старые разделы ДЗ и Оценки сохранены локально в браузере как промежуточный слой.

## 1. Supabase SQL

Выполни целиком `schema.sql` в SQL Editor.

## 2. Auth

В Supabase: Authentication → Sign In / Providers → Email.

Для режима «только ник + пароль» нужно отключить **Confirm email**. Технический email генерируется приложением и пользователю не показывается.

## 3. Первый администратор

Зарегистрируй свой аккаунт через приложение. Затем в SQL Editor выполни:

```sql
update public.profiles
set role = 'admin'
where username = 'ТВОЙ_НИК';
```

## 4. Gemini

Функция: `supabase/functions/process-schedule/index.ts`.

Установи Supabase CLI и из корня проекта:

```bash
supabase login
supabase link --project-ref igbkjkjagkhxpxezjwtj
supabase functions deploy process-schedule
supabase secrets set GEMINI_API_KEY="ТВОЙ_GEMINI_API_KEY" GEMINI_MODEL="gemini-3.6-flash"
```

После этого Gemini key находится только в секретах функции.
