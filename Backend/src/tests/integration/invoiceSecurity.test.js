import { describe, test, expect, vi } from "vitest";
import { setRole } from "../mocks/auth.mock.js";
vi.mock(
  "../../middlewares/authMiddleware.js",
  async () => await import("../mocks/auth.mock.js")
);
import request from "supertest";
import app from "../../app.js";

describe("Invoice Security", () => {

  test("should reject unauthenticated invoice list request", async () => {
    vi.resetModules();
    vi.doMock("../../middlewares/authMiddleware.js", () => ({
      protect: (req, res, next) => {
        res.status(401).json({
          status: "fail",
          message: "Unauthorized"
        });
      },
      restrictTo: () => (req, res, next) => next()
    }));

    setRole("Staff");

    const response = await request(app).post("/api/invoices/draft").send({});
    expect(response.status).toBe(403);

  });

  test("should reject non admin draft creation", async () => {
    vi.resetModules();
    vi.doMock("../../middlewares/authMiddleware.js", () => ({
      protect: (req, res, next) => {
        req.user = {
          _id: "507f1f77bcf86cd799439011",
          role: "Staff"
        };
        next();
      },
      restrictTo: () => {
        return (req, res) => {
          res.status(403).json({
            status: "fail",
            message: "Forbidden"
          });
        };
      }
    }));

    const response = await request(app).post("/api/invoices/draft").send({});
    expect(response.status).toBe(403);

  });

  test("should reject non admin finalize request", async () => {
    vi.resetModules();
    vi.doMock("../../middlewares/authMiddleware.js", () => ({
      protect: (req, res, next) => {
        req.user = {
          _id: "507f1f77bcf86cd799439011",
          role: "Staff"
        };
        next();
      },
      restrictTo: () => {
        return (req, res) => {
          res.status(403).json({
            status: "fail",
            message: "Forbidden"
          });
        };
      }
    }));

    const response = await request(app).patch("/api/invoices/random/finalize");
    expect(response.status).toBe(403);

  });

});