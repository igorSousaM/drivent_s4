import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/booking-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  const userId = Number(req.userId);

  try {
    const bookingList = await bookingService.getBookingList(userId);
    res.status(httpStatus.OK).send(bookingList);
  } catch (error) {
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  const userId = Number(req.userId);
  const roomId = Number(req.body.roomId);

  try {
    const booking = await bookingService.postBooking(userId, roomId);
    res.status(httpStatus.OK).send({ bookingId: booking.id });
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    } else {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
  }
}

export async function putBooking(req: AuthenticatedRequest, res: Response) {
  const userId = Number(req.userId);
  const roomId = Number(req.body.roomId);
  const bookingId = Number(req.params.bookingId);

  if (!bookingId) {
    return res.sendStatus(httpStatus.FORBIDDEN);
  }

  try {
    const booking = await bookingService.putBooking(userId, roomId);
    return res.status(httpStatus.OK).send({ bookingId: booking.id });
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    return res.sendStatus(httpStatus.FORBIDDEN);
  }
}
