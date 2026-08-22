import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding database CHECK constraints for Inventory table...');

  // Helper to safely add constraints (drop if exists first)
  const applyConstraint = async (constraintName: string, checkSql: string) => {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "${constraintName}";`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Inventory" ADD CONSTRAINT "${constraintName}" ${checkSql};`
      );
      console.log(`Constraint "${constraintName}" applied successfully.`);
    } catch (e: any) {
      console.error(`Failed to apply constraint "${constraintName}":`, e.message);
    }
  };

  await applyConstraint('chk_physical_qty', 'CHECK ("physicalQuantity" >= 0)');
  await applyConstraint('chk_reserved_qty', 'CHECK ("reservedQuantity" >= 0)');
  await applyConstraint('chk_damaged_qty', 'CHECK ("damagedQuantity" >= 0)');
  await applyConstraint(
    'chk_available_qty',
    'CHECK ("physicalQuantity" >= ("reservedQuantity" + "damagedQuantity"))'
  );

  console.log('Database setup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
