
const express = require("express");
const routes = express.Router();

const controller = require('../controllers');

routes.get('/auth', controller.auth);

module.exports = routes;

