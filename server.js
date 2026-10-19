// server.js
// هذا الملف هو خادم الويب المبني بـ Node.js باستخدام مكتبة Express
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// دعم استقبال بيانات JSON في الطلبات
app.use(express.json());

// توفير الملفات الثابتة (HTML, CSS, JS) من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');

const DATA_FILE = path.join(__dirname, 'shapes.json');

// دالة مساعدة لقراءة الأشكال من الملف
function readShapesFromFile() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify([]));
            return [];
        }
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(content || '[]');
    } catch (err) {
        console.error('خطأ أثناء قراءة shapes.json:', err);
        return [];
    }
}

// دالة مساعدة لحفظ الأشكال في الملف
function writeShapesToFile(shapes) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(shapes, null, 2), 'utf-8');
    } catch (err) {
        console.error('خطأ أثناء الكتابة في shapes.json:', err);
    }
}

// API Endpoints
app.get('/api/shapes', (req, res) => {
    const shapes = readShapesFromFile();
    res.json({ success: true, data: shapes });
});

app.post('/api/shapes', (req, res) => {
    const shape = req.body;
    const shapes = readShapesFromFile();
    shapes.push(shape);
    writeShapesToFile(shapes);
    res.json({ success: true, message: 'Shape saved successfully!', shape });
});

app.put('/api/shapes', (req, res) => {
    const shapes = req.body;
    writeShapesToFile(Array.isArray(shapes) ? shapes : []);
    res.json({ success: true, message: 'Shapes updated successfully!' });
});

app.delete('/api/shapes', (req, res) => {
    writeShapesToFile([]);
    res.json({ success: true, message: 'All shapes cleared successfully!' });
});

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` Map Studio Server running successfully!`);
    console.log(` Open URL: http://localhost:${PORT}`);
    console.log(`===============================================`);
});
