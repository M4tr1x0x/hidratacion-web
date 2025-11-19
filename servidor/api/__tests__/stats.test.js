const mockQuery = jest.fn();
jest.mock("pg", () => ({ Pool: jest.fn(() => ({ query: mockQuery })) }));

const request = require("supertest");
const { app } = require("../server");
const { getAdminCookie } = require("./helpers"); 

describe("GET /api/admin/users/stats", () => {
  let adminCookie;

  beforeAll(() => {
    adminCookie = getAdminCookie();
  });

  beforeEach(() => mockQuery.mockReset());

  test("ok con totales y promedios", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ total_users: 12, avg_peso_kg: 71.5, avg_meta_diaria_ml: 2390 }],
    });

    const r = await request(app)
      .get("/api/admin/users/stats")
      .set("Cookie", adminCookie);

    expect(r.status).toBe(200);
    expect(typeof r.body.total_users).toBe("number");
    expect(typeof r.body.avg_peso_kg).toBe("number");
    expect(typeof r.body.avg_meta_diaria_ml).toBe("number");
  });
});
