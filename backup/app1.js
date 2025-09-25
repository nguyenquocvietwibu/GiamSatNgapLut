const express = require("express");
const path = require("path");
const https = require("https");

const app = express();
const PORT = 3000;

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoibmd1eWVudmlldDIweHgiLCJhIjoiY21mNm9nOHY4MDV4MTJqczZzc2Z4NXg5cyJ9.buLncJSmP3dH_Pvm_h50nA";

// Phục vụ file HTML + assets
app.use(express.static(path.join(__dirname, "public")));

// Endpoint search box
app.get("/search", (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Thiếu tham số q" });

  const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
    q
  )}&access_token=${MAPBOX_TOKEN}&language=vi`;

  https
    .get(url, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => {
        data += chunk;
      });
      apiRes.on("end", () => {
        try {
          const json = JSON.parse(data);
          res.json(json);
        } catch (err) {
          res.status(500).json({ error: "Parse JSON failed" });
        }
      });
    })
    .on("error", (err) => {
      res.status(500).json({ error: err.message });
    });
});

// Khi truy cập root, trả về file index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
