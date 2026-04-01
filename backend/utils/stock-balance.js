/**
 * Stock Balance Utilities for Inventory Phoubon
 * SQL snippets for stock calculations
 */

// SQL JOIN for lot balance aggregation
const lotBalanceJoin = `
  LEFT JOIN (
    SELECT product_id, COALESCE(SUM(quantity), 0) AS quantity
    FROM stock_lots
    GROUP BY product_id
  ) lb ON lb.product_id = p.id
`;

// Expression to get current stock from lot balance
const currentStockExpr = 'COALESCE(lb.quantity, 0)';

// SQL JOIN for stock levels
const stockLevelJoin = `
  LEFT JOIN stock_levels sl ON sl.product_id = p.id
`;

module.exports = {
  lotBalanceJoin,
  currentStockExpr,
  stockLevelJoin
};