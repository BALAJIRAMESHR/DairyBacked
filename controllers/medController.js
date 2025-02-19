const connection = require("../connection.js");
const { format } = require("date-fns");

exports.getAllMed = async (req, res) => {
  const query = `SELECT * FROM MedAvail`;

  try {
    const [results] = await connection.execute(query);

    if (results.length === 0) {
      return res.status(404).json({ error: "No medicines found" });
    }

    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database query failed" });
  }
};

exports.AddNeedMed = async (req, res) => {
  const { name, type } = req.body;

  if (typeof name !== "string" || typeof type !== "string") {
    return res
      .status(400)
      .json({
        error:
          "Invalid input values. Name and type must be strings, and status must be boolean.",
      });
  }

  const query = `
      INSERT INTO MedNeed (name, type, status)
      VALUES (?, ?, false)`;

  try {
    const [result] = await connection.execute(query, [name, type]);

    return res
      .status(201)
      .json({
        message: "New med record added successfully",
        id: result.insertId,
      });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database query failed" });
  }
};

exports.addMedGiven = async (req, res) => {
  const { treatmentId, medList } = req.body;

  if (!treatmentId || !Array.isArray(medList) || medList.length === 0) {
    return res
      .status(400)
      .json({
        error: "Invalid input values. treatmentId and medList are required.",
      });
  }

  const todayDate = format(new Date(), "yyyy-MM-dd");

  const query = `
      INSERT INTO MedGiven (treatmentid, medid, qty, date)
      VALUES (?, ?, ?, ?)`;

  try {
    const promises = medList.map(async (med) => {
      if (!med.medid || !med.qty) {
        throw new Error("Each med record must contain medid and qty.");
      }
      await connection.execute(query, [
        treatmentId,
        med.medid,
        med.qty,
        todayDate,
      ]);
    });

    await Promise.all(promises);

    return res.status(201).json({ message: "MedGiven records added successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Database query failed", details: err.message });
  }
};
