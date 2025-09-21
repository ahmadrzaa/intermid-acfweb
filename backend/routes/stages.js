const express = require("express");
const router = express.Router();

const STAGES = [
  { id: 0, key: "item",   label: "Item" },
  { id: 1, key: "factor", label: "Factor" },
  { id: 2, key: "action", label: "Action" },
  { id: 3, key: "str",    label: "Scope/Time/Resources" },
  { id: 4, key: "status", label: "Status" },
];

router.get("/", (req, res) => res.json(STAGES));

module.exports = router;
