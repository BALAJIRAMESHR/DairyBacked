const connection = require("../connection.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.postLogin = async (req, res) => {
  const userName = req.body.userName;
  const password = req.body.password;
  const query = "SELECT * FROM Staff WHERE User_Name = ?";

  try {
    const [results] = await connection.execute(query, [userName]);

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = jwt.sign({ staffid: user.Staff_id }, "doitnow", {
      expiresIn: "1d",
    });
    return res.status(200).json({ message: "Login successful", user, token });
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }
};

exports.postRegister = async (req, res) => {
  const userName = req.body.userName;
  const password = req.body.password;
  const query = "SELECT * FROM Staff WHERE User_Name = ?";
  try {
    const [results] = await connection.execute(query, [userName]);
    if (results.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const query = "INSERT INTO Staff (User_Name, Password) VALUES (?,?)";
      await connection.execute(query, [userName, hash]);
      res.status(200).json({ message: "Register successful" });
    } else {
      res.status(401).json({ error: "Username already exists" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }
};

exports.checkToken = async (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(400).json({ error: "Token must be provided" });
  }

  try {
    jwt.verify(token, "doitnow", async function (err, decoded) {
      if (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
      const query = "SELECT * FROM Staff WHERE Staff_id = ?";
      const [results] = await connection.execute(query, [decoded.staffid]);

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const user = results[0];
      return res.json({ staffId: decoded.staffid,user });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
