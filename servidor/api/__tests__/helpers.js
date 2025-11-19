const jwt = require("jsonwebtoken");

function getAdminCookie() {
  const payload = {
    id: 1,
    correo: "admin@test.com",
    rol: "admin",
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return `sessionToken=${token}`;
}

module.exports = { getAdminCookie };
