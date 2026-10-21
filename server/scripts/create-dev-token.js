import 'dotenv/config';
import jwt from 'jsonwebtoken';

const [userId, role] = process.argv.slice(2);
const allowedRoles = new Set(['driver', 'parent', 'admin']);

if (process.env.NODE_ENV === 'production') {
  console.error('This development helper is disabled in production.');
  process.exit(1);
}
if (!userId || !allowedRoles.has(role)) {
  console.error('Usage: node scripts/create-dev-token.js <userId> <driver|parent|admin>');
  process.exit(1);
}
if (!process.env.JWT_ACCESS_SECRET) {
  console.error('Set JWT_ACCESS_SECRET in .env first.');
  process.exit(1);
}

const token = jwt.sign({ role }, process.env.JWT_ACCESS_SECRET, {
  subject: userId,
  expiresIn: '15m',
  issuer: 'school-van-monitor-dev'
});
console.log(token);
