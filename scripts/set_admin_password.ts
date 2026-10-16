import { db } from '../src/lib/db';
import { hashPassword, verifyPassword } from '../src/lib/auth-token';

async function setAdminPassword() {
  const newPassword = 'Raj@2026';
  const hashedPassword = hashPassword(newPassword);

  const updated = await db.user.updateMany({
    where: {
      OR: [
        { username: 'admin' },
        { email: 'rajsoni2962@gmail.com' }
      ]
    },
    data: {
      password: hashedPassword
    }
  });

  console.log(`Updated ${updated.count} user record(s).`);

  // Verify verification works
  const user = await db.user.findFirst({
    where: { username: 'admin' }
  });

  if (user && verifyPassword(newPassword, user.password)) {
    console.log('SUCCESS: Admin password verified successfully!');
  } else {
    console.error('ERROR: Password verification failed!');
  }
}

setAdminPassword()
  .catch(console.error)
  .finally(() => db.$disconnect());
