const connection = require("../connection.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer =require("nodemailer") ;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "akashavt001@gmail.com", 
    pass: "zkgzdnkkmfniuvoe", 
  },
});

exports.getDoctor = async (req, res) => {
    const { clusterid,type } = req.body;
    const query =
      "SELECT Doctor_id AS id, Name AS name, Location, phno AS phno FROM Doctor WHERE clusterid = ? and type= ?";
  
    try {
      const [results] = await connection.execute(query,[clusterid,type]);
      res.json(results);
    } catch (err) {
      console.error("Error fetching doctor data:", err);
      res.status(500).send("Error fetching doctor data");
    }
  }

exports.RegisterDoc = async (req, res) => {
  const { name, location, manager, managerPhno, email, phno, password,type,address,clusterid } = req.body;

  if (!name || !location || !manager || !managerPhno || !email || !phno || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const query = `
      INSERT INTO Doctor (Name, Location, Manager, Manager_phno, email, phno, password, dateofjoin,type,address,clusterid)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(),?,?,?)
    `;
    const [result] = await connection.execute(query, [name, location, manager, managerPhno, email, phno, hashedPassword,type,address,clusterid]);

    res.status(201).json({ message: 'Doctor registered successfully', doctorId: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Database query failed' });
  }
}

exports.GetDocByEmail =async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const query = `
      SELECT * FROM Doctor WHERE email = ?
    `;
    const [results] = await connection.execute(query, [email]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = results[0];
    const isPasswordValid = await bcrypt.compare(password, doctor.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    delete doctor.password;

    return res.json(doctor);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query failed' });
  }
}

exports.GetDocByPhno = async (req, res) => {
  const { phno, password } = req.body;

  if (!phno || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const query = `
      SELECT * FROM Doctor WHERE phno = ?
    `;
    const [results] = await connection.execute(query, [phno]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = results[0];

    const isPasswordValid = await bcrypt.compare(password, doctor.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    delete doctor.password;

    return res.json(doctor);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query failed' });
  }
}

exports.GetDocByID = async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const query = `
      SELECT * FROM Doctor WHERE Doctor_id = ?
    `;
    const [results] = await connection.execute(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = results[0];

    const isPasswordValid = await bcrypt.compare(password, doctor.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    delete doctor.password;

    return res.json(doctor);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query failed' });
  }
}

exports.GetNotById = async (req, res) => {
  const docid = req.params.docid;

  const query = `
    SELECT id, docid, date_time, message, status
    FROM Notification
    WHERE docid = ?`;

  try {
    const [results] = await connection.execute(query, [docid]);

    if (results.length === 0) {
      return res.status(404).json({ error: "No notifications found for the given docid" });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
}

exports.updatePassword = async (req, res) => {
  const doctorId = req.params.doctorId;
  const { password } = req.body;


  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = `
      UPDATE Doctor
      SET password = ?
      WHERE Doctor_id = ?`;

    const [result] = await connection.execute(query, [hashedPassword, doctorId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
}

exports.updatePre = async (req, res) => {
  const {
    Doctor_id,
    emailpromotions = false,
    emailinvoice = false,
    smsinvoice = false,
    smspromotion = false,
    WhatsApp = false,
    pushnotification = false
  } = req.body;

  if (!Doctor_id) {
    return res.status(400).json({ error: 'Doctor_id is required' });
  }

  const query = `
    UPDATE Doctor
    SET emailpromotions = ?,
        emailinvoice = ?,
        smsinvoice = ?,
        smspromotion = ?,
        WhatsApp = ?,
        pushnotification = ?
    WHERE Doctor_id = ?`;

  try {
    const [result] = await connection.execute(query, [
      emailpromotions,
      emailinvoice,
      smsinvoice,
      smspromotion,
      WhatsApp,
      pushnotification,
      Doctor_id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.status(200).json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

exports.resentlink = async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await connection.execute("SELECT * FROM Doctor WHERE email = ?", [email]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const token = jwt.sign({ docId: user.Doctor_id }, 'hello50', {
      expiresIn: "1h",
    });

    const resetLink = `https://your-domain.com/reset-password?token=${token}`;

    await transporter.sendMail({
      from: "akashavt001@gmail.com", // replace with your email
      to: email,
      subject: "Password Reset",
      text: `token: ${token}`,
    });

    return res.json({ success: true, message: "Password reset link sent",token: token });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).json({ success: false, error: error });
  }
}

exports.resetpass = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: "Token and new password are required" });
  }

  try {
    const decoded = jwt.verify(token, 'hello50');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await connection.execute("UPDATE Doctor SET password = ? WHERE Doctor_id = ?", [
      hashedPassword,
      decoded.docId, // Ensure this matches what you put in the JWT payload
    ]);

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).json({ success: false, error: "Failed to reset password" });
  }
}

exports.updatestatus = async (req, res) => {
    const doctorId = req.params.doctorId;
    const { status, reason, availableon } = req.body;

    if (typeof status !== 'boolean') {
        return res.status(400).json({ error: "Status must be a boolean value" });
    }

    try {
        if (!status && (!reason || !availableon)) {
            return res.status(400).json({ error: "Reason and Availableon must be provided when status is false" });
        }

        const query = status 
            ? `UPDATE Doctor SET status = ?, reason = NULL, availableon = NULL WHERE Doctor_id = ?`
            : `UPDATE Doctor SET status = ?, reason = ?, availableon = ? WHERE Doctor_id = ?`;

        const params = status 
            ? [status, doctorId]
            : [status, reason, availableon, doctorId];

        const [result] = await connection.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        res.status(200).json({ message: "Doctor status updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}