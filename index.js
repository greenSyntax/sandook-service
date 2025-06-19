require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
const Photo = require('./models/Photo')
const { error } = require('console');

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const database = require('./utils/database_helper')
database.databaseConnect()

const s3 = new S3Client({
    endpoint: process.env.SPACES_ENDPOINT,
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
    },
});

app.get('/photos', async (req, res) => {
    try {
        const photos = await Photo.find().sort({ uploadedAt: -1 });
        res.json({ 'status': 'success', 'photos': photos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
})

app.get('/status', async (req, res) => {

    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.SPACES_BUCKET,
        });
        const result = await s3.send(command);
        console.log('✅ Bucket Connected:', result);
        res.status(200).json({ 'message': `Connected to ${process.env.SPACES_BUCKET}` })
    } catch (err) {
        console.error('❌ Bucket Access Error:', err);
        res.status(400).json({ 'error': error.message })
    }

})

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileExt = path.extname(req.file.originalname);
    const fileName = crypto.randomUUID() + fileExt;
    const uploadedAt = new Date().toISOString();

    const uploadParams = {
        Bucket: process.env.SPACES_BUCKET,
        Key: fileName,
        Body: req.file.buffer,
        ACL: 'public-read',
        ContentType: req.file.mimetype,
    };

    // EXIF Parsing
    let gps = {};
    try {
        const parser = exif.create(req.file.buffer);
        const result = parser.parse();

        if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
            gps.latitude = result.tags.GPSLatitude;
            gps.longitude = result.tags.GPSLongitude;
        }
    } catch (err) {
        console.warn('No EXIF data found or failed to parse.');
    }

    try {
        await s3.send(new PutObjectCommand(uploadParams));
        const fileUrl = `${process.env.SPACES_ENDPOINT}/${process.env.SPACES_BUCKET}/${fileName}`;

        // Write in Db
        const photo = new Photo({
            url: fileUrl,
            originalName: req.file.originalname,
            uploadedName: fileName,
            size: req.file.size,
            mimeType: req.file.mimetype,
            extension: fileExt,
            encoding: req.file.encoding,
            gps
        });

        await photo.save();

        res.json({
            url: fileUrl,
            metadata: {
                originalName: req.file.originalname,
                uploadedName: fileName,
                size: req.file.size,                // in bytes
                mimeType: req.file.mimetype,
                extension: fileExt,
                encoding: req.file.encoding,
                gps: gps.latitude ? gps : null,
                uploadedAt: uploadedAt
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🍀 Sandook Server running on port ${PORT}`));