import 'dotenv/config';
import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🚀 Creating demo accounts...');

  // 1. Create or update Demo Admin
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sameerlibrary.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      name: 'Demo Admin',
      email: 'admin@sameerlibrary.com',
      phone: '+919999900001',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });
  console.log('✅ Demo Admin created:', admin.email);

  // 2. Create or update Demo Student
  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@sameerlibrary.com' },
    update: {
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
    create: {
      name: 'Demo Student',
      email: 'student@sameerlibrary.com',
      phone: '+919999900002',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      college: 'Lucknow University',
      course: 'B.Tech CSE',
    },
  });
  console.log('✅ Demo Student created:', student.email);

  // 3. Ensure a branch exists
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Sameer Library - Main Branch',
        code: 'SL01',
        address: 'Maharajganj Sonauli Road, Mohanapur Bypass',
        city: 'Maharajganj',
        ownerId: admin.id,
        isActive: true,
      },
    });
    console.log('✅ Created branch:', branch.name);
  }

  // 4. Ensure a room exists
  let room = await prisma.room.findFirst({ where: { branchId: branch.id } });
  if (!room) {
    room = await prisma.room.create({
      data: {
        name: 'Quiet Zone (AC)',
        capacity: 30,
        branchId: branch.id,
        isActive: true,
      },
    });
    console.log('✅ Created room:', room.name);
  }

  // 5. Ensure seats exist
  let seat = await prisma.seat.findFirst({ where: { roomId: room.id } });
  if (!seat) {
    seat = await prisma.seat.create({
      data: {
        seatNumber: 'A-42',
        roomId: room.id,
        status: 'OCCUPIED',
      },
    });
    console.log('✅ Created seat:', seat.seatNumber);
  }

  // 6. Ensure active booking for Demo Student
  const existingBooking = await prisma.booking.findFirst({
    where: { studentId: student.id, status: 'APPROVED' },
  });

  if (!existingBooking) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 25);

    await prisma.booking.create({
      data: {
        studentId: student.id,
        branchId: branch.id,
        roomId: room.id,
        seatId: seat.id,
        startDate,
        endDate,
        planType: 'MONTHLY',
        status: 'APPROVED',
        amount: 1000,
        approvedById: admin.id,
      },
    });
    console.log('✅ Created active booking for Demo Student');
  }

  // 7. Ensure sample attendance records
  const existingAttendance = await prisma.attendance.findFirst({
    where: { studentId: student.id },
  });

  if (!existingAttendance) {
    const checkInAt = new Date();
    checkInAt.setHours(checkInAt.getHours() - 3);

    await prisma.attendance.create({
      data: {
        studentId: student.id,
        branchId: branch.id,
        roomId: room.id,
        checkInAt,
        source: 'QR_CODE',
      },
    });
    console.log('✅ Created active check-in for Demo Student');
  }

  console.log('🎉 Demo accounts & data ready!');
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
