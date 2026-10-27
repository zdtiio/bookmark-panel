const Config = require('../models/Config');

// 首页布局存放在 config 表的单个 key 中，值为 JSON 数组：[{ type: 'bookmark' | 'folder', id }]
const HOME_ITEMS_KEY = 'homeItems';

const parseHomeItems = (rawValue) => {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== 'string') return null;
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * 从首页布局中移除指向指定实体的引用。
 *
 * 在删除书签 / 文件夹时调用，使「删除」在数据库层面就是完整的：
 * 不再依赖前端是否在线、是否正确地做了一次额外清理。
 * 这样多设备 / 多标签页场景下，其他端下次拉取配置时自然一致。
 *
 * @param {number} userId 用户 id
 * @param {'bookmark'|'folder'} type 实体类型
 * @param {Array<number|string>} ids 被删除的实体 id 列表
 * @param {object|null} transaction Sequelize 事务，应传入以与删除操作保持原子性
 * @returns {Promise<number>} 实际移除的引用数量
 */
const removeReferences = async (userId, type, ids, transaction = null) => {
  const idSet = new Set(
    (Array.isArray(ids) ? ids : [ids])
      .filter((id) => id !== null && id !== undefined)
      .map((id) => String(id))
  );
  if (idSet.size === 0) return 0;

  const record = await Config.findOne({
    where: { userId, key: HOME_ITEMS_KEY },
    transaction
  });
  if (!record) return 0;

  const items = parseHomeItems(record.value);
  if (!items) return 0;

  const nextItems = items.filter((item) => {
    // 结构异常的历史数据原样保留，不做破坏性处理
    if (!item || typeof item !== 'object') return true;
    if (item.type !== type) return true;
    // id 在 JSON 中可能是数字，前端比较时多为字符串，统一按字符串归一化
    return !idSet.has(String(item.id));
  });

  const removed = items.length - nextItems.length;
  if (removed > 0) {
    await record.update({ value: JSON.stringify(nextItems) }, { transaction });
  }
  return removed;
};

module.exports = {
  HOME_ITEMS_KEY,
  parseHomeItems,
  removeReferences
};
