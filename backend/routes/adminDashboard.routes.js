    const express = require("express");
    const router = express.Router();
    const { getAdminDashboard } = require("../controllers/adminDashboard.controller");
    const auth = require("../middlewares/auth");

    router.get("/admin/dashboard", auth, getAdminDashboard);

    module.exports = router;
