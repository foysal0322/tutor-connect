const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // Create Departments
  const deptEce = await prisma.department.upsert({
    where: { name: 'Electrical & Computer Engineering' },
    update: {},
    create: { name: 'Electrical & Computer Engineering' },
  });

  const deptBba = await prisma.department.upsert({
    where: { name: 'Business Administration' },
    update: {},
    create: { name: 'Business Administration' },
  });
  
  const deptMath = await prisma.department.upsert({
    where: { name: 'Mathematics & Physics' },
    update: {},
    create: { name: 'Mathematics & Physics' },
  });

  // Create Courses
  await prisma.course.deleteMany(); // Clear existing courses before insert to avoid duplicates
  await prisma.course.createMany({
    data: [
      { name: 'CSE115: Programming Language I', departmentId: deptEce.id },
      { name: 'CSE215: Programming Language II', departmentId: deptEce.id },
      { name: 'CSE225: Data Structures and Algorithms', departmentId: deptEce.id },
      { name: 'EEE154: Engineering Drawing', departmentId: deptEce.id },
      { name: 'MAT116: Precalculus', departmentId: deptMath.id },
      { name: 'MAT120: Calculus and Analytic Geometry I', departmentId: deptMath.id },
      { name: 'MGT210: Principles of Management', departmentId: deptBba.id },
      { name: 'ACT201: Introduction to Financial Accounting', departmentId: deptBba.id },
    ],
  });

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@northsouth.edu' },
    update: {},
    create: {
      email: 'admin@northsouth.edu',
      name: 'System Admin',
      nsuId: '000000000',
      contact: '01700000000',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
