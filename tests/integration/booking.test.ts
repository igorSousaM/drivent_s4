import app, { init } from "@/app";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import supertest from "supertest";
import {
  createBooking,
  createEnrollmentWithAddress,
  createHotel,
  createPayment,
  createRoomWithHotelId,
  createTicket,
  createTicketTypeRemote,
  createTicketTypeWithHotel,
  createTicketTypeWithNoHotel,
  createUser,
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";
import * as jwt from "jsonwebtoken";
import { Hotel, TicketStatus } from "@prisma/client";
import { number } from "joi";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 when there is no Booking for given user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with 200 and Booking data when there is a Booking for given user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        id: createdBooking.id,
        userId: createdBooking.userId,
        roomId: createdBooking.roomId,
        createdAt: createdBooking.createdAt.toISOString(),
        updatedAt: createdBooking.updatedAt.toISOString(),
      });
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 there is no Enrollment for given user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const ticketType = await createTicketTypeWithHotel();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 there is no Ticket for given user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 there is no Payment for given user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when ticket is remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when ticket does not include hotel", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithNoHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when body is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({
        roomId: "X",
      });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if roomId does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id + 1 };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when room does not have capacity", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBookingOcupied = await createBooking(user.id, createdRoom.id);
      const createdBookingOcupied2 = await createBooking(user.id, createdRoom.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 and bookingId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id };

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const body = { roomId: 1 };
    const response = await server.put("/booking/1").send(body);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const body = { roomId: 1 };
    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send(body);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const body = { roomId: 1 };

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send(body);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when body is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.put("/booking/:bookingId").set("Authorization", `Bearer ${token}`).send({
        roomId: "a",
      });

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when roomId does not exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const body = { roomId: createdRoom.id + 1 };
      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 when room does not have capacity", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdOtherRoom = await createRoomWithHotelId(createdHotel.id);

      await createBooking(user.id, createdOtherRoom.id);
      await createBooking(user.id, createdOtherRoom.id);
      const createdBooking = await createBooking(user.id, createdOtherRoom.id);
      const body = { roomId: createdOtherRoom.id };
      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when bookingId is invalid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const createdOtherRoom = await createRoomWithHotelId(createdHotel.id);
      const body = { roomId: createdOtherRoom.id };
      const response = await server.put("/booking/0").set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 when user has not a booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const body = { roomId: createdRoom.id };
      const user2 = await createUser();
      const booking2 = await createBooking(user2.id, createdRoom.id);

      const response = await server.put(`/booking/${booking2.id}`).set("Authorization", `Bearer ${token}`).send(body);

      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 and bookingId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const createdOtherRoom = await createRoomWithHotelId(createdHotel.id);
      const body = { roomId: createdOtherRoom.id };
      const response = await server
        .put(`/booking/${createdBooking.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send(body);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
  });
});
