const express = require("express");
const { Pool } = require("pg");
const winston = require("winston");
const argon2 = require("argon2");

const app = express();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

const port = process.env.PORT;

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    logger.info("Chequeo de salud exitoso");
    res.send("ok");
  } catch (err) {
    logger.error("Error en /healthz: " + err.message);
    res.status(500).send("db_error");
  }
});

function calcularMetaDiariaMl(pesoKg) {
  const n = Number(pesoKg);
  const meta = !n || n <= 0 ? 2000 : Math.round(n * 35);
  logger.info(`Meta diaria calculada: ${meta} ml (peso ${pesoKg} kg)`);
  return meta;
}

app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, password, sexo, edad, peso_kg } = req.body;
    logger.info(`Intento de registro: ${correo}`);

    if (!nombre || !correo || !password) {
      logger.warn("Campos obligatorios faltantes en registro");
      return res.status(400).json({ error: "nombre, correo y password son obligatorios" });
    }

    const hashedPassword = await argon2.hash(password);

    const meta_diaria_ml = calcularMetaDiariaMl(peso_kg);

    const q = `
      INSERT INTO usuarios
        (nombre, correo, password, sexo, edad, peso_kg, meta_diaria_ml)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at;
    `;
    const vals = [nombre, correo, hashedPassword, sexo || null, edad || null, peso_kg || null, meta_diaria_ml];

    const { rows } = await pool.query(q, vals);
    logger.info(`Usuario registrado con id ${rows[0].id} (${correo})`);
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      logger.warn(`Correo duplicado en registro: ${req.body.correo}`);
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    logger.error("Error al crear usuario: " + err.message);
    return res.status(500).json({ error: "Error al crear usuario" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { correo, password } = req.body;
    logger.info(`Intento de inicio de sesión: ${correo}`);

    if (!correo || !password) {
      logger.warn("Campos obligatorios faltantes en login");
      return res.status(400).json({ error: "correo y password son obligatorios" });
    }

    const q = `
      SELECT id, nombre, correo, password, sexo, edad, peso_kg, meta_diaria_ml, created_at
      FROM usuarios
      WHERE correo = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(q, [correo]);
    const user = rows[0];

    if (!user) {
      logger.warn(`Login fallido (correo no encontrado): ${correo}`);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordOk = await argon2.verify(user.password, password);
    if (!passwordOk) {
      logger.warn(`Login fallido (password incorrecto): ${correo}`);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const { password: _omit, ...publicUser } = user;

    logger.info(`Login exitoso para id ${user.id} (${correo})`);
    return res.status(200).json({
      message: "Inicio de sesión exitoso",
      user: publicUser,
    });

  } catch (err) {
    logger.error("Error en login: " + err.message);
    return res.status(500).json({ error: "Error en inicio de sesión" });
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

    logger.info(`Listando usuarios (q="${q}", limit=${limit}, offset=${offset})`);

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

    logger.info(`Usuarios listados: ${itemsRes.rows.length}/${totalRes.rows[0].total}`);
    res.json({ total: totalRes.rows[0].total, items: itemsRes.rows });
  } catch (err) {
    logger.error("Error listando usuarios: " + err.message);
    res.status(500).json({ error: "Error listando usuarios" });
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
    logger.info("Estadísticas de usuarios generadas");
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error obteniendo stats: " + err.message);
    res.status(500).json({ error: "Error obteniendo stats" });
  }
});

app.get("/api/admin/users/:id", async (req, res) => {
  try {
    logger.info(`Consultando usuario id=${req.params.id}`);
    const { rows } = await pool.query(
      `SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at
       FROM usuarios WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      logger.warn(`Usuario no encontrado id=${req.params.id}`);
      return res.status(404).json({ error: "No encontrado" });
    }
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error obteniendo usuario: " + err.message);
    res.status(500).json({ error: "Error obteniendo usuario" });
  }
});

app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    logger.info(`Actualizando usuario id=${id}`);

    const { nombre, correo, password, sexo, edad, peso_kg } = req.body;

    const { rows: curRows } = await pool.query(
      "SELECT sexo, edad, peso_kg FROM usuarios WHERE id = $1", [id]
    );
    if (curRows.length === 0) {
      logger.warn(`Usuario no encontrado para actualización id=${id}`);
      return res.status(404).json({ error: "No encontrado" });
    }
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
      logger.info(`Sin cambios para usuario id=${id}`);
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
    logger.info(`Usuario actualizado id=${id}`);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      logger.warn(`Correo duplicado al actualizar usuario id=${req.params.id}`);
      return res.status(409).json({ error: "Correo ya registrado" });
    }
    logger.error("Error actualizando usuario: " + err.message);
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});

app.delete("/api/admin/users/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    logger.info(`Eliminación múltiple de usuarios: ${JSON.stringify(ids)}`);

    if (!Array.isArray(ids) || ids.length === 0) {
      logger.warn("No se enviaron IDs para eliminación múltiple");
      return res.status(400).json({ error: "Debe enviar un arreglo 'ids' con al menos un id." });
    }

    const parsed = ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
    if (parsed.length === 0) {
      return res.status(400).json({ error: "Los ids deben ser enteros positivos." });
    }

    const sql = "DELETE FROM usuarios WHERE id = ANY($1::int[]) RETURNING id";
    const { rows } = await pool.query(sql, [parsed]);

    logger.info(`Usuarios eliminados: ${rows.map((r) => r.id).join(", ")}`);
    return res.json({ deleted: rows.map((r) => r.id) });
  } catch (err) {
    logger.error("Error al eliminar usuarios: " + err.message);
    return res.status(500).json({ error: "Error al eliminar usuarios" });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    logger.info(`Eliminando usuario id=${id}`);
    const r = await pool.query("DELETE FROM usuarios WHERE id = $1", [Number(id)]);
    if (r.rowCount === 0) {
      logger.warn(`Usuario no encontrado id=${id}`);
      return res.status(404).json({ error: "No encontrado" });
    }
    logger.info(`Usuario eliminado id=${id}`);
    res.status(204).send();
  } catch (err) {
    logger.error("Error eliminando usuario: " + err.message);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

module.exports = { app, pool, calcularMetaDiariaMl };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API corriendo en http://localhost:${port}`);
  });
}
