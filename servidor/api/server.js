const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT;

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

app.use(express.json());

app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("ok");
  } catch {
    res.status(500).send("db_error");
  }
});

function calcularMetaDiariaMl(pesoKg) {
  const n = Number(pesoKg);
  if (!n || n <= 0) return 2000;
  return Math.round(n * 35);
}

app.post("/api/registro", async (req, res) => {
  try {
    const { nombre, correo, password, sexo, edad, peso_kg } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: "nombre, correo y password son obligatorios" });
    }

    const meta_diaria_ml = calcularMetaDiariaMl(peso_kg);

    const q = `
      INSERT INTO usuarios
        (nombre, correo, password, sexo, edad, peso_kg, meta_diaria_ml)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at;
    `;
    const vals = [nombre, correo, password, sexo || null, edad || null, peso_kg || null, meta_diaria_ml];

    const { rows } = await pool.query(q, vals);
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err && err.code === "23505") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    console.error(err);
    return res.status(500).json({ error: "Error al crear usuario" });
  }
});

app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
