const express = require("express");
const cors = require("cors");
const { init } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.get("/", (req, res) => res.send("INTERMID ACF API OK"));
app.use("/api/auth", require("./routes/auth").router);   // <-- add
app.use("/api/export", require("./routes/export"));      // <-- add
app.use("/api/stages", require("./routes/stages"));
app.use("/api/items", require("./routes/items"));

const PORT = 3001;
init()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`API running → http://localhost:${PORT}`)
    );
  })
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });
