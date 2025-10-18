const { calcularMetaDiariaMl } = require("../server");

describe("calcularMetaDiariaMl", () => {
  test("devuelve 2000 si el peso es inválido", () => {
    expect(calcularMetaDiariaMl(undefined)).toBe(2000);
    expect(calcularMetaDiariaMl(null)).toBe(2000);
    expect(calcularMetaDiariaMl(0)).toBe(2000);
    expect(calcularMetaDiariaMl("abc")).toBe(2000);
  });

  test("calcula correctamente la meta diaria con peso válido", () => {
    expect(calcularMetaDiariaMl(60)).toBe(2100);
    expect(calcularMetaDiariaMl("72")).toBe(2520);
    expect(calcularMetaDiariaMl(80.4)).toBe(2814);
  });
});
