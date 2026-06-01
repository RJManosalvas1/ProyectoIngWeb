import postgres from './node_modules/postgres/src/index.js';

const url = 'postgresql://postgres.kglzcmetflqacrfkegsb:jVpibsik6LX2WTEj@aws-1-us-east-2.pooler.supabase.com:6543/postgres';
console.log('Probando aws-1-us-east-2...');
const sql = postgres(url, { prepare: false, connect_timeout: 10 });
try {
  const result = await sql`SELECT 1 as test`;
  console.log('✅ CONEXION OK:', result);
} catch (e) {
  console.log('❌ ERROR:', e.message);
} finally {
  await sql.end().catch(() => {});
}
