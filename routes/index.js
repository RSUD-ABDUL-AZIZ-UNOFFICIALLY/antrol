
const express = require("express");
const routes = express.Router();

const controller = require('../controllers');
const middleware = require('../middleware');

routes.get('/auth', controller.auth);
routes.get('/statusantrean', middleware.check, controller.statusantrean);
routes.get('/ambilantrean', middleware.check, controller.ambilantrean);
module.exports = routes;

