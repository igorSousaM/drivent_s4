import { forbiddenError, notFoundError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import hotelRepository from "@/repositories/hotel-repository";
import ticketRepository from "@/repositories/ticket-repository";

async function getBookingList(userId: number) {
  const bookingList = await bookingRepository.findOneByUserId(userId);
  if (!bookingList) throw notFoundError();
  return bookingList;
}

async function postBooking(userId: number, roomId: number) {
  const room = await hotelRepository.findRoomById(roomId);
  if (!room) throw notFoundError();

  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) throw forbiddenError();

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
  if (!ticket) throw forbiddenError();

  const isPaid = ticket.status === "PAID";
  const isRemote = ticket.TicketType.isRemote;
  const includesHotel = ticket.TicketType.includesHotel;

  if (!isPaid || isRemote || !includesHotel) throw forbiddenError();

  const booking = await bookingRepository.findManyByRoomId(roomId);
  if (room.capacity <= booking.length) throw forbiddenError();

  const response = await bookingRepository.create(userId, roomId);
  return response;
}

async function putBooking(userId: number, roomId: number) {
  const room = await hotelRepository.findRoomById(roomId);
  if (!room) throw notFoundError();

  const booking = await bookingRepository.findManyByRoomId(roomId);
  if (booking.length) throw forbiddenError();

  if (room.capacity <= booking.length) throw forbiddenError();

  const bookingFoundByUserId = await bookingRepository.findOneByUserId(userId);
  if (!bookingFoundByUserId || bookingFoundByUserId.userId !== userId) throw forbiddenError();

  const response = bookingRepository.upsert(userId, roomId, bookingFoundByUserId.id);
  return response;
}

const bookingService = {
  getBookingList,
  postBooking,
  putBooking,
};

export default bookingService;
