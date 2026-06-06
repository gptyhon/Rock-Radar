const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3003;
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'data.json');
const PIC_DIR = path.join(PUBLIC_DIR, 'assets', 'images');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'assets', 'audio');
const VIDEO_DIR = path.join(PUBLIC_DIR, 'assets', 'video');
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const INVALID_FILENAME_RE = /[<>:"/\\|?*\x00-\x1F]/g;
const RESERVED_BASENAMES = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);
const SPECIAL_IMAGE_SLOTS = {
    door_left: 'gacha_door_left',
    door_right: 'gacha_door_right'
};

// Ensure runtime-writable directories exist when the repo is freshly cloned.
for (const dir of [path.dirname(DATA_FILE), PIC_DIR, AUDIO_DIR, VIDEO_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_DIR, { index: false }));
app.use('/pic', express.static(PIC_DIR, { index: false }));

// Legacy root-level media URLs are kept because data.json and older HTML
// references may still point at music.mp3, music2.mp3, or ending.mp4.
app.get('/:filename(music.mp3|music2.mp3)', (req, res) => {
    res.sendFile(path.join(AUDIO_DIR, req.params.filename));
});

app.get('/:filename(ending.mp4)', (req, res) => {
    res.sendFile(path.join(VIDEO_DIR, req.params.filename));
});

function normalizeRequestedFilename(filename, fallbackName = '') {
    let name = String(filename || '').trim().replace(INVALID_FILENAME_RE, '_');
    name = name.replace(/\s+/g, ' ').replace(/^\.+/, '').replace(/[. ]+$/, '');

    const fallbackExt = path.extname(fallbackName || '');
    const fallbackBase = path.basename(fallbackName || '', fallbackExt) || 'image';

    let ext = path.extname(name);
    let base = ext ? path.basename(name, ext) : name;
    base = base.trim().replace(/[. ]+$/, '');

    if (!ext && fallbackExt) ext = fallbackExt;
    if (!base) base = fallbackBase;
    if (RESERVED_BASENAMES.has(base.toUpperCase())) base = `${base}_`;

    const normalized = `${base}${ext}`.replace(/[. ]+$/, '');
    return normalized;
}

function isValidImageName(filename) {
    return IMAGE_EXT_RE.test(path.extname(filename || ''));
}

function getImageUrl(filename) {
    return `/assets/images/${encodeURIComponent(filename)}`;
}

// multer 配置：保留原始扩展名
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PIC_DIR),
    filename: (req, file, cb) => {
        const slotBaseName = req.params?.slot ? SPECIAL_IMAGE_SLOTS[req.params.slot] : '';
        const requestedName = slotBaseName
            ? `${slotBaseName}${path.extname(file.originalname) || '.png'}`
            : (req.body.filename || file.originalname);
        // 专用槽位上传时直接锁定文件名；普通上传则使用客户端指定的文件名或原始名
        const safeName = normalizeRequestedFilename(requestedName, file.originalname);
        cb(null, safeName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (IMAGE_EXT_RE.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('仅支持图片文件 (jpg/png/gif/webp/svg)'));
        }
    }
});

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function moveImageMetaKey(oldName, nextName) {
    try {
        const data = readData();
        if (!data.IMAGE_META || !data.IMAGE_META[oldName]) return;
        data.IMAGE_META[nextName] = data.IMAGE_META[oldName];
        delete data.IMAGE_META[oldName];
        writeData(data);
    } catch (e) {
        // 图片改名成功但元数据迁移失败时，不中断主流程
    }
}

function removeImageMetaKey(name) {
    try {
        const data = readData();
        if (!data.IMAGE_META || !data.IMAGE_META[name]) return;
        delete data.IMAGE_META[name];
        writeData(data);
    } catch (e) {
        // 图片删除成功但元数据清理失败时，不中断主流程
    }
}

function listMatchingImagesByBase(baseName) {
    return fs.readdirSync(PIC_DIR).filter(file => {
        if (!IMAGE_EXT_RE.test(file)) return false;
        return path.basename(file, path.extname(file)) === baseName;
    });
}

// ===== 路由 =====

// 管理面板
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

// 雷达展示页
app.get('/radar', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// 获取全部配置数据
app.get('/api/data', (req, res) => {
    try {
        res.json(readData());
    } catch (e) {
        res.status(500).json({ error: '读取数据失败' });
    }
});

// 更新全部配置数据
app.put('/api/data', (req, res) => {
    try {
        const data = req.body;
        // 基础校验
        if (!data.CONFIG || !data.namelist || !Array.isArray(data.namelist)) {
            return res.status(400).json({ error: '数据格式不正确' });
        }
        writeData(data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '保存数据失败' });
    }
});

// 列出图片
app.get('/api/images', (req, res) => {
    try {
        const files = fs.readdirSync(PIC_DIR)
            .filter(f => IMAGE_EXT_RE.test(f))
            .map(f => ({
                name: f,
                size: fs.statSync(path.join(PIC_DIR, f)).size,
                url: getImageUrl(f)
            }));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: '读取图片列表失败' });
    }
});

// 上传图片
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    res.json({
        success: true,
        filename: req.file.filename,
        url: getImageUrl(req.file.filename)
    });
});

app.post('/api/upload-slot/:slot', upload.single('image'), (req, res) => {
    const slot = req.params.slot;
    const baseName = SPECIAL_IMAGE_SLOTS[slot];
    if (!baseName) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: '未知图片槽位' });
    }
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    try {
        for (const file of listMatchingImagesByBase(baseName)) {
            if (file === req.file.filename) continue;
            fs.unlinkSync(path.join(PIC_DIR, file));
            removeImageMetaKey(file);
        }
        res.json({
            success: true,
            filename: req.file.filename,
            url: getImageUrl(req.file.filename)
        });
    } catch (e) {
        res.status(500).json({ error: '槽位图片保存失败' });
    }
});

// 重命名图片
app.patch('/api/images/:filename', (req, res) => {
    const oldName = req.params.filename;
    const nextName = normalizeRequestedFilename(req.body?.filename, oldName);

    if (oldName.includes('..') || oldName.includes('/') || oldName.includes('\\')) {
        return res.status(400).json({ error: '原文件名无效' });
    }
    if (!nextName) {
        return res.status(400).json({ error: '新文件名不能为空' });
    }
    if (!isValidImageName(nextName)) {
        return res.status(400).json({ error: '新文件名必须包含有效图片扩展名' });
    }

    const oldPath = path.join(PIC_DIR, oldName);
    const nextPath = path.join(PIC_DIR, nextName);

    if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: '原文件不存在' });
    }
    if (oldName !== nextName && fs.existsSync(nextPath)) {
        return res.status(409).json({ error: '目标文件名已存在' });
    }

    try {
        fs.renameSync(oldPath, nextPath);
        if (oldName !== nextName) moveImageMetaKey(oldName, nextName);
        res.json({
            success: true,
            filename: nextName,
            url: getImageUrl(nextName)
        });
    } catch (e) {
        res.status(500).json({ error: '重命名失败' });
    }
});

// 删除图片
app.delete('/api/images/:filename', (req, res) => {
    const filename = req.params.filename;
    // 路径遍历防护
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: '无效文件名' });
    }
    const filePath = path.join(PIC_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
    }
    try {
        fs.unlinkSync(filePath);
        removeImageMetaKey(filename);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: '删除失败' });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Rock Radar 管理面板: http://localhost:${PORT}`);
    console.log(`雷达展示页: http://localhost:${PORT}/radar`);
});

server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用。请关闭已有 Rock Radar 服务，或换一个端口启动：`);
        console.error(`PowerShell: $env:PORT=3004; npm start`);
        process.exit(1);
    }
    console.error(error);
    process.exit(1);
});
