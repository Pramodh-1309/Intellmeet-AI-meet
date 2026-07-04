import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { file, filename } = req.body;
    if (!file || !filename) {
      return res.status(400).json({ message: 'Missing file payload or filename' });
    }

    let base64Data = file;
    if (file.includes(';base64,')) {
      base64Data = file.split(';base64,')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const uploadDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const sanitizedFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const filePath = path.join(uploadDir, sanitizedFilename);
    fs.writeFileSync(filePath, buffer);

    let fileUrl = `/uploads/${sanitizedFilename}`;

    if (process.env.CLOUDINARY_URL) {
      try {
        const cloudinary = require('cloudinary').v2;
        const uploadResult: any = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: 'auto', public_id: sanitizedFilename.split('.')[0] },
            (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });
        if (uploadResult && uploadResult.secure_url) {
          fileUrl = uploadResult.secure_url;
        }
      } catch (cloudinaryErr) {
        console.warn('Cloudinary upload failed, using local fallback:', cloudinaryErr);
      }
    }

    res.status(201).json({ url: fileUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
