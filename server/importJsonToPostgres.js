import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDb, writeDb, ensureDbCollections } from './db.js';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL chưa được cấu hình. Không thể import vào PostgreSQL.');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'database.json');

if (!fs.existsSync(sourceFile)) {
  console.error(`Không tìm thấy file JSON nguồn: ${sourceFile}`);
  process.exit(1);
}

try {
  const raw = fs.readFileSync(sourceFile, 'utf8');
  const data = ensureDbCollections(JSON.parse(raw));

  await initDb();
  const ok = writeDb(data);
  if (!ok) {
    throw new Error('writeDb trả về false khi import dữ liệu.');
  }

  console.log(`Đã import ${sourceFile} vào PostgreSQL app_state.`);
  console.log(`Counts: ${data.users?.length || 0} users, ${data.collaborators?.length || 0} CTVs, ${data.tasks?.length || 0} tasks, ${data.submissions?.length || 0} submissions.`);
  setTimeout(() => process.exit(0), 500);
} catch (err) {
  console.error('Import JSON sang PostgreSQL thất bại:', err);
  process.exit(1);
}
