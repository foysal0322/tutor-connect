const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // Delete existing dependent records to avoid foreign key violations
  await prisma.tutorExpertise.deleteMany();
  await prisma.tutorRequest.deleteMany();
  await prisma.course.deleteMany();

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

  // Create Tutors
  const tutorPassword = await bcrypt.hash('tutor123', 10);
  
  const tutor1 = await prisma.user.upsert({
    where: { email: 'tanvir@northsouth.edu' },
    update: { role: 'TUTOR' },
    create: {
      email: 'tanvir@northsouth.edu',
      name: 'Tanvir Rahman',
      nsuId: '1912345042',
      contact: '01812345678',
      gender: 'Male',
      departmentId: deptEce.id,
      cgpa: 3.85,
      password: tutorPassword,
      role: 'TUTOR',
    },
  });

  const tutor2 = await prisma.user.upsert({
    where: { email: 'farhana@northsouth.edu' },
    update: { role: 'TUTOR' },
    create: {
      email: 'farhana@northsouth.edu',
      name: 'Farhana Yasmin',
      nsuId: '2012345043',
      contact: '01912345678',
      gender: 'Female',
      departmentId: deptMath.id,
      cgpa: 3.92,
      password: tutorPassword,
      role: 'TUTOR',
    },
  });

  // Create Students
  const studentPassword = await bcrypt.hash('student123', 10);
  
  await prisma.user.upsert({
    where: { email: 'student@northsouth.edu' },
    update: { role: 'STUDENT' },
    create: {
      email: 'student@northsouth.edu',
      name: 'Test Student',
      nsuId: '2110000042',
      contact: '01711112222',
      gender: 'Male',
      departmentId: deptEce.id,
      password: studentPassword,
      role: 'STUDENT',
    }
  });

  await prisma.user.upsert({
    where: { email: 'student2@northsouth.edu' },
    update: { role: 'STUDENT' },
    create: {
      email: 'student2@northsouth.edu',
      name: 'Verify Student',
      nsuId: '2110000043',
      contact: '01722223333',
      gender: 'Female',
      departmentId: deptMath.id,
      password: studentPassword,
      role: 'STUDENT',
    }
  });

  // Find newly created courses to link to expertises
  const cse115 = await prisma.course.findFirst({ where: { name: { startsWith: 'CSE115' } } });
  const mat120 = await prisma.course.findFirst({ where: { name: { startsWith: 'MAT120' } } });

  // Create expertises
  if (cse115) {
    await prisma.tutorExpertise.create({
      data: {
        tutorId: tutor1.id,
        courseId: cse115.id,
        semesterCompleted: 'Spring 2024',
        facultyName: 'Dr. Mizanur Rahman',
        courseGrade: 'A',
        availability: 'Sun, Tue 4 PM - 6 PM',
        sessionFee: 4000,
        isActive: true,
      }
    });
  }

  if (mat120) {
    await prisma.tutorExpertise.create({
      data: {
        tutorId: tutor2.id,
        courseId: mat120.id,
        semesterCompleted: 'Fall 2023',
        facultyName: 'Dr. Md. Sahadet Hossain',
        courseGrade: 'A',
        availability: 'Mon, Wed 2 PM - 4 PM',
        sessionFee: 3500,
        isActive: true,
      }
    });
  }

  // Create dummy PaymentInfo data
  await prisma.paymentInfo.deleteMany();
  await prisma.paymentInfo.createMany({
    data: [
      {
        provider: 'bKash',
        amount: 1500,
        sender: '01711223344',
        trxId: 'BKASH12345678',
        time: new Date('2026-07-05T10:21:34Z'),
      },
      {
        provider: 'Nagad',
        amount: 2500,
        sender: '01999887766',
        trxId: 'NAGAD87654321',
        time: new Date('2026-07-04T15:45:00Z'),
      },
      {
        provider: 'Rocket',
        amount: 3000,
        sender: '01555443322',
        trxId: 'ROCKET5555555',
        time: new Date('2026-07-01T09:15:20Z'),
      }
    ]
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
