
const express = require("express");
const routes = express.Router();

const controller = require('../controllers');
const middleware = require('../middleware');

routes.get('/auth', controller.auth);
routes.get('/statusantrean', middleware.check, controller.statusantrean);
routes.get('/ambilantrean', middleware.check, controller.ambilantrean);
routes.get('/checkinantrean', middleware.check, controller.checkinantrean);
routes.get('/sisaantrean', middleware.check, controller.sisaantrean);
routes.get('/batalantrean', middleware.check, controller.batalantrean);
routes.get('/jadwaloperasirs', middleware.check, controller.jadwaloperasirs);
module.exports = routes;

