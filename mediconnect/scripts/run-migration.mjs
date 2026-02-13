import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationPath = join(__dirname, '../supabase/migrations/001_initial_schema.sql')
const sql = readFileSync(migrationPath, 'utf8')

const client = new Client({
  host: 'db.qpwtgdephdjdodknjsqv.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '-StU6GFp$FM-9%+',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  console.log('Connecting to Supabase PostgreSQL...')
  await client.connect()
  console.log('Connected. Running migration...')

  try {
    await client.query(sql)
    console.log('✅ Migration completed successfully!')
  } catch (err) {
    // Log the error but check if it's "already exists" (idempotent run)
    if (err.message && err.message.includes('already exists')) {
      console.log('⚠️  Some objects already exist — migration may have already run.')
    } else {
      console.error('❌ Migration error:', err.message)
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

run()
