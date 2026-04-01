/**
 * Unit Name Utilities for Inventory Phoubon
 * Unit code to Thai name mapping
 */

const UNIT_NAME_BY_CODE = {
  '001': 'กระป๋อง',
  '002': 'กระปุก',
  '003': 'กล่อง',
  '004': 'ก้อน',
  '005': 'แกลลอน',
  '006': 'ขวด',
  '007': 'คาทริดจ์',
  '008': 'คู่',
  '009': 'แคปซูล',
  '010': 'ชิ้น',
  '011': 'ชุด',
  '012': 'ชุดทดสอบ',
  '013': 'ซอง',
  '014': 'ด้าม',
  '015': 'ตลับ',
  '016': 'ถัง',
  '017': 'ถุง',
  '018': 'แถบ',
  '019': 'ห่อ',
  '020': 'แท่ง',
  '024': 'แผง',
  'tablet': 'เม็ด',
  'capsule': 'แคปซูล',
  'bottle': 'ขวด',
  'vial': 'ขวดฉีด',
  'amp': 'แอมพูล',
  'tube': 'หลอด',
  'pack': 'ซอง',
  'box': 'กล่อง',
  'piece': 'ชิ้น',
  'set': 'ชุด',
  'ml': 'มิลลิลิตร',
  'mg': 'มิลลิกรัม',
  'g': 'กรัม',
  'unit': 'หน่วย'
};

// Empty join (not needed for this implementation)
const unitJoin = '';

// SQL expression to translate unit codes to Thai names
const unitNameExpr = `
  CASE NULLIF(p.unit_sell, '')
    ${Object.entries(UNIT_NAME_BY_CODE)
      .map(([code, name]) => `WHEN '${code.replace(/'/g, "''")}' THEN '${name}'`)
      .join('\n    ')}
    ELSE NULLIF(p.unit_sell, '')
  END
`;

/**
 * Get unit name from code
 * @param {string} code - Unit code
 * @returns {string} - Thai unit name or original code
 */
function getUnitName(code) {
  if (!code) return '';
  return UNIT_NAME_BY_CODE[code] || code;
}

module.exports = {
  unitJoin,
  unitNameExpr,
  UNIT_NAME_BY_CODE,
  getUnitName
};