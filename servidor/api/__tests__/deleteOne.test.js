const mockQuery = jest.fn();
jest.mock("pg", () => ({ Pool: jest.fn(() => ({ query: mockQuery })) }));

const request = require("supertest");
const { app } = require("../server");
const { getAdminCookie } = require("./helpers");

describe("DELETE /api/admin/users/:id", () => {
  let adminCookie;

  beforeAll(() => {
    adminCookie = getAdminCookie();
  });

  beforeEach(() => mockQuery.mockReset());

  test("204 cuando elimina 1 fila", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const r = await request(app)
      .delete("/api/admin/users/123")
      .set("Cookie", adminCookie);

    expect(r.status).toBe(204);
    expect(mockQuery).toHaveBeenCalledWith(
      "DELETE FROM usuarios WHERE id = $1",
      [123]
    );
  });

  test("404 cuando no existe", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const r = await request(app)
      .delete("/api/admin/users/999")
      .set("Cookie", adminCookie);

    expect(r.status).toBe(404);
  });
});
