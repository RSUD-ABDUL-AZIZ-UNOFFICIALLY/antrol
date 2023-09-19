"use strict";
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(express.json());

app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

const routes = require('./routes');
app.use('/bpj', routes);

server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});