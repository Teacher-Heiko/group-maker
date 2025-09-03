const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.static(__dirname));
app.use(bodyParser.json());

// Endpoint to get student list
app.get('/students/:classId', (req, res) => {
    const classId = req.params.classId;
    const filePath = path.join(__dirname, `${classId}.txt`);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).send('Class file not found');
        }
        res.send(data);
    });
});

// Endpoint to get history
app.get('/history/:classId', (req, res) => {
    const classId = req.params.classId;
    const filePath = path.join(__dirname, `${classId}_history.json`);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.json([]); // Return empty array if no history
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint to save history
app.post('/history/:classId', (req, res) => {
    const classId = req.params.classId;
    const historyData = req.body;
    const filePath = path.join(__dirname, `${classId}_history.json`);
    fs.writeFile(filePath, JSON.stringify(historyData, null, 2), (err) => {
        if (err) {
            return res.status(500).send('Error saving history');
        }
        res.send('History saved successfully');
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
