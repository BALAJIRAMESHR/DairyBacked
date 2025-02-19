const connection = require("../connection.js");

exports.CheckFormer = async (req, res) => {
    const formerId = req.params.farmerId;
    const query = "SELECT COUNT(*) AS count FROM Former WHERE Former_id = ?";
  
    try {
      const [results] = await connection.execute(query, [formerId]);
  
      const exists = results[0].count > 0;
  
      res.json({ exists, id: parseInt(formerId, 10) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err });
    }
  }

exports.getFormerByID = async (req, res) => {
    const formerId = req.params.farmerId;
  
    const query = `
        SELECT f.Former_id as id,
               f.Name as name,
               f.Mobile1 as mobile1,
               f.Mobile2 as mobile2,
               f.Email as email,
               f.Address_line1 as address1,
               f.Address_line2 as address2,
               f.Cow_Count as CowCount,
               v.name as VLCC,
               b.name as BMC,
               c.name as Cluster,
               c.id as Clusterid,
               v.personname as VSP_name,
               v.phno as VSP_phno,
               cw.Cow_id as cowId,
               cw.Breed as Bread,
               cw.Cow_age_year as cowAgeYear,
               cw.Cow_age_month as cowAgeMonth,
               s.Date_Time as serviceDate,
               s.Type as serviceType,
               s.Doctor_id as spid
        FROM Former f
        LEFT JOIN VLCC v ON f.VLCC_id = v.Id
        LEFT JOIN BMC b ON v.BMCid = b.Id
        LEFT JOIN Cluster c ON b.Clusterid = c.Id
        LEFT JOIN Cow cw ON f.Former_id = cw.Former_id
        LEFT JOIN Services s ON cw.Cow_id = s.Cow_id
        WHERE f.Former_id = ?`;
  
    try {
      const [results] = await connection.execute(query, [formerId]);
  
      const formerData = {
        id: results[0]?.id || "",
        name: results[0]?.name || "",
        phno: {
          mobile1: results[0]?.mobile1 || "",
          mobile2: results[0]?.mobile2 || "",
        },
        email: results[0]?.email || "",
        Address: {
          address1: results[0]?.address1 || "",
          address2: results[0]?.address2 || "",
        },
        CowCount: results[0]?.CowCount || 0,
        VLCC: results[0]?.VLCC || "",
        VSP: {
          name: results[0]?.VSP_name || "",
          phno: results[0]?.VSP_phno || "",
        },
        BMC: results[0]?.BMC || "",
        Cluster: results[0]?.Cluster || "",
        Clusterid : results[0]?.Clusterid || "",
        CowList: results.reduce((acc, row) => {
          if (row.cowId) {
            let cow = acc.find((c) => c.id === row.cowId);
            if (!cow) {
              cow = {
                id: row.cowId,
                breed: row.Bread,
                age: {
                  year: row.cowAgeYear,
                  month: row.cowAgeMonth,
                },
                Service: [],
              };
              acc.push(cow);
            }
            if (row.serviceDate && row.serviceType && row.spid) {
              cow.Service.push({
                DateTime: row.serviceDate,
                type: row.serviceType,
                spid: row.spid,
              });
            }
          }
          return acc;
        }, []),
      };
  
      res.json(formerData);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err });
    }
}

exports.preOrder = async (req, res) => {
  const formerId = req.params.farmer_id;

  const getOrdersQuery = `
    SELECT
    o.Bill_id,
    DATE_FORMAT(o.Date_Time, '%d/%m/%Y') AS date,
    vlcc.Name AS VLCC_Name,
    o.Former_id AS formerId,
    SUM(b.Price) AS totalPrice
FROM Feed_Orders o
JOIN Former f ON o.Former_id = f.Former_id
JOIN VLCC vlcc ON f.VLCC_id = vlcc.id
JOIN Bill b ON o.Bill_id = b.Bill_id
JOIN Feed fd ON b.Item_id = fd.Feed_id
WHERE o.Former_id = ?
GROUP BY o.Bill_id
ORDER BY o.Date_Time DESC
LIMIT 3;

  `;

  const getOrderItemsQuery = `
    SELECT
      fd.Feed_id AS id,
      fd.Name AS name,
      fd.Weight AS weight,
      fd.Price AS price,
      b.Qty AS qty
    FROM Bill b
    JOIN Feed fd ON b.Item_id = fd.Feed_id
    WHERE b.Bill_id = ?
  `;

  try {
    const [orderResults] = await connection.execute(getOrdersQuery, [formerId]);

    if (orderResults.length === 0) {
      return res.json({ message: "No orders found for this former" });
    }

    const orders = [];

    for (const order of orderResults) {
      const billId = order.Bill_id;

      const [itemsResults] = await connection.execute(getOrderItemsQuery, [
        billId,
      ]);

      const items = itemsResults.map((item) => ({
        id: item.id,
        name: item.name,
        weight: item.weight,
        price: item.price,
        quantity: item.qty,
      }));

      orders.push({
        date: order.date,
        VLCC: order.VLCC,
        formerId: order.formerId,
        items,
        totalPrice: order.totalPrice,
      });
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err});
  }

};

