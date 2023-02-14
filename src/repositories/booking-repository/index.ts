import { prisma } from "@/config";

async function findOneByUserId(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId,
    },
  });
}

async function findManyByRoomId(roomId: number) {
  return prisma.booking.findMany({
    where: {
      roomId,
    },
    include: {
      Room: true,
    },
  });
}

async function create(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId: userId,
      roomId: roomId,
    },
  });
}

async function upsert(userId: number, roomId: number, id: number) {
  return prisma.booking.upsert({
    where: {
      id: id,
    },
    create: {
      userId,
      roomId,
    },
    update: {
      roomId,
    },
  });
}

const bookingRepository = {
  findOneByUserId,
  findManyByRoomId,
  create,
  upsert,
};

export default bookingRepository;
