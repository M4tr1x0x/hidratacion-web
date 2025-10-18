const mockQuery = jest.fn();
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({ query: mockQuery })),
}));

const request = require("supertest");
const { app } = require("../server");

describe("DELETE /api/admin/users/bulk-delete", () => {
  beforeEach(() => mockQuery.mockReset());

  test("200 → elimina usuarios correctamente", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 3 }] });

    const resp = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .send({ ids: [1, 3] })
      .set("Content-Type", "application/json");

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({ deleted: [1, 3] });

    expect(mockQuery).toHaveBeenCalledWith(
      "DELETE FROM usuarios WHERE id = ANY($1::int[]) RETURNING id",
      [[1, 3]]
    );
  });

  test("400 → cuando el arreglo ids está vacío", async () => {
    const resp = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .send({ ids: [] })
      .set("Content-Type", "application/json");

    expect(resp.status).toBe(400);
    expect(resp.body.error).toBeDefined();
  });

  test("400 → cuando ids no es un arreglo válido", async () => {
    const resp = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .send({ ids: "no_valido" })
      .set("Content-Type", "application/json");

    expect(resp.status).toBe(400);
  });

  test("500 → cuando hay error en base de datos", async () => {
    const resp = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .send({ ids: [9] })
      .set("Content-Type", "application/json");

    expect(resp.status).toBe(500);
    expect(resp.body.error).toBe("Error al eliminar usuarios");
  });
});
