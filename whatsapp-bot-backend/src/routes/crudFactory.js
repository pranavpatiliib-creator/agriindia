const express = require("express");

function crudFactory(Model) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const doc = await Model.create(req.body);
    res.status(201).json(doc);
  });

  router.get("/", async (req, res) => {
    const docs = await Model.find().sort({ createdAt: -1 });
    res.json(docs);
  });

  router.get("/:id", async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

  router.put("/:id", async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  });

  router.delete("/:id", async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  });

  return router;
}

module.exports = crudFactory;
