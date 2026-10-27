/**
 * 安全回归测试。
 * 每个用例对应一个已修复的漏洞，确保修复不被后续改动回退。
 *
 * 运行：cd backend && npm run test:security
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-value-with-more-than-32-characters';
process.env.DB_PATH = './database/security-test.db';
process.env.UPLOAD_PATH = './uploads/security-test';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const results = [];
let failures = 0;

const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failures += 1;
    results.push({ name, ok: false, error: error.message });
    console.log(`  FAIL  ${name}\n        ${error.message}`);
  }
};

const request = (server, { method = 'GET', path: reqPath, headers = {}, body } = {}) => {  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
          ...headers
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json;
          try { json = JSON.parse(raw); } catch { json = undefined; }
          resolve({ status: res.statusCode, headers: res.headers, raw, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const multipart = (fieldName, filename, contentType, content) => {
  const boundary = '----DSHTestBoundary' + Math.random().toString(16).slice(2);
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { boundary, body: Buffer.concat([head, Buffer.from(content), tail]) };
};

const uploadIcon = (server, { filename, contentType, content, token }) => {
  return new Promise((resolve, reject) => {
    const { boundary, body } = multipart('icon', filename, contentType, content);
    const { port } = server.address();
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/api/bookmarks/icon',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json;
          try { json = JSON.parse(raw); } catch { json = undefined; }
          resolve({ status: res.statusCode, headers: res.headers, raw, json });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

(async () => {
  // 清理旧产物
  for (const f of ['./database/security-test.db']) {
    try { fs.unlinkSync(f); } catch {}
  }
  const uploadDir = path.resolve('./uploads/security-test');
  fs.rmSync(uploadDir, { recursive: true, force: true });

  const { app } = require('../src/app');
  const sequelize = require('../src/config/database');
  const User = require('../src/models/User');
  const bookmarkService = require('../src/services/bookmarkService');
  const iconController = require('../src/controllers/iconController');
  const { getJwtExpiresIn } = require('../src/middleware/auth');
  const jwt = require('jsonwebtoken');

  await sequelize.sync({ force: true });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    // ============ 1. node2shell：上传目录不得执行脚本 ============
    console.log('\n[1] node2shell / 存储型 XSS');

    await test('SVG 上传被拒绝（即使伪装成 image/svg+xml）', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      const res = await uploadIcon(server, {
        filename: 'evil.svg', contentType: 'image/svg+xml', content: svg
      });
      // 未认证应被 401 拦截
      assert.strictEqual(res.status, 401, `预期 401，实际 ${res.status}`);
    });

    // 建一个真实用户用于后续认证请求
    const user = await User.create({ username: 'secuser', email: 'sec@example.com', password: 'Passw0rd123' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

    await test('已登录用户上传 SVG 被拒绝', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      const res = await uploadIcon(server, {
        filename: 'evil.svg', contentType: 'image/svg+xml', content: svg, token
      });
      assert.ok(res.status >= 400, `预期被拒绝，实际 ${res.status}`);
      assert.ok(!res.raw.includes('/uploads/'), '响应中不应返回上传成功地址');
    });

    await test('伪装 MIME 的 SVG（声明为 image/png）被内容校验拦截', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      const res = await uploadIcon(server, {
        filename: 'evil.png', contentType: 'image/png', content: svg, token
      });
      assert.strictEqual(res.status, 400, `预期 400，实际 ${res.status}`);
    });

    await test('真实 PNG 上传成功且扩展名由服务端决定', async () => {
      // 1x1 PNG 真实魔数
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      const res = await uploadIcon(server, {
        filename: 'normal.png', contentType: 'image/png', content: png, token
      });
      assert.strictEqual(res.status, 200, `预期 200，实际 ${res.status} ${res.raw}`);
      assert.ok(/^\/uploads\/[0-9a-f-]+\.png$/.test(res.json.iconUrl), `文件名应服务端生成: ${res.json.iconUrl}`);
    });

    await test('历史上传的 .svg 文件被以 text/plain 返回且带 CSP', async () => {
      // 模拟修复前遗留的恶意文件
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(
        path.join(uploadDir, 'legacy.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
      );
      const res = await request(server, { path: '/uploads/legacy.svg' });
      assert.strictEqual(res.status, 200);
      const ct = String(res.headers['content-type'] || '');
      assert.ok(ct.startsWith('text/plain'), `SVG 不应以 image/svg+xml 返回，实际 ${ct}`);
      assert.ok(String(res.headers['content-security-policy'] || '').includes('sandbox'), '缺少 sandbox CSP');
      assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    });

    await test('上传目录防护覆盖 .html/.xml 等可执行扩展名', async () => {
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, 'xss.html'), '<script>alert(1)</script>');
      const res = await request(server, { path: '/uploads/xss.html' });
      const ct = String(res.headers['content-type'] || '');
      assert.ok(ct.startsWith('text/plain'), `应降级为 text/plain，实际 ${ct}`);
    });

    await test('上传目录禁止路径穿越读取任意文件', async () => {
      for (const p of ['/uploads/../package.json', '/uploads/..%2f..%2fpackage.json', '/uploads/%2e%2e%2fpackage.json']) {
        const res = await request(server, { path: p });
        assert.ok(!res.raw.includes('bookmark-panel-backend'), `路径穿越成功: ${p}`);
      }
    });

    // ============ 2. icon 字段存储型 XSS ============
    console.log('\n[2] bookmark.icon 字段注入');

    await test('sanitizeIcon 拒绝 data:/javascript: 伪协议', async () => {
      const bad = [
        'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+',
        'javascript:alert(1)',
        'vbscript:msgbox(1)',
        'data:text/html,<script>alert(1)</script>',
        '//evil.com/x.png',
        '/uploads/../secret.png',
        '/uploads/x.svg'
      ];
      for (const v of bad) {
        const out = bookmarkService.sanitizeIcon(v);
        assert.strictEqual(out, null, `应被拒绝: ${v} → ${out}`);
      }
    });

    await test('sanitizeIcon 允许安全图标来源', async () => {
      assert.strictEqual(
        bookmarkService.sanitizeIcon('/uploads/1750000000000-abcdef123.png'),
        '/uploads/1750000000000-abcdef123.png'
      );
      assert.strictEqual(
        bookmarkService.sanitizeIcon('https://example.com/icon.png'),
        'https://example.com/icon.png'
      );
    });

    await test('创建书签时清理 icon 字段', async () => {
      const created = await bookmarkService.createBookmark(user.id, {
        title: 'xss-test',
        url: 'https://example.com/a',
        icon: 'data:image/svg+xml,<svg onload=alert(1)>'
      });
      assert.strictEqual(created.icon, null, `icon 应被清空，实际 ${created.icon}`);
    });

    await test('导入书签时清理 icon 字段', async () => {
      const result = await bookmarkService.importBookmarks(user.id, {
        bookmarks: [
          { title: 'imported', url: 'https://example.com/imported', icon: 'javascript:alert(1)' }
        ],
        folders: [],
        folderOrderMap: {}
      });
      const created = result.bookmarks[0];
      assert.ok(created, '应导入成功');
      assert.strictEqual(created.icon, null, `导入的 icon 应被清空，实际 ${created.icon}`);
    });

    // ============ 3. 认证与会话 ============
    console.log('\n[3] 认证与会话');

    await test('伪造 alg:none 的 JWT 被拒绝', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64url');
      const forged = `${header}.${payload}.`;
      const res = await request(server, { path: '/api/bookmarks', headers: { Authorization: `Bearer ${forged}` } });
      assert.strictEqual(res.status, 401, `预期 401，实际 ${res.status}`);
    });

    await test('用其它密钥签发的 JWT 被拒绝', async () => {
      const forged = jwt.sign({ userId: user.id }, 'attacker-controlled-secret-key-32chars!!', { algorithm: 'HS256' });
      const res = await request(server, { path: '/api/bookmarks', headers: { Authorization: `Bearer ${forged}` } });
      assert.strictEqual(res.status, 401, `预期 401，实际 ${res.status}`);
    });

    await test('未携带凭据访问业务接口返回 401', async () => {
      const res = await request(server, { path: '/api/bookmarks' });
      assert.strictEqual(res.status, 401);
    });

    await test('弱密码注册被拒绝', async () => {
      const res = await request(server, {
        method: 'POST', path: '/api/auth/register',
        body: { username: 'weakuser', email: 'weak@example.com', password: '123' }
      });
      assert.strictEqual(res.status, 400, `预期 400，实际 ${res.status} ${res.raw}`);
    });

    await test('非法邮箱注册被拒绝', async () => {
      const res = await request(server, {
        method: 'POST', path: '/api/auth/register',
        body: { username: 'badmail', email: 'not-an-email', password: 'Passw0rd123' }
      });
      assert.strictEqual(res.status, 400);
    });

    await test('登录接口对暴力破解限流', async () => {
      let limited = false;
      for (let i = 0; i < 15; i++) {
        const res = await request(server, {
          method: 'POST', path: '/api/auth/login',
          body: { email: 'sec@example.com', password: `wrong-${i}` }
        });
        if (res.status === 429) { limited = true; break; }
      }
      assert.ok(limited, '连续失败登录应触发 429 限流');
    });

    // ============ 4. 响应头与 CORS ============
    console.log('\n[4] 响应头与 CORS');

    await test('API 响应包含安全响应头', async () => {
      const res = await request(server, { path: '/api/bookmarks' });
      assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
      assert.strictEqual(res.headers['x-frame-options'], 'DENY');
      assert.strictEqual(res.headers['referrer-policy'], 'no-referrer');
      const csp = String(res.headers['content-security-policy'] || '');
      assert.ok(csp.includes("object-src 'none'"), 'CSP 应禁止 object-src');
      assert.ok(!csp.includes("script-src 'unsafe-inline'"), 'CSP 不应允许内联脚本');
    });

    await test('未授权来源不获得 CORS 放行头', async () => {
      const res = await request(server, {
        path: '/api/bookmarks',
        headers: { Origin: 'https://evil.example.com' }
      });
      assert.notStrictEqual(
        res.headers['access-control-allow-origin'],
        'https://evil.example.com',
        '不应为任意来源放行 CORS'
      );
    });

    // ============ 5. 多租户隔离 ============
    console.log('\n[5] 数据隔离');

    await test('用户无法读取他人书签', async () => {
      const other = await User.create({ username: 'other', email: 'other@example.com', password: 'Passw0rd123' });
      const otherBookmark = await bookmarkService.createBookmark(other.id, {
        title: 'private', url: 'https://example.com/private'
      });
      const res = await request(server, {
        path: `/api/bookmarks/${otherBookmark.id}`,
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 404, `跨用户读取应失败，实际 ${res.status}`);
    });

    // ============ 6. 启动配置 ============
    console.log('\n[6] 启动配置校验');

    await test('app 对外暴露 assertSecureConfig 且拒绝弱密钥', async () => {
      const original = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'your-secret-key-change-in-production';
      const { assertSecureConfig } = require('../src/app');
      assert.throws(() => assertSecureConfig(), /JWT_SECRET/);
      process.env.JWT_SECRET = original;
      // 合法密钥应通过
      assert.doesNotThrow(() => assertSecureConfig());
    });

    await test('JWT_EXPIRES_IN 纯数字被拒绝（会被当作毫秒导致立即过期）', async () => {
      const original = process.env.JWT_EXPIRES_IN;
      // 复现真实事故：配置 180 意图为 180 天，实际被当成 180 毫秒
      process.env.JWT_EXPIRES_IN = '180';
      assert.throws(() => getJwtExpiresIn(), /纯数字|毫秒/, '应拒绝纯数字配置');

      // 数字转成带单位后应被接受
      process.env.JWT_EXPIRES_IN = '180d';
      assert.strictEqual(getJwtExpiresIn(), '180d');

      process.env.JWT_EXPIRES_IN = original;
    });

    await test('JWT_EXPIRES_IN 拒绝 0、负数与非法单位', async () => {
      const original = process.env.JWT_EXPIRES_IN;
      for (const bad of ['0', '0s', '-1d', '7x', 'ms', 'abc']) {
        process.env.JWT_EXPIRES_IN = bad;
        assert.throws(() => getJwtExpiresIn(), undefined, `应拒绝: ${bad}`);
      }
      // 合法的各种单位
      for (const good of ['7d', '12h', '30m', '45s', '2w', '1y']) {
        process.env.JWT_EXPIRES_IN = good;
        assert.strictEqual(getJwtExpiresIn(), good);
      }
      process.env.JWT_EXPIRES_IN = original;
    });

    await test('签发的 token 有效期与配置一致（不会立即过期）', async () => {
      const original = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '180d';
      const t = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: getJwtExpiresIn()
      });
      const decoded = jwt.decode(t);
      const lifetimeDays = (decoded.exp - decoded.iat) / 86400;
      assert.strictEqual(lifetimeDays, 180, `有效期应为 180 天，实际 ${lifetimeDays} 天`);
      // 立即验签必须通过
      assert.doesNotThrow(() => jwt.verify(t, process.env.JWT_SECRET, { algorithms: ['HS256'] }));
      process.env.JWT_EXPIRES_IN = original;
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
    try { fs.unlinkSync('./database/security-test.db'); } catch {}
  }

  console.log(`\n${'='.repeat(60)}`);
  const passed = results.filter((r) => r.ok).length;
  console.log(`结果: ${passed}/${results.length} 通过, ${failures} 失败`);
  console.log('='.repeat(60));
  process.exitCode = failures === 0 ? 0 : 1;
})();
