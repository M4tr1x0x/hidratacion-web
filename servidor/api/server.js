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

app.get("/api/admin/users", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const offset = parseInt(req.query.offset || "0", 10);
    const orderByAllowed = new Set(["created_at", "nombre", "correo", "meta_diaria_ml"]);
    const orderBy = orderByAllowed.has(req.query.orderBy) ? req.query.orderBy : "created_at";
    const orderDir = (req.query.orderDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where = q ? `WHERE (LOWER(nombre) LIKE LOWER($1) OR LOWER(correo) LIKE LOWER($1))` : "";
    const params = q ? [`%${q}%`, limit, offset] : [limit, offset];

    const totalSql = `SELECT COUNT(*)::int AS total FROM usuarios ${q ? "WHERE (LOWER(nombre) LIKE LOWER($1) OR LOWER(correo) LIKE LOWER($1))" : ""}`;
    const itemsSql = `
      SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at
      FROM usuarios
      ${where}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $${q ? 2 : 1} OFFSET $${q ? 3 : 2};
    `;

    const totalRes = await pool.query(totalSql, q ? [params[0]] : []);
    const itemsRes = await pool.query(itemsSql, params);

    res.json({ total: totalRes.rows[0].total, items: itemsRes.rows });
  } catch (err) {
    console.error("LIST users error:", err);
    res.status(500).json({ error: "Error listando usuarios" });
  }
});

app.get("/api/admin/users/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at
       FROM usuarios WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET user error:", err);
    res.status(500).json({ error: "Error obteniendo usuario" });
  }
});

app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, correo, password, sexo, edad, peso_kg } = req.body;

    const { rows: curRows } = await pool.query(
      "SELECT sexo, edad, peso_kg FROM usuarios WHERE id = $1", [id]
    );
    if (curRows.length === 0) return res.status(404).json({ error: "No encontrado" });
    const cur = curRows[0];

    const newSexo = (sexo !== undefined) ? sexo : cur.sexo;
    const newEdad = (edad !== undefined) ? edad : cur.edad;
    const newPeso = (peso_kg !== undefined) ? peso_kg : cur.peso_kg;

    let meta = undefined;
    if (sexo !== undefined || edad !== undefined || peso_kg !== undefined) {
      meta = calcularMetaDiariaMl(newPeso);
    }

    const fields = [];
    const vals = [];
    let idx = 1;

    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); vals.push(nombre); }
    if (correo !== undefined) { fields.push(`correo = $${idx++}`); vals.push(correo); }
    if (password !== undefined) { fields.push(`password = $${idx++}`); vals.push(password); }
    if (sexo !== undefined) { fields.push(`sexo = $${idx++}`); vals.push(newSexo); }
    if (edad !== undefined) { fields.push(`edad = $${idx++}`); vals.push(newEdad); }
    if (peso_kg !== undefined) { fields.push(`peso_kg = $${idx++}`); vals.push(newPeso); }
    if (meta !== undefined) { fields.push(`meta_diaria_ml = $${idx++}`); vals.push(meta); }

    if (fields.length === 0) {
      const { rows } = await pool.query(
        `SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at FROM usuarios WHERE id = $1`, [id]
      );
      return res.json(rows[0]);
    }

    vals.push(id);
    const sql = `
      UPDATE usuarios
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at;
    `;

    const { rows } = await pool.query(sql, vals);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Correo ya registrado" });
    console.error("PATCH user error:", err);
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM usuarios WHERE id = $1", [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.status(204).send();
  } catch (err) {
    console.error("DELETE user error:", err);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

app.get("/api/admin/users/stats", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_users,
        ROUND(AVG(peso_kg)::numeric, 1) AS avg_peso_kg,
        ROUND(AVG(meta_diaria_ml)::numeric, 0) AS avg_meta_diaria_ml
      FROM usuarios;
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error("STATS error:", err);
    res.status(500).json({ error: "Error obteniendo stats" });
  }
});

app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
