const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 允许的图标类型：显式白名单，且必须以二进制魔数校验，不信任客户端提供的 mimetype。
// 注意：这里刻意不接受 SVG。SVG 是 XML 文档，可以内嵌 <script>，
// 一旦上传并同源访问即构成存储型 XSS（俗称 node2shell 的一类）。
const ALLOWED_ICON_TYPES = [
  { mime: 'image/png', ext: '.png', magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])] },
  { mime: 'image/jpeg', ext: '.jpg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  { mime: 'image/gif', ext: '.gif', magic: [Buffer.from('GIF87a', 'ascii'), Buffer.from('GIF89a', 'ascii')] },
  {
    mime: 'image/webp',
    ext: '.webp',
    magic: [Buffer.from('RIFF', 'ascii')]
  }
];

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_PATH || './uploads');

const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  for (const type of ALLOWED_ICON_TYPES) {
    const matched = type.magic.some((sig) => buffer.subarray(0, sig.length).equals(sig));
    if (!matched) continue;

    // WebP 额外校验：RIFF....WEBP
    if (type.mime === 'image/webp' && buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
      continue;
    }
    return type;
  }
  return null;
};

// 先收进内存，等校验通过后再落盘，避免任何未校验的字节进入静态目录
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    // 第一道：拒绝明确危险的类型（SVG/HTML 等），只做粗筛，真正判定在内容校验中
    if (!/^image\//i.test(file.mimetype) || /svg/i.test(file.mimetype)) {
      return cb(new Error('只允许上传 PNG / JPEG / GIF / WebP 格式的图标'));
    }
    cb(null, true);
  }
});

const iconController = {
  /**
   * 包装 multer 中间件：把文件类型/体积等拒绝原因转成规范的 400 响应，
   * 而不是抛出未处理的异常或泄漏堆栈。
   */
  upload: (req, res, next) => {
    upload.single('icon')(req, res, (err) => {
      if (!err) return next();

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          code: 'FILE_TOO_LARGE',
          message: '图标文件不能超过 2MB'
        });
      }

      return res.status(400).json({
        success: false,
        code: 'INVALID_FILE_TYPE',
        message: '只允许上传 PNG / JPEG / GIF / WebP 格式的图标'
      });
    });
  },

  async uploadIcon(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: '未收到文件'
        });
      }

      // 第二道：按文件真实内容判定类型，忽略文件名与客户端 mimetype
      const detected = detectImageType(req.file.buffer);
      if (!detected) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FILE_TYPE',
          message: '文件内容不是受支持的图片格式'
        });
      }

      fs.mkdirSync(UPLOAD_DIR, { recursive: true });

      // 文件名完全由服务端生成，不含用户可控片段，扩展名来自服务端白名单
      const filename = `${Date.now()}-${crypto.randomBytes(9).toString('hex')}${detected.ext}`;
      const targetPath = path.join(UPLOAD_DIR, filename);

      // 兜底校验：确保写入路径仍位于上传目录内（防御未来改动引入路径穿越）
      if (path.dirname(path.resolve(targetPath)) !== UPLOAD_DIR) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PATH',
          message: '非法的文件路径'
        });
      }

      await fs.promises.writeFile(targetPath, req.file.buffer, { mode: 0o644 });

      res.json({
        success: true,
        iconUrl: `/uploads/${filename}`
      });
    } catch (error) {
      console.error('图标上传失败:', error);
      res.status(500).json({
        success: false,
        code: 'UPLOAD_FAILED',
        message: '图标上传失败'
      });
    }
  }
};

iconController.ALLOWED_ICON_TYPES = ALLOWED_ICON_TYPES;
iconController.detectImageType = detectImageType;
iconController.UPLOAD_DIR = UPLOAD_DIR;

module.exports = iconController;
