const express = require("express");
const { Pool } = require("pg");
const winston = require("winston");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

// === CONFIG JWT ===
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

// === LOGGER ===
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

// === PG ===
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// === MIDDLEWARE ===
app.use(express.json());
app.use(cookieParser());

// LOG DE TODAS LAS REQUESTS
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// === UTILS JWT ===
function signToken(user) {
  const payload = {
    id: user.id,
    correo: user.correo,
    rol: user.rol,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware para rutas protegidas usando COOKIE
function authRequired(req, res, next) {
  const token = req.cookies.sessionToken;

  if (!token) return res.status(401).json({ error: "No autenticado" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    logger.warn("JWT inválido: " + err.message);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.rol !== "admin") {
    return res.status(403).json({ error: "Acceso no autorizado" });
  }
  next();
}

// === HEALTHCHECK ===
app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.send("ok");
  } catch (err) {
    res.status(500).send("db_error");
  }
});

// === LÓGICA ===
function calcularMetaDiariaMl(pesoKg) {
  const n = Number(pesoKg);
  return !n || n <= 0 ? 2000 : Math.round(n * 35);
}

// =========================
//  REGISTRO (crea cookie)
// =========================
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, password, sexo, edad, peso_kg } = req.body;

    if (!nombre || !correo || !password) {
      return res
        .status(400)
        .json({ error: "nombre, correo y password son obligatorios" });
    }

    const hashedPassword = await argon2.hash(password);
    const meta = calcularMetaDiariaMl(peso_kg);

    const q = `
      INSERT INTO usuarios
        (nombre, correo, password, sexo, edad, peso_kg, meta_diaria_ml)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at, rol;
    `;
    const vals = [
      nombre,
      correo,
      hashedPassword,
      sexo || null,
      edad || null,
      peso_kg || null,
      meta,
    ];

    const { rows } = await pool.query(q, vals);
    const user = rows[0];

    const token = signToken(user);

    // Guarda cookie httpOnly
    res.cookie("sessionToken", token, {
      httpOnly: true,
      secure: false, // Cambiar a true en producción HTTPS
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(201).json({
      message: "Usuario creado correctamente",
      user,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    return res.status(500).json({ error: "Error al crear usuario" });
  }
});

// =========================
//  LOGIN (crea cookie)
// =========================
app.post("/api/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    const { rows } = await pool.query(
      `SELECT id, nombre, correo, password, sexo, edad, peso_kg, meta_diaria_ml, created_at, rol
       FROM usuarios
       WHERE correo = $1 LIMIT 1`,
      [correo]
    );

    const user = rows[0];

    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await argon2.verify(user.password, password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = signToken(user);
    const { password: _omit, ...publicUser } = user;

    res.cookie("sessionToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.json({
      message: "Inicio de sesión exitoso",
      user: publicUser,
    });
  } catch (err) {
    return res.status(500).json({ error: "Error en inicio de sesión" });
  }
});

// =========================
//  LOGOUT
// =========================
app.post("/api/logout", (req, res) => {
  res.clearCookie("sessionToken");
  res.json({ message: "Sesión cerrada" });
});

// =========================
//  CRUD ADMIN (protegidos)
// =========================

// LISTA DE USUARIOS
app.get("/api/admin/users", authRequired, adminRequired, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "20"), 100);
    const offset = parseInt(req.query.offset || "0");

    const where = q
      ? `WHERE LOWER(nombre) LIKE LOWER($1) OR LOWER(correo) LIKE LOWER($1)`
      : "";
    const params = q ? [`%${q}%`, limit, offset] : [limit, offset];

    const total = await pool.query(
      `SELECT COUNT(*)::int AS total FROM usuarios ${where}`,
      q ? [params[0]] : []
    );
    const items = await pool.query(
      `SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at, rol
       FROM usuarios
       ${where}
       ORDER BY created_at DESC
       LIMIT $${q ? 2 : 1} OFFSET $${q ? 3 : 2}`,
      params
    );

    res.json({ total: total.rows[0].total, items: items.rows });
  } catch (err) {
    res.status(500).json({ error: "Error listando usuarios" });
  }
});

// STATS
app.get(
  "/api/admin/users/stats",
  authRequired,
  adminRequired,
  async (_req, res) => {
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
      res.status(500).json({ error: "Error obteniendo stats" });
    }
  }
);

// GET UNO
app.get(
  "/api/admin/users/:id",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at, rol
         FROM usuarios WHERE id = $1`,
        [req.params.id]
      );
      if (rows.length === 0)
        return res.status(404).json({ error: "No encontrado" });

      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo usuario" });
    }
  }
);

// PATCH
app.patch(
  "/api/admin/users/:id",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const id = req.params.id;
      const { nombre, correo, password, sexo, edad, peso_kg } = req.body;

      const { rows: curRows } = await pool.query(
        "SELECT sexo, edad, peso_kg FROM usuarios WHERE id = $1",
        [id]
      );
      if (curRows.length === 0)
        return res.status(404).json({ error: "No encontrado" });

      const cur = curRows[0];
      const newSexo = sexo ?? cur.sexo;
      const newEdad = edad ?? cur.edad;
      const newPeso = peso_kg ?? cur.peso_kg;

      let meta =
        sexo !== undefined || edad !== undefined || peso_kg !== undefined
          ? calcularMetaDiariaMl(newPeso)
          : undefined;

      const fields = [];
      const vals = [];
      let idx = 1;

      if (nombre !== undefined) {
        fields.push(`nombre = $${idx++}`);
        vals.push(nombre);
      }
      if (correo !== undefined) {
        fields.push(`correo = $${idx++}`);
        vals.push(correo);
      }
      if (password !== undefined) {
        fields.push(`password = $${idx++}`);
        vals.push(password);
      }
      if (sexo !== undefined) {
        fields.push(`sexo = $${idx++}`);
        vals.push(newSexo);
      }
      if (edad !== undefined) {
        fields.push(`edad = $${idx++}`);
        vals.push(newEdad);
      }
      if (peso_kg !== undefined) {
        fields.push(`peso_kg = $${idx++}`);
        vals.push(newPeso);
      }
      if (meta !== undefined) {
        fields.push(`meta_diaria_ml = $${idx++}`);
        vals.push(meta);
      }

      if (fields.length === 0) {
        const { rows } = await pool.query(
          `SELECT id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at, rol
           FROM usuarios WHERE id = $1`,
          [id]
        );
        return res.json(rows[0]);
      }

      vals.push(id);

      const sql = `
        UPDATE usuarios
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        RETURNING id, nombre, correo, sexo, edad, peso_kg, meta_diaria_ml, created_at, rol;
      `;
      const { rows } = await pool.query(sql, vals);

      res.json(rows[0]);
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Correo ya registrado" });
      }
      res.status(500).json({ error: "Error actualizando usuario" });
    }
  }
);

// DELETE BULK
app.delete(
  "/api/admin/users/bulk-delete",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0)
        return res
          .status(400)
          .json({ error: "Debe enviar un arreglo 'ids' con al menos un id." });

      const parsed = ids
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0);

      if (parsed.length === 0)
        return res
          .status(400)
          .json({ error: "Los ids deben ser enteros positivos." });

      const { rows } = await pool.query(
        "DELETE FROM usuarios WHERE id = ANY($1::int[]) RETURNING id",
        [parsed]
      );

      res.json({ deleted: rows.map((r) => r.id) });
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar usuarios" });
    }
  }
);

// DELETE UNO
app.delete(
  "/api/admin/users/:id",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const id = req.params.id;

      const r = await pool.query("DELETE FROM usuarios WHERE id = $1", [
        Number(id),
      ]);

      if (r.rowCount === 0)
        return res.status(404).json({ error: "No encontrado" });

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Error eliminando usuario" });
    }
  }
);

// EXPORT PARA TESTS
module.exports = { app, pool, calcularMetaDiariaMl };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API corriendo en http://localhost:${port}`);
  });
}
