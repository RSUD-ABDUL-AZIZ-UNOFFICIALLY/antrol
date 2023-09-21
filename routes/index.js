
const express = require("express");
const routes = express.Router();

const controller = require('../controllers');
const middleware = require('../middleware');

routes.get('/auth', controller.auth);
routes.get('/statusantrean', middleware.check, controller.statusantrean);
routes.get('/ambilantrean', middleware.check, controller.ambilantrean);
routes.get('/checkinantrean', middleware.check, controller.checkinantrean);
routes.get('/sisaantrean', middleware.check, controller.sisaantrean);
module.exports = routes;

