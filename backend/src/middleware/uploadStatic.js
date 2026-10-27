const path = require('path');
const express = require('express');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_PATH || './uploads');

// 只有这些扩展名会以图片类型返回；其余一律降级为不可执行类型。
// 这些以点分数字结尾的扩展名（如 .tar.gz）不会产生歧义。
const SAFE_IMAGE_EXTENSIONS = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.bmp', 'image/bmp'],
  ['.ico', 'image/x-icon'],
  ['.avif', 'image/avif']
]);

/**
 * 加固的上传目录静态服务。
 *
 * 默认的 express.static 会按扩展名给出 Content-Type，SVG 会以 image/svg+xml 返回，
 * 浏览器在同源下直接访问该 URL 就会执行其中的 <script> —— 这就是存储型 XSS。
 *
 * 这里做三层防护：
 * 1. 把扩展名改成 .svg 的文件强制以 text/plain 返回（历史遗留文件同样被中和）；
 * 2. 对所有上传文件设置 Content-Security-Policy: sandbox，禁止脚本执行；
 * 3. 设置 X-Content-Type-Options: nosniff 与正确的 Content-Disposition。
 */
const uploadStatic = express.static(UPLOAD_DIR, {
  index: false,
  dotfiles: 'ignore',
  fallthrough: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const imageMime = SAFE_IMAGE_EXTENSIONS.get(ext);

    if (imageMime) {
      res.setHeader('Content-Type', imageMime);
    } else {
      // 非白名单扩展名（含 .svg/.svgz/.xml/.html）一律作为纯文本返回，绝不当作文档执行
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment');
    }

    // 无论类型如何，都禁止上传目录内的任何内容执行脚本
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  }
});

uploadStatic.UPLOAD_DIR = UPLOAD_DIR;

module.exports = uploadStatic;
