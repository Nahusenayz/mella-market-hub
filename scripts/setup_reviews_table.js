/**
 * Run this script once to create the reviews table in your Supabase project.
 * 
 * Usage:
 *   1. Go to https://supabase.com/dashboard/project/qjkhdlfzzmtrpvimcfau/sql/new
 *   2. Copy and paste the SQL below
 *   3. Click "Run"
 * 
 * Or run this script with:
 *   node scripts/setup_reviews_table.js
 * 
 * (Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local)
 */

const SQL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_id UUID NOT NULL REFERENCES profiles(id),
      reviewee_id UUID NOT NULL REFERENCES profiles(id),
      booking_id UUID REFERENCES bookings(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      comment TEXT,
      helpful_count INTEGER DEFAULT 0,
      response TEXT,
      response_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(reviewer_id, booking_id)
    );

    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
    CREATE POLICY "Users can create reviews" ON reviews FOR INSERT 
      WITH CHECK (auth.uid() = reviewer_id);
    CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE 
      USING (auth.uid() = reviewer_id);

    ALTER TABLE reviews REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

    RAISE NOTICE '✅ reviews table created successfully';
  ELSE
    RAISE NOTICE 'ℹ️ reviews table already exists';
  END IF;
END $$;
`;

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://qjkhdlfzzmtrpvimcfau.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.log('\n❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    console.log('\n📋 Alternative: Run this SQL in the Supabase SQL Editor:');
    console.log('   Go to: https://supabase.com/dashboard/project/qjkhdlfzzmtrpvimcfau/sql/new');
    console.log('\n' + SQL);
    return;
  }

  console.log('Creating reviews table...');
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ sql: SQL }),
  });

  if (res.ok) {
    console.log('✅ reviews table created successfully!');
  } else {
    console.log('❌ Failed:', await res.text());
    console.log('\n📋 Run the SQL directly in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/qjkhdlfzzmtrpvimcfau/sql/new');
    console.log('\n' + SQL);
  }
}

main().catch(console.error);
