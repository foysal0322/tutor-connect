/**
 * One-off seed for NSUOne Shop default categories.
 *
 * Idempotent: uses upsert on slug. Safe to run repeatedly.
 *
 * Run manually:
 *   node prisma/seed-shop.js
 */
/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'books', name: 'Books & Textbooks', icon: 'BookOpen', sortOrder: 10 },
  { slug: 'calculators', name: 'Calculators', icon: 'Calculator', sortOrder: 20 },
  { slug: 'lab-kits', name: 'Lab Kits & Equipment', icon: 'FlaskConical', sortOrder: 30 },
  { slug: 'notes', name: 'Notes & Study Guides', icon: 'NotebookPen', sortOrder: 40 },
  { slug: 'electronics', name: 'Electronics', icon: 'Laptop', sortOrder: 50 },
  { slug: 'stationery', name: 'Stationery', icon: 'PencilRuler', sortOrder: 60 },
  { slug: 'instruments', name: 'Instruments', icon: 'Music', sortOrder: 70 },
  { slug: 'other', name: 'Other', icon: 'Package', sortOrder: 99 },
];

async function main() {
  console.log('Seeding Shop categories...');
  for (const c of CATEGORIES) {
    await prisma.shopCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, sortOrder: c.sortOrder },
      create: { ...c, isActive: true },
    });
    console.log(`  ✓ ${c.slug}`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
