const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const ORDERS_FILE = path.join(__dirname, 'orders.json');
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const SLIDER_FILE = path.join(__dirname, 'slider.json');

// Initialize files
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([]));
if (!fs.existsSync(SLIDER_FILE)) fs.writeFileSync(SLIDER_FILE, JSON.stringify([]));

// Multer Config for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const BOT_TOKEN = process.env.BOT_TOKEN || '8291119939:AAHodtowSjgnCcTN256ZIVCZUKMNuesxovQ';
const CHAT_ID = process.env.CHAT_ID || '7372428049';

// --- Public APIs ---

app.get('/api/products', (req, res) => {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
    res.json(products);
});

app.get('/api/slider', (req, res) => {
    const slider = JSON.parse(fs.readFileSync(SLIDER_FILE));
    res.json(slider);
});

app.post('/api/order', (req, res) => {
    const { customerName, phone, gov, area, items, total, productIds } = req.body;
    const orderTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Baghdad' });

    // Update Stock
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
    productIds.forEach(id => {
        const p = products.find(x => x.id == id);
        if(p && p.stock > 0) p.stock -= 1;
    });
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

    // Save Order
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
    const newOrder = { id: Date.now(), customerName, phone, gov, area, items, total, time: orderTime };
    orders.push(newOrder);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));

    // Telegram Message
    const waMessage = `السلام عليكم\nفريق Sky Store لتأكيد الطلبات 🤍\n🧾 تفاصيل الطلب:\n📍 المحافظة: ${gov}\n📍 المنطقة: ${area}\n📞 رقم الهاتف: ${phone}\n📦 المنتجات: ${items}\n💰 السعر النهائي: ${total}\n⏰ Order Time: ${orderTime}\n✅ تم تأكيد الطلب\nسيتم تجهيز الطلب وشحنه إلى عنوانكم في أقرب وقت ممكن 🚚\nشكرًا لاختياركم Sky Store 🤍`;
    const encodedWaMessage = encodeURIComponent(waMessage);
    let cleanPhone = phone.startsWith('0') ? '964' + phone.substring(1) : (phone.startsWith('964') ? phone : '964' + phone);
    const waLink = `https://wa.me/${cleanPhone}?text=${encodedWaMessage}`;

    const telegramMessage = `🌟 *طلب جديد من Sky Store* 🌟\n\n👤 *الزبون:* ${customerName}\n📦 *المنتجات:* ${items}\n💰 *الإجمالي:* ${total}\n\n📍 *الموقع:* ${gov} - ${area}\n📞 *الهاتف:* \`${phone}\`\n\n⏰ *Order Time:* ${orderTime}\n\n✅ [تأكيد عبر واتساب](${waLink})`;

    const data = JSON.stringify({ chat_id: CHAT_ID, text: telegramMessage, parse_mode: 'Markdown', disable_web_page_preview: true });
    const request = https.request(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (response) => {
        res.status(response.statusCode === 200 ? 200 : 500).json({ success: response.statusCode === 200 });
    });
    request.on('error', () => res.status(500).json({ success: false }));
    request.write(data);
    request.end();
});

// --- Admin APIs ---

app.get('/api/admin/orders', (req, res) => {
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
    res.json(orders.reverse());
});

// Add Product with Image Upload
app.post('/api/admin/products', upload.single('image'), (req, res) => {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
    const newP = {
        id: Date.now(),
        name: req.body.name,
        price: parseInt(req.body.price),
        discount: parseInt(req.body.discount) || 0,
        stock: parseInt(req.body.stock) || 0,
        img: `/uploads/${req.file.filename}`
    };
    products.push(newP);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true });
});

app.delete('/api/admin/products/:id', (req, res) => {
    let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
    products = products.filter(p => p.id != req.params.id);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    res.json({ success: true });
});

// Slider Management
app.post('/api/admin/slider', upload.single('image'), (req, res) => {
    const slider = JSON.parse(fs.readFileSync(SLIDER_FILE));
    slider.push(`/uploads/${req.file.filename}`);
    fs.writeFileSync(SLIDER_FILE, JSON.stringify(slider, null, 2));
    res.json({ success: true });
});

app.delete('/api/admin/slider/:index', (req, res) => {
    const slider = JSON.parse(fs.readFileSync(SLIDER_FILE));
    slider.splice(req.params.index, 1);
    fs.writeFileSync(SLIDER_FILE, JSON.stringify(slider, null, 2));
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Sky Store running on port ${PORT}`));
