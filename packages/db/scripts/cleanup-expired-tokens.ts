import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupExpiredTokens() {
  const now = new Date();

  const deletedMagicLinks = await prisma.magicLinkToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const deletedEmailChanges = await prisma.emailChangeToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const deletedPasswordResets = await prisma.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const deletedPasskeyChallenges = await prisma.passkeyChallenge.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  console.log("Expired token cleanup complete:");
  console.log(`  MagicLinkToken:      ${deletedMagicLinks.count} deleted`);
  console.log(`  EmailChangeToken:    ${deletedEmailChanges.count} deleted`);
  console.log(`  PasswordResetToken:  ${deletedPasswordResets.count} deleted`);
  console.log(`  PasskeyChallenge:    ${deletedPasskeyChallenges.count} deleted`);

  await prisma.$disconnect();
}

cleanupExpiredTokens().catch((err) => {
  console.error("Cleanup failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
