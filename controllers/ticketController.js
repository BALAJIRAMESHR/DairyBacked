const connection = require("../connection.js");

exports.getTicket = async (req, res) => {
    const staffId = req.params.staffId;
  
    const query = `
        SELECT 
          t.Ticket_id AS ticketNumber, 
          t.Former_ID AS formerID, 
          t.Type AS serviceType, 
          t.Assigned_Date_Time AS assignedDateTime, 
          s.User_Name AS assignedBy, 
          t.Assigned_By as value,
          t.Status
        FROM Ticket t
        LEFT JOIN Staff s ON t.Assigned_By = s.Staff_Id
        WHERE t.Assigned_By = ? OR t.Assigned_By != ?;
      `;
  
    try {
      const [results] = await connection.execute(query, [staffId, staffId]);
  
      const categorizedData = {
        live: {
          assignedByYou: [],
          assignedByOthers: [],
        },
        pendingApproval: {
          assignedByYou: [],
          assignedByOthers: [],
        },
        completed: {
          assignedByYou: [],
          assignedByOthers: [],
        },
      };
  
      results.forEach((row) => {
        const ticketData = {
          sNo: row.Ticket_id,
          ticketNumber: row.ticketNumber,
          formerID: row.formerID,
          serviceType: row.serviceType,
          assignedDateTime: row.assignedDateTime,
          assignedBy: row.value == staffId ? "You" : row.assignedBy,
        };
  
        if (row.Status === 0) {
          if (row.value == staffId) {
            categorizedData.live.assignedByYou.push(ticketData);
          } else {
            categorizedData.live.assignedByOthers.push(ticketData);
          }
        } else if (row.Status === 1) {
          if (row.value == staffId) {
            categorizedData.pendingApproval.assignedByYou.push(ticketData);
          } else {
            categorizedData.pendingApproval.assignedByOthers.push(ticketData);
          }
        } else if (row.Status === 2) {
          if (row.value == staffId) {
            categorizedData.completed.assignedByYou.push(ticketData);
          } else {
            categorizedData.completed.assignedByOthers.push(ticketData);
          }
        }
      });
      res.status(200).json(categorizedData);
    } catch (err) {
      return res.status(500).json({ error: "Database error" });
    }
  }

exports.getTicketById = async (req, res) => {
    const ticketId = req.params.ticketId;
  
    const query = `
      SELECT t.Status as status,
             t.Former_ID as formerID,
             t.Name as name,
             t.Type as type,
             t.SP_ID as spId,
             s.User_Name as AssignedBy,
             t.Ticket_Raised_status as TicketRaisedStatus,
             t.Ticket_Raised_date as TicketRaisedDate,
             t.Ticket_Raised_time as TicketRaisedTime,
             t.SP_Approval_status as SPApprovalStatus,
             t.SP_Approval_date as SPApprovalDate,
             t.SP_Approval_time as SPApprovalTime,
             t.Service_Start_status as ServiceStartStatus,
             t.Service_Start_date as ServiceStartDate,
             t.Service_Start_time as ServiceStartTime,
             t.Service_End_status as ServiceEndStatus,
             t.Service_End_date as ServiceEndDate,
             t.Service_End_time as ServiceEndTime
      FROM Ticket t
      JOIN Staff s ON t.Assigned_By = s.Staff_Id
      WHERE t.Ticket_id = ?`;
  
    try {
      const [results] = await connection.execute(query, [ticketId]);
  
      if (results.length === 0) {
        return res.status(404).json({ error: "Ticket not found" });
      }
  
      const ticket = results[0];
      const response = {
        status: ticket.status,
        formerID: ticket.formerID,
        name: ticket.name,
        type: ticket.type,
        AssignedBy: ticket.AssignedBy,
        TicketRaised: {
          status: ticket.TicketRaisedStatus,
          Date: ticket.TicketRaisedDate,
          time: ticket.TicketRaisedTime,
        },
        SPApproval: {
          status: ticket.SPApprovalStatus,
          Date: ticket.SPApprovalDate,
          time: ticket.SPApprovalTime,
        },
        ServiceStart: {
          status: ticket.ServiceStartStatus,
          Date: ticket.ServiceStartDate,
          time: ticket.ServiceStartTime,
        },
        ServiceEnd: {
          status: ticket.ServiceEndStatus,
          Date: ticket.ServiceEndDate,
          time: ticket.ServiceEndTime,
        },
        spid:null,
      };
  
      if (ticket.spId !== null) {
        const doctorQuery = `
          SELECT d.Name as doctorName,
                 d.Location as doctorLocation,
                 d.phno as doctorPhno,
                 d.Manager as manager,
                 d.Manager_phno as managerPhno
          FROM Doctor d
          WHERE d.Doctor_id = ?`;
  
        const [doctorResults] = await connection.execute(doctorQuery, [ticket.spId]);
  
        if (doctorResults.length > 0) {
          const doctor = doctorResults[0];
          response.spId = ticket.spId;
          response.address = {
            line1: doctor.doctorName,
            line2: doctor.doctorLocation,
            line3: `Ph: ${doctor.doctorPhno}`,
            line4: `Manager: ${doctor.manager}`,
            line5: `Ph: ${doctor.managerPhno}`,
          };
        }
      }
  
      res.json(response);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Database query failed" });
    }
  }
  
exports.createTicketForDoc = async (req, res) => {
  const { Former_id, Type, SP_Id, Assigned_By, cow_id, Comments, Level } = req.body;
  if (!Former_id || !Type || !SP_Id || !Assigned_By) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const validTypes = ["AI", "Veterinary", "Feed", "Loan", "Insurance"];
    if (!validTypes.includes(Type)) {
      return res.status(400).json({ error: "Invalid Type" });
    }

    const [formerResults] = await connection.execute(
      "SELECT Name, Address_line1, Address_line2, Address_line3 FROM Former WHERE Former_id = ?",
      [Former_id]
    );

    if (formerResults.length === 0) {
      return res.status(400).json({ error: "Invalid Former_id" });
    }

    const { Name, Address_line1, Address_line2, Address_line3 } = formerResults[0];

    const Status = 1;
    const Assigned_Date_Time = new Date();
    const Ticket_Raised_status = 1;
    const Ticket_Raised_date = new Date().toISOString().split("T")[0];
    const Ticket_Raised_time = new Date().toTimeString().split(" ")[0];

    const mes = "Your appointment with " + Name + " on " + Ticket_Raised_date + " at " + Ticket_Raised_time + " has been Assigned";

    const query = `
      INSERT INTO Ticket (
        cow_id, Status, Former_id, Name, Type, SP_Id, Address, Assigned_By, Assigned_Date_Time, 
        Ticket_Raised_status, Ticket_Raised_date, Ticket_Raised_time, SP_Approval_status, Service_Start_status, Service_End_status, Comments, Level
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
    `;

    const [result] = await connection.execute(query, [
      cow_id,
      Status,
      Former_id,
      Name,
      Type,
      SP_Id,
      Address_line1 + Address_line2 + Address_line3,
      Assigned_By,
      Assigned_Date_Time,
      Ticket_Raised_status,
      Ticket_Raised_date,
      Ticket_Raised_time,
      Comments,
      Level,
    ]);

    const q1 = `
      INSERT INTO Notification (docid, message, status)
      VALUES (?, ?, ?)
    `;

    await connection.execute(q1, [SP_Id, mes, false]);

    const Ticket_id = result.insertId;
    res.status(201).json({ message: "Ticket created successfully", Ticket_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketByFormerId = async (req, res) => {
  const formerId = req.params.former_id;

  const query = `
    SELECT Ticket_id,
           CASE 
             WHEN Status = 0 THEN 'live'
             WHEN Status = 1 THEN 'pendingApproval'
             WHEN Status = 2 THEN 'completed'
           END AS Status,
           Type,
           Comments
    FROM Ticket
    WHERE Former_id = ?`;

  try {
    const [results] = await connection.execute(query, [formerId]);

    res.json(results);
  } catch (err) {
    res.status(500).send('Server error');
  }
}

exports.createTicketForFeed = async (req,res) => {
  const { Former_id, Type, Assigned_By, comments } = req.body;
  
    try {
      const validTypes = ["AI", "Veterinary", "Feed","Loan","Insurance"];
      if (!validTypes.includes(Type)) {
        return res.status(400).json({ error: "Invalid Type" });
      }
  
      const [formerResults] = await connection.execute(
        "SELECT Name, Address_line1,Address_line2,Address_line3 FROM Former WHERE Former_id = ?",
        [Former_id]
      );
  
      if (formerResults.length === 0) {
        return res.status(400).json({ error: "Invalid Former_id" });
      }
  
      const { Name, Address_line1, Address_line2, Address_line3 } = formerResults[0];
  
      const Status = 1;
      const Assigned_Date_Time = new Date();
      const Ticket_Raised_status = 1;
      const Ticket_Raised_date = new Date().toISOString().split("T")[0];
      const Ticket_Raised_time = new Date().toTimeString().split(" ")[0];
  
      const query = `
        INSERT INTO Ticket (
          Status, Former_id, Name, Type, Address, Assigned_By, Assigned_Date_Time, 
          Ticket_Raised_status, Ticket_Raised_date, Ticket_Raised_time , SP_Approval_status, Service_Start_status, Service_End_status,Comments
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,0,0,0,?)
      `;
  
      const [result] = await connection.execute(query, [
        Status,
        Former_id,
        Name,
        Type,
        Address_line1+Address_line2+Address_line3,
        Assigned_By,
        Assigned_Date_Time,
        Ticket_Raised_status,
        Ticket_Raised_date,
        Ticket_Raised_time,
        comments,
      ]);
  
      const Ticket_id = result.insertId;
      res.status(201).json({ message: "Ticket created successfully", Ticket_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
}

exports.getTicketBySpId = async (req, res) => {
  const spId = req.params.spId;

  const query = `
    SELECT 
      t.Ticket_id, 
      t.Status, 
      t.cow_id, 
      t.Former_id, 
      t.Name, 
      t.Type, 
      t.Address, 
      t.Comments,
      t.SP_Approval_status,
      t.SP_Approval_date,
      t.SP_Approval_time,
      t.Service_Start_status,
      t.Service_Start_date,
      t.Service_Start_time,
      t.Service_End_status,
      t.Service_End_date,
      t.Service_End_time,
      t.Ticket_Raised_status, 
      t.Ticket_Raised_date, 
      t.Level,
      DATE(t.Assigned_Date_Time) as Assigned_Date,
      f.Mobile1, 
      f.Mobile2, 
      vlcc.Name as VLCC,
      tr.price
    FROM Ticket t
    JOIN Former f ON t.Former_id = f.Former_id
    LEFT JOIN VLCC vlcc ON f.VLCC_id = vlcc.id
    LEFT JOIN Treatment tr ON t.Ticket_id = tr.ticketid
    WHERE t.SP_Id = ?
    ORDER BY t.Assigned_Date_Time`;

  try {
    const [results] = await connection.execute(query, [spId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "No tickets found for the given SP Id" });
    }

    const groupedResults = results.reduce((acc, ticket) => {
      const assignedDate = ticket.Assigned_Date;
      if (!acc[assignedDate]) {
        acc[assignedDate] = [];
      }
      acc[assignedDate].push({
        Ticket_id: ticket.Ticket_id,
        Status: ticket.Status,
        cow_id: ticket.cow_id,
        Former_id: ticket.Former_id,
        Name: ticket.Name,
        Type: ticket.Type,
        Address: ticket.Address,
        Ticket_Raised_status: ticket.Ticket_Raised_status,
        Ticket_Raised_date: ticket.Ticket_Raised_date,
        Mobile1: ticket.Mobile1,
        Mobile2: ticket.Mobile2,
        Comments: ticket.Comments,
        VLCC: ticket.VLCC,
        SP_Approval_status: ticket.SP_Approval_status,
        SP_Approval_date: ticket.SP_Approval_date,
        SP_Approval_time: ticket.SP_Approval_time,
        Service_Start_status: ticket.Service_Start_status,
        Service_Start_date: ticket.Service_Start_date,
        Service_Start_time: ticket.Service_Start_time,
        Service_End_status: ticket.Service_End_status,
        Service_End_date: ticket.Service_End_date,
        Service_End_time: ticket.Service_End_time,
        Level: ticket.Level,
        price: ticket.price // Include the price from the Treatment table
      });
      return acc;
    }, {});

    res.json(groupedResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
}

exports.updateApprovalStatus = async (req,res) =>{
  const ticketId = req.params.ticketId;
  const { SP_Approval_status } = req.body;

  if (typeof SP_Approval_status !== 'boolean') {
    return res.status(400).json({ error: "Invalid SP_Approval_status value" });
  }
  const SP_Approval_date = new Date().toISOString().split('T')[0]; 
  const SP_Approval_time = new Date().toTimeString().split(' ')[0];
  if (SP_Approval_status){
      const query = `
    UPDATE Ticket
    SET Status = 0,
        SP_Approval_status = ?,
        SP_Approval_date = ?,
        SP_Approval_time = ?
    WHERE Ticket_id = ?`;
  }else{
      const query = `
    UPDATE Ticket
    SET Status = 3,
        SP_Approval_status = ?,
        SP_Approval_date = ?,
        SP_Approval_time = ?
    WHERE Ticket_id = ?`;
  }

  try {
    const [result] = await connection.execute(query, [SP_Approval_status, SP_Approval_date, SP_Approval_time, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ message: "SP_Approval_status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
}

exports.updateStartstatus = async (req,res) =>{
  const ticketId = req.params.ticketId;
  const { Service_Start_status } = req.body;

  if (typeof Service_Start_status !== 'boolean') {
    return res.status(400).json({ error: "Invalid SP_Approval_status value" });
  }
  const SP_Approval_date = new Date().toISOString().split('T')[0]; 
  const SP_Approval_time = new Date().toTimeString().split(' ')[0];
  const query = `
    UPDATE Ticket
    SET Service_Start_status = ?,
        Service_Start_date = ?,
        Service_Start_time = ?
    WHERE Ticket_id = ?`;

  try {
    const [result] = await connection.execute(query, [Service_Start_status, SP_Approval_date, SP_Approval_time, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ message: "SP_Approval_status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
}

exports.updateEndstatus = async (req,res) =>{
  const ticketId = req.params.ticketId;
  const { Service_End_status } = req.body;

  if (typeof Service_End_status !== 'boolean') {
    return res.status(400).json({ error: "Invalid SP_Approval_status value" });
  }
  const SP_Approval_date = new Date().toISOString().split('T')[0]; 
  const SP_Approval_time = new Date().toTimeString().split(' ')[0];
  const query = `
    UPDATE Ticket
    SET Status = 2,
        Service_End_status = ?,
        Service_End_date = ?,
        Service_End_time = ?
    WHERE Ticket_id = ?`;

  try {
    const [result] = await connection.execute(query, [Service_End_status, SP_Approval_date, SP_Approval_time, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ message: "Service_End_time updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
}

