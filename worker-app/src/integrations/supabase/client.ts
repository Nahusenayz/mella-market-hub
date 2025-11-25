import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Please create a .env.local file in the worker-app directory with:')
  console.error('  VITE_SUPABASE_URL=your_supabase_url')
  console.error('  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')

  // Show error in the DOM
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: system-ui, sans-serif;
        padding: 20px;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 500px;
        ">
          <h2 style="color: #dc2626; margin-bottom: 1rem;">⚠️ Configuration Error</h2>
          <p style="color: #333; margin-bottom: 1rem;">
            The worker app is missing required Supabase environment variables.
          </p>
          <div style="
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.875rem;
            margin-bottom: 1rem;
          ">
            <div>1. Create <strong>.env.local</strong> in the worker-app folder</div>
            <div style="margin-top: 0.5rem;">2. Add these variables:</div>
            <div style="margin-top: 0.5rem; color: #059669;">
              VITE_SUPABASE_URL=your_url<br/>
              VITE_SUPABASE_ANON_KEY=your_key
            </div>
          </div>
          <p style="color: #6b7280; font-size: 0.875rem;">
            Copy the values from the main app's .env.local file.
          </p>
        </div>
      </div>
    `
  }

  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

