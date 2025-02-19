const connection = require("../connection.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.Login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const query = 'SELECT * FROM AdminUser WHERE email = ?';
        const [results] = await connection.execute(query, [email]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const adminUser = results[0];
 
        const isPasswordValid = await bcrypt.compare(password, adminUser.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: adminUser.id }, 'doitnow', { expiresIn: '1d' });

        res.json({ message: 'Login successful',user:adminUser, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

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
        const query = "SELECT * FROM AdminUser WHERE id = ?";
        console.log(decoded);
        const [results] = await connection.execute(query, [decoded.id]);
  
        if (results.length === 0) {
          return res.status(401).json({ error: "Invalid username or password" });
        }
  
        const user = results[0];
        return res.json({ id: decoded.id,user });
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
};

exports.getallFarmer = async (req, res) => {
    console.log("in")
    const query = `
        SELECT 
            f.Former_id,
            f.Name AS FormerName,
            f.Address_line1,
            f.Address_line2,
            f.Address_line3,
            vlcc.Name AS VLCCName,
            vlcc.PersonName AS VLCCPersonName,
            vlcc.phno AS VLCCPhNo,
            bmc.Name AS BMCName,
            cluster.Name AS ClusterName,
            COUNT(cow.cow_id) AS TotalCows,
            t.Ticket_id,
            t.Service_Start_date,
            t.Service_Start_time,
            t.Service_End_date,
            t.Service_End_time,
            t.Type,
            t.SP_Id
        FROM Former f
        LEFT JOIN Cow cow ON f.Former_id = cow.Former_id
        LEFT JOIN VLCC vlcc ON f.VLCC_id = vlcc.id
        LEFT JOIN BMC bmc ON vlcc.BMCid = bmc.id
        LEFT JOIN Cluster cluster ON bmc.Clusterid = cluster.id
        LEFT JOIN Ticket t ON f.Former_id = t.Former_id
        GROUP BY 
            f.Former_id,
            t.Ticket_id
        ORDER BY 
            f.Former_id ASC, t.Ticket_id DESC ;
    `;

    try {
        const [results] = await connection.execute(query);

        // Transform the results into a structured format
        const formers = results.reduce((acc, row) => {
            const {
                Former_id,
                FormerName,
                Address_line1,
                Address_line2,
                Address_line3,
                VLCCName,
                VLCCPersonName,
                VLCCPhNo,
                BMCName,
                ClusterName,
                TotalCows,
                Ticket_id,
                Service_Start_date,
                Service_Start_time,
                Service_End_date,
                Service_End_time,
                Type,
                SP_Id
            } = row;

            if (!acc[Former_id]) {
                acc[Former_id] = {
                    Former_id,
                    Name: FormerName,
                    Address: {
                        Address_line1,
                        Address_line2,
                        Address_line3,
                    },
                    VLCC: {
                        Name: VLCCName,
                        PersonName: VLCCPersonName,
                        PhNo: VLCCPhNo,
                    },
                    BMC: BMCName,
                    Cluster: ClusterName,
                    TotalCows,
                    Tickets: []
                };
            }

            if (Ticket_id) {
                acc[Former_id].Tickets.push({
                    Ticket_id,
                    Service_Start_date,
                    Service_Start_time,
                    Service_End_date,
                    Service_End_time,
                    Type,
                    SP_Id
                });
            }

            return acc;
        }, {});

        res.json(Object.values(formers));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getfeedordercount = async (req, res) => {
    const queryFarmersCount = 'SELECT COUNT(*) AS totalFarmers FROM Former';
    const queryFeeds = `
       SELECT 
            f.Feed_id,
            f.Name,
            f.Weight,
            COALESCE(SUM(b.Qty), 0) AS totalQty
        FROM Feed f
        LEFT JOIN Bill b ON f.Feed_id = b.Item_id
        LEFT JOIN Feed_orders fo ON b.Bill_id = fo.Bill_id AND fo.Status = 0
        GROUP BY f.Feed_id, f.Name, f.Weight
    `;

    try {
        // Get total number of farmers
        const [farmersCountResults] = await connection.query(queryFarmersCount);
        const totalFarmers = farmersCountResults[0].totalFarmers;

        // Get feed details with total quantities from unpaid feed orders
        const [feedsResults] = await connection.query(queryFeeds);

        res.json({
            totalFarmers,
            feeds: feedsResults
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getFarmerdetailsbyStatus = async (req, res) => {
    const status = req.params.status;
    const query = `
        SELECT 
            f.Former_id, 
            f.Name AS formerName,
            vlcc.Name AS vlccName,
            cluster.Name AS clusterName,
            f.Mobile1 AS phno
        FROM Former f
        JOIN VLCC vlcc ON f.VLCC_id = vlcc.id
        JOIN BMC bmc ON vlcc.BMCid = bmc.id
        JOIN Cluster cluster ON bmc.Clusterid = cluster.id
        JOIN Feed_Orders fo ON f.Former_id = fo.Former_id
        WHERE fo.Status = ?
        GROUP BY f.Former_id
        ORDER BY f.Name ASC;
    `;

    try {
        const [results] = await connection.execute(query, [status]);

        if (results.length === 0) {
            return res.status(404).json({ message: "No farmers found with the given status" });
        }

        res.json({ farmers: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getAllfarmerOrder = async (req, res) => {
    const query = `
        SELECT 
            f.Former_id AS farmerId, 
            f.Name AS farmerName, 
            vlcc.Name AS vlccName,
            fo.Bill_id AS feedOrderId,
            DATE_FORMAT(fo.Date_Time, '%d/%m/%Y') AS orderDate,
            SUM(b.Price) AS totalPrice,
            b.Item_id AS itemId,
            b.Qty AS quantity,
            feed.Name AS itemName
        FROM Former f
        JOIN VLCC vlcc ON f.VLCC_id = vlcc.id
        JOIN Feed_Orders fo ON f.Former_id = fo.Former_id
        JOIN Bill b ON fo.Bill_id = b.Bill_id
        JOIN Feed feed ON b.Item_id = feed.Feed_id
        GROUP BY f.Former_id, fo.Bill_id, b.Item_id
        ORDER BY f.Name ASC, fo.Date_Time DESC;
    `;

    try {
        const [results] = await connection.execute(query);

        if (results.length === 0) {
            return res.status(404).json({ message: "No farmers or feed orders found" });
        }

        const groupedResults = results.reduce((acc, row) => {
            const { farmerId, farmerName, vlccName, feedOrderId, orderDate, totalPrice, itemId, quantity, itemName } = row;

            if (!acc[farmerId]) {
                acc[farmerId] = {
                    farmerId,
                    farmerName,
                    vlccName,
                    feedOrders: {}
                };
            }

            if (!acc[farmerId].feedOrders[feedOrderId]) {
                acc[farmerId].feedOrders[feedOrderId] = {
                    feedOrderId,
                    orderDate,
                    totalPrice,
                    items: []
                };
            }

            acc[farmerId].feedOrders[feedOrderId].items.push({
                itemId,
                quantity,
                itemName
            });

            return acc;
        }, {});

        // Convert feedOrders from an object to an array and filter out any null or undefined values
        const formattedResults = Object.values(groupedResults).map(farmer => ({
            ...farmer,
            feedOrders: Object.values(farmer.feedOrders).filter(order => order !== null)
        }));

        res.json(formattedResults);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getALLFeed = async (req,res) => {
    const query = "SELECT * FROM feed";

    try{
        const [results] = await connection.execute(query);

        if (results.length === 0) {
            return res.status(404).json({ message: "No Feed found" });
        }

        res.json(results);

    }catch(error){
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.addFeed = async (req, res) => {
    const { Name, Price, Type, Manufacturer } = req.body;

    if (!Name || !Price || !Type  || !Manufacturer) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
        INSERT INTO Feed ( Name, Price, Type, Manufacturer)
        VALUES ( ?, ?, ?, ?)
    `;

    try {
        const [result] = await connection.execute(query, [ Name, Price, Type, Manufacturer]);
        res.status(201).json({ message: 'Feed created successfully', Feed_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.editFeed = async (req, res) => {
    const Feed_id = parseInt(req.params.Feed_id, 10);
    const { Name, Price, Type, Manufacturer } = req.body;

    if (!Feed_id || isNaN(Feed_id)) {
        return res.status(400).json({ error: 'Invalid Feed_id' });
    }

    const query = `
        UPDATE Feed
        SET Name = COALESCE(?, Name),
            Price = COALESCE(?, Price),
            Type = COALESCE(?, Type),
            Manufacturer = COALESCE(?, Manufacturer)
        WHERE Feed_id = ?
    `;

    try {
        const [result] = await connection.execute(query, [Name, Price, Type, Manufacturer, Feed_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Feed not found' });
        }

        res.json({ message: 'Feed updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getTicketDetails = async (req, res) => {
    try {
        const staffCountQuery = 'SELECT COUNT(*) AS staffCount FROM Staff';
        const [staffCountResult] = await connection.execute(staffCountQuery);
        const staffCount = staffCountResult[0].staffCount;

        const ticketStatusCountQuery = `
            SELECT
                SUM(CASE WHEN Status = 0 THEN 1 ELSE 0 END) AS liveCount,
                SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS pendingCount,
                SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS completed
            FROM Ticket
        `;
        const [ticketStatusCountResult] = await connection.execute(ticketStatusCountQuery);
        const { liveCount, pendingCount, completed } = ticketStatusCountResult[0];

        const ticketTypeLevelQuery = `
            SELECT
                Type,
                Level,
                COUNT(*) AS count
            FROM Ticket
            WHERE Type IN ('AI', 'Veterinary', 'Feed', 'Financial', 'Loan')
            GROUP BY Type, Level
        `;
        const [ticketTypeLevelResult] = await connection.execute(ticketTypeLevelQuery);

        const report = {
            staffCount,
            liveCount,
            pendingCount,
            completed,
            ai: { low: 0, mid: 0, high: 0 },
            vet: { low: 0, mid: 0, high: 0 },
            financial: 0,
            feed: 0
        };

        ticketTypeLevelResult.forEach(row => {
            if (row.Type === 'AI') {
                report.ai[(row.Level).toLowerCase()] = row.count;
            } else if (row.Type === 'Veterinary') {
                report.vet[(row.Level).toLowerCase()] = row.count;
            } else if (row.Type === 'Financial' || row.Type === 'Loan') {
                report.financial += row.count;
            } else if (row.Type === 'Feed') {
                report.feed += row.count;
            }
        });

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getTicket = async (req, res) => {
  
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
        LEFT JOIN Staff s ON t.Assigned_By = s.Staff_Id;
      `;
  
    try {
      const [results] = await connection.execute(query);
  
      const categorizedData = {
        live: [],
        pendingApproval: [],
        completed: []
      };
  
      results.forEach((row) => {
        const ticketData = {
          sNo: row.Ticket_id,
          ticketNumber: row.ticketNumber,
          formerID: row.formerID,
          serviceType: row.serviceType,
          assignedDateTime: row.assignedDateTime,
          assignedBy:  row.assignedBy,
        };
  
        if (row.Status === 0) {
            categorizedData.live.push(ticketData);
        } else if (row.Status === 1) {
            categorizedData.pendingApproval.push(ticketData);
        } else if (row.Status === 2) {
            categorizedData.completed.push(ticketData);
        }
      });
      res.status(200).json(categorizedData);
    } catch (err) {
      return res.status(500).json({ error: "Database error" });
    }
}

exports.getCostTicket =  async (req, res) => {
    const {status}= req.body;
    try {
        // Query to get ticket details for 'Loan' and 'Insurance' with status 1
        const query = `
            SELECT
                t.Ticket_id,
                t.Type,
                f.Name AS Farmer_Name,
                f.Mobile1 AS Farmer_Phno,
                CONCAT(f.Address_line1, ' ', f.Address_line2, ' ', f.Address_line3) AS Address,
                f.Cow_count,
                vlcc.Name AS VLCC_Name,
                cl.Name AS Cluster_Name,
                t.Comments
            FROM Ticket t
            JOIN Former f ON t.Former_id = f.Former_id
            JOIN VLCC vlcc ON f.VLCC_id = vlcc.id
            JOIN BMC bmc on vlcc.BMCid = bmc.id
            JOIN Cluster cl ON bmc.Clusterid = cl.Id
            WHERE t.Type IN ('Loan', 'Insurance') AND t.Status = ?
        `;

        const [results] = await connection.execute(query,[status]);

        if (results.length === 0) {
            return res.status(404).json({ message: "No tickets found with the given criteria" });
        }

        // Separate results into 'Loan' and 'Insurance'
        const tickets = {
            loan: [],
            insurance: []
        };

        results.forEach(ticket => {
            if (ticket.Type === 'Loan') {
                tickets.loan.push(ticket);
            } else if (ticket.Type === 'Insurance') {
                tickets.insurance.push(ticket);
            }
        });

        res.json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.addAdmin = async (req, res) => {
    const { name, email, phno, password, type } = req.body;

    if (!name || !email || !phno || !password || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO AdminUser (name, status, email, phno, password, type)
            VALUES (?, false, ?, ?, ?, ?)
        `;

        const [result] = await connection.execute(query, [
            name,
            email,
            phno,
            hashedPassword,
            type
        ]);

        res.status(201).json({ message: "Admin added successfully", adminId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getAdmin = async (req, res) => {
    try {
        // SQL query to get all admins
        const query = `
            SELECT
                Id AS adminId,
                Name AS name,
                Status AS status,
                Email AS email,
                lastLogin,
                Phno AS phoneNumber,
                Type AS type
            FROM AdminUser
        `;

        const [results] = await connection.execute(query);

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.updatetype = async (req, res) => {
    const adminId = parseInt(req.params.id, 10);
    const { type } = req.body;

    if (!Number.isInteger(adminId) || !Number.isInteger(type)) {
        return res.status(400).json({ error: "Invalid input data" });
    }

    try {
        // SQL query to update the type of the admin
        const query = `
            UPDATE AdminUser
            SET Type = ?
            WHERE Id = ?
        `;

        const [result] = await connection.execute(query, [type, adminId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }

        res.json({ message: "Admin type updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.getdocdetails = async (req, res) => {
    try {
        // SQL query to get all doctor details
        const query = `
             SELECT 
                d.Doctor_id,
                d.Name,
                d.Type,
                d.Email,
                d.Phno,
                d.Status,
                d.Reason,
                d.Availableon,
                c.Name AS ClusterName
            FROM Doctor d
            LEFT JOIN Cluster c ON d.Clusterid = c.Id
        `;

        const [results] = await connection.execute(query);

        // Categorize doctors into two lists based on status
        const doctorsByStatus = results.reduce((acc, doctor) => {
            if (doctor.Status === 0) {
                acc.UnAvailable.push({
                    Doctor_id: doctor.Doctor_id,
                    Name: doctor.Name,
                    Type: doctor.Type,
                    Email: doctor.Email,
                    Phno: doctor.Phno,
                    Reason: doctor.Reason,
                    Availableon: doctor.Availableon,
                    ClusterName: doctor.ClusterName
                });
            } else if (doctor.Status === 1) {
                acc.Availabe.push({
                    Doctor_id: doctor.Doctor_id,
                    Name: doctor.Name,
                    Type: doctor.Type,
                    Email: doctor.Email,
                    Phno: doctor.Phno,
                    ClusterName: doctor.ClusterName
                });
            }
            return acc;
        }, { UnAvailable: [], Availabe: [] });

        res.json(doctorsByStatus);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

exports.addfarmer = async (req, res) => {
    const { name, mobile1, mobile2, email, address_line1, address_line2, address_line3, VLCC_id } = req.body;

    if (!name || !mobile1 || !email || !address_line1 || !VLCC_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            INSERT INTO Former (Name, Mobile1, Mobile2, Email, Address_line1, Address_line2, Address_line3, VLCC_id,Cow_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const [result] = await connection.execute(query, [
            name,
            mobile1,
            mobile2,
            email,
            address_line1,
            address_line2,
            address_line3,
            VLCC_id
        ]);

        res.status(201).json({ message: 'Former added successfully', formerId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.addcow = async (req, res) => {
    const { farmer_id, breed, cow_age_year, cow_age_month } = req.body;

    if (!farmer_id || !breed || cow_age_year === undefined || cow_age_month === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {

        const queryInsertCow = `
            INSERT INTO Cow (Former_id, Breed, Cow_Age_year, Cow_age_month)
            VALUES (?, ?, ?, ?)
        `;

        const [resultInsertCow] = await connection.execute(queryInsertCow, [
            farmer_id,
            breed,
            cow_age_year,
            cow_age_month
        ]);

        const queryUpdateFarmer = `
            UPDATE Former
            SET Cow_count = Cow_count + 1
            WHERE Former_id = ?
        `;

        await connection.execute(queryUpdateFarmer, [farmer_id]);

        res.status(201).json({ message: 'Cow added successfully', cowId: resultInsertCow.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.addVLCC = async (req, res) => {
    const { name, personname, email, phno, BMCid } = req.body;

    if (!name || !personname || !email || !phno || !BMCid) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
        INSERT INTO VLCC (Name, Personname, Email, Phno, BMCid)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await connection.execute(query, [
            name,
            personname,
            email,
            phno,
            BMCid
        ]);

        res.status(201).json({ message: 'VLCC added successfully', VLCC_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.getallVLCC = async (req, res) => {
    const query = `
        SELECT 
            v.id AS VLCC_id,
            v.Name AS VLCC_name,
            v.Personname AS VLCC_personname,
            v.Email AS VLCC_email,
            v.Phno AS VLCC_phno,
            COUNT(f.Former_id) AS total_farmers
        FROM VLCC v
        LEFT JOIN Former f ON v.Id = f.VLCC_id
        GROUP BY v.id
    `;

    try {
        const [results] = await connection.query(query);

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.addBMC = async (req, res) => {
    const { name, personname, email, phno, clusterid } = req.body;

    if (!name || !personname || !email || !phno || !clusterid) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        INSERT INTO BMC (Name, Personname, Email, Phno, Clusterid)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await connection.execute(query, [name, personname, email, phno, clusterid]);

        res.status(201).json({ message: 'BMC added successfully', bmcId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.editBMC = async (req, res) => {
    const bmcId = req.params.id;
    const { name, personname, email, phno } = req.body;

    if (!name || !personname || !email || !phno ) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        UPDATE BMC 
        SET Name = ?, Personname = ?, Email = ?, Phno = ?
        WHERE id = ?
    `;

    try {
        const [result] = await connection.execute(query, [name, personname, email, phno, bmcId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'BMC not found' });
        }

        res.status(200).json({ message: 'BMC updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.getBMC = async (req, res) => {
    const query = `
        SELECT 
            bmc.Id AS bmcId,
            bmc.Name AS bmcName,
            bmc.Personname AS bmcPersonName,
            bmc.Email AS bmcEmail,
            bmc.Phno AS bmcPhone,
            COUNT(DISTINCT vlcc.Id) AS totalVLCCs,
            COUNT(DISTINCT f.Former_id) AS totalFarmers
        FROM BMC bmc
        LEFT JOIN VLCC vlcc ON vlcc.BMCid = bmc.Id
        LEFT JOIN Former f ON f.VLCC_id = vlcc.Id
        GROUP BY bmc.Id, bmc.Name, bmc.Personname, bmc.Email, bmc.Phno
        ORDER BY bmc.Id;
    `;

    try {
        const [rows] = await connection.query(query);

        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.addcluster = async (req, res) => {
    const { name, personname, email, phno } = req.body;

    if (!name || !personname || !email || !phno) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        INSERT INTO Cluster (Name, Personname, Email, Phno)
        VALUES (?, ?, ?, ?)
    `;

    try {
        const [result] = await connection.query(query, [name, personname, email, phno]);
        res.status(201).json({ message: 'Cluster added successfully', clusterId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.editcluster = async (req, res) => {
    const { id } = req.params;
    const { name, personname, email, phno } = req.body;

    if (!name || !personname || !email || !phno) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        UPDATE Cluster
        SET Name = ?, Personname = ?, Email = ?, Phno = ?
        WHERE Id = ?
    `;

    try {
        const [result] = await connection.query(query, [name, personname, email, phno, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cluster not found' });
        }

        res.status(200).json({ message: 'Cluster updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.getallcluster = async (req, res) => {
    const query = `
        SELECT 
            c.Id AS clusterId,
            c.Name AS clusterName,
            c.Personname AS clusterPersonName,
            c.Email AS clusterEmail,
            c.Phno AS clusterPhone,
            COUNT(DISTINCT bmc.Id) AS totalBMCs,
            COUNT(DISTINCT vlcc.Id) AS totalVLCCs,
            COUNT(DISTINCT f.Former_id) AS totalFarmers
        FROM Cluster c
        LEFT JOIN BMC bmc ON bmc.Clusterid = c.Id
        LEFT JOIN VLCC vlcc ON vlcc.BMCid = bmc.Id
        LEFT JOIN Former f ON f.VLCC_id = vlcc.Id
        GROUP BY c.Id, c.Name, c.Personname, c.Email, c.Phno
        ORDER BY c.Id;
    `;

    try {
        const [rows] = await connection.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.addstaff = async (req, res) => {
    const userName = req.body.userName;
    const password = req.body.password;
    const email = req.body.email;
    const phno =req.body.phno;
    const query = "SELECT * FROM Staff WHERE User_Name = ?";
    try {
      const [results] = await connection.execute(query, [userName]);
      if (results.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const query = "INSERT INTO Staff (User_Name, Password,email,phno) VALUES (?,?,?,?)";
        await connection.execute(query, [userName, hash,email,phno]);
        res.status(200).json({ message: "Register successful" });
      } else {
        res.status(401).json({ error: "Username already exists" });
      }
    } catch (err) {
      return res.status(500).json({ error: "Database error" });
    }
};

exports.editstaff = async (req, res) => {
    const { id } = req.params;
    const { User_name, email, phno } = req.body;

    if (!User_name || !email || !phno) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        UPDATE Staff
        SET User_Name = ?, Email = ?, Phno = ?
        WHERE Staff_id = ?
    `;

    try {
        const [result] = await connection.query(query, [User_name, email, phno, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.status(200).json({ message: 'Staff member updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.getAllStaff = async (req, res) => {
    const query = `
        SELECT Staff_id, User_Name, Email, Phno, Lastlogin
        FROM Staff
        ORDER BY Staff_id;
    `;

    try {
        const [rows] = await connection.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.adddoc = async (req, res) => {
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

exports.edidoc = async (req, res) => {
    const { id } = req.params;
    const { name, type, email, phno, clusterId, bmcId, address } = req.body;

    if (!name || !type || !email || !phno || !clusterId || !bmcId || !address) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        UPDATE Doctor
        SET 
            Name = ?, 
            Type = ?, 
            Email = ?, 
            Phno = ?, 
            Clusterid = ?, 
            BMCid = ?, 
            Address = ?
        WHERE 
            Doctor_id = ?
    `;

    try {
        const [result] = await connection.promise().query(query, [name, type, email, phno, clusterId, bmcId, address, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.status(200).json({ message: 'Doctor details updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.getalldoc = async (req, res) => {
    const query = `
        SELECT 
            d.Doctor_id AS doctorId,
            d.Name AS doctorName,
            c.Name AS clusterName,
            v.Name AS vlccName,
            d.Type AS doctorType,
            d.Email AS email,
            d.Phno AS phone,
            d.Address AS address,
            v.Personname AS vlccPersonName,
            v.Phno AS vlccPhno,
            d.Manager AS managerName,
            d.Manager_phno AS managerPhno,
            t.Ticket_id AS ticketId,
            DATE_FORMAT(t.Service_start_date, '%d/%m/%Y') AS startDate,
            TIME_FORMAT(t.Service_start_time, '%H:%i:%s') AS startTime,
            DATE_FORMAT(t.Service_end_date, '%d/%m/%Y') AS endDate,
            TIME_FORMAT(t.Service_end_time, '%H:%i:%s') AS endTime,
            tr.Price AS treatmentPrice,
            tr.Formerid AS farmerId
        FROM 
            Doctor d
        LEFT JOIN 
            Cluster c ON d.Clusterid = c.Id
        LEFT JOIN 
            VLCC v ON c.id = v.bmcid
        LEFT JOIN 
            Ticket t ON t.Sp_id = d.Doctor_id
        LEFT JOIN 
            Treatment tr ON tr.Ticketid = t.Ticket_id
        ORDER BY 
            d.Doctor_id, t.Ticket_id;
    `;

    try {
        const [rows] = await connection.query(query);

        const doctors = {};

        rows.forEach(row => {
            const { doctorId, doctorName, clusterName, vlccName, doctorType, email, phone, address, vlccPersonName, vlccPhno, managerName, managerPhno, ticketId, startDate, startTime, endDate, endTime, treatmentPrice, farmerId } = row;

            if (!doctors[doctorId]) {
                doctors[doctorId] = {
                    doctorId,
                    doctorName,
                    clusterName,
                    vlccName,
                    doctorType,
                    email,
                    phone,
                    address,
                    vlccPersonName,
                    vlccPhno,
                    managerName,
                    managerPhno,
                    tickets: []
                };
            }

            if (ticketId) {
                doctors[doctorId].tickets.push({
                    ticketId,
                    startDate,
                    startTime,
                    endDate,
                    endTime,
                    treatmentPrice,
                    farmerId
                });
            }
        });

        res.status(200).json(Object.values(doctors));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}