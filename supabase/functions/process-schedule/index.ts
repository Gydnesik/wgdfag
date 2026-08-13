import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const geminiKey = Deno.env.get('GEMINI_API_KEY')!
const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const auth = req.headers.get('Authorization') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: auth } },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Необходим вход в аккаунт.' }, 401)

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'admin') return json({ error: 'Доступ только для администратора.' }, 403)

    const body = await req.json()
    const image = String(body.image || '')
    const mimeType = String(body.mimeType || 'image/jpeg')
    if (!image) return json({ error: 'Фото не передано.' }, 400)

    const prompt = `Ты — точный парсер школьного расписания. На изображении может быть большая таблица с расписанием нескольких классов. Твоя задача — распознать ВСЕ классы и ВСЕ непустые уроки.

Верни ТОЛЬКО JSON-объект без markdown. Ключ объекта — точное название класса из таблицы (например "5В", "10А"). Значение — массив уроков в порядке следования:
[{"day":"Понедельник","lesson":1,"subject":"Математика","time":"08:30","room":"12"}]

Правила:
- Не придумывай классы, уроки, время или кабинеты.
- Сохраняй буквы класса как на фото.
- Пустые ячейки пропускай.
- Если день недели указан отдельной строкой/блоком, укажи его в day.
- Если номер урока неизвестен, используй последовательный номер внутри дня.
- Если время или кабинет отсутствуют, оставь пустую строку.
- Один класс может иметь много дней.
- В ответе должен быть только валидный JSON.`

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: image } },
        ] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    })

    const data = await r.json()
    if (!r.ok) return json({ error: data?.error?.message || `Gemini HTTP ${r.status}` }, 502)

    let raw = ''
    for (const p of data?.candidates?.[0]?.content?.parts || []) if (p.text) raw += p.text
    raw = raw.replace(/```json|```/g, '').trim()
    if (!raw) return json({ error: 'Gemini не вернул JSON.' }, 502)

    let schedules: Record<string, unknown>
    try { schedules = JSON.parse(raw) } catch { return json({ error: 'Gemini вернул невалидный JSON.' }, 502) }
    if (!schedules || Array.isArray(schedules) || typeof schedules !== 'object') return json({ error: 'Неверный формат расписания.' }, 502)

    const normalized: Record<string, unknown[]> = {}
    for (const [className, lessons] of Object.entries(schedules)) {
      if (!Array.isArray(lessons)) continue
      normalized[className.trim()] = lessons.filter(Boolean)
    }

    return json({ schedules: normalized, model: geminiModel })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
