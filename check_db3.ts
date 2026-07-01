import { db } from '@vercel/postgres';

async function checkDb() {
  const client = await db.connect();
  try {
    const res = await client.query(`
      SELECT * FROM courses WHERE title LIKE '%Accounting%' LIMIT 10;
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
  }
}

checkDb();
