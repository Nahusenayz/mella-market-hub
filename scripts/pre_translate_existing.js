/**
 * Pre-translates all existing user names and job titles to Amharic.
 * Run once after the content_translations table is created.
 *
 * Usage: node scripts/pre_translate_existing.js
 *
 * Requires env vars:
 *   SUPABASE_URL=https://qjkhdlfzzmtrpvimcfau.supabase.co
 *   SUPABASE_SERVICE_KEY=your_service_role_key
 *   OPENROUTER_API_KEY=your_openrouter_key
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qjkhdlfzzmtrpvimcfau.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!SUPABASE_SERVICE_KEY || !OPENROUTER_API_KEY) {
  console.error('❌ Missing required env vars: SUPABASE_SERVICE_KEY, OPENROUTER_API_KEY');
  process.exit(1);
}

async function fetchFromSupabase(query) {
  return new Promise((resolve, reject) => {
    const url = new URL(query, `${SUPABASE_URL}/rest/v1`);
    const req = https.get(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(data)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function insertTranslation(sourceText, targetText) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      source_text: sourceText,
      target_text: targetText,
      target_language: 'am',
    });
    const url = new URL('/rest/v1/content_translations', SUPABASE_URL);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 300) resolve();
        else reject(new Error(`${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function translateWithMella(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [
        {
          role: 'system',
          content: `You are Mella Translate. Translate the user's text accurately and naturally into Amharic. Preserve meaning, names, prices, and addresses. Return only the translated text, with no explanation. If the text is already Amharic or looks like a name that shouldn't be changed, return it as-is.`,
        },
        { role: 'user', content: text },
      ],
    });

    const url = new URL('https://openrouter.ai/api/v1/chat/completions');
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content?.trim() || text);
        } catch {
          reject(new Error(data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🚀 Starting pre-translation of existing content...\n');

  // 1. Fetch distinct user names
  console.log('📦 Fetching existing user names...');
  const profiles = await fetchFromSupabase('profiles?select=full_name&full_name=not.is.null');
  const names = [...new Set(profiles.map(p => p.full_name).filter(Boolean))];
  console.log(`   Found ${names.length} unique user names.`);

  // 2. Fetch distinct ad titles
  console.log('📦 Fetching existing ad titles...');
  const ads = await fetchFromSupabase('ads?select=title&is_active=eq.true');
  const titles = [...new Set(ads.map(a => a.title).filter(Boolean))];
  console.log(`   Found ${titles.length} unique ad titles.`);

  // 3. Fetch distinct worker names
  console.log('📦 Fetching existing worker names...');
  const workers = await fetchFromSupabase('worker_profiles?select=full_name&full_name=not.is.null');
  const workerNames = [...new Set(workers.map(w => w.full_name).filter(Boolean))];
  console.log(`   Found ${workerNames.length} unique worker names.`);

  const allTexts = [...new Set([...names, ...titles, ...workerNames])];
  console.log(`\n📝 Total unique texts to translate: ${allTexts.length}\n`);

  // 4. Check which already have translations
  console.log('🔍 Checking existing translations...');
  const existing = await fetchFromSupabase('content_translations?select=source_text');
  const existingSet = new Set(existing.map(e => e.source_text));
  const toTranslate = allTexts.filter(t => !existingSet.has(t));
  console.log(`   Already translated: ${existingSet.size}, Remaining: ${toTranslate.length}\n`);

  if (toTranslate.length === 0) {
    console.log('✅ All texts already translated!');
    return;
  }

  // 5. Translate in batches of 5 to avoid rate limits
  const BATCH_SIZE = 5;
  let translated = 0;
  let errors = 0;

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    const batchStr = batch.join('\n---\n');

    try {
      const result = await translateWithMella(batchStr);
      const lines = result.split('---').map(l => l.trim()).filter(Boolean);

      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const translation = lines[j] || original;
        try {
          await insertTranslation(original, translation);
          translated++;
        } catch (e) {
          errors++;
        }
      }

      const progress = Math.min(i + BATCH_SIZE, toTranslate.length);
      console.log(`   Progress: ${progress}/${toTranslate.length} (errors: ${errors})`);

      // Small delay between batches
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`   Batch failed: ${e.message}`);
      errors += batch.length;
    }
  }

  console.log(`\n✅ Done! Translated: ${translated}, Errors: ${errors}`);
}

main().catch(console.error);
