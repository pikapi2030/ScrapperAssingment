const db = require('../db');

/**
 * Service for detecting price drops and back-in-stock events.
 */
const alertService = {
    async checkAndTriggerAlerts(productId, currentPrice, currentStock, previousHistory) {
        if (!previousHistory || previousHistory.length === 0) {
            return;
        }

        const lastEntry = previousHistory[previousHistory.length - 1];
        const product = await db.getProductById(productId);
        const productName = product ? product.name : `Product #${productId}`;

        // 1. Check for Price Drop
        if (lastEntry.price && currentPrice && currentPrice < lastEntry.price) {
            const dropAmount = lastEntry.price - currentPrice;
            const dropPct = Math.round((dropAmount / lastEntry.price) * 100);

            console.log(`[Alert] PRICE DROP for "${productName}": ₹${lastEntry.price} -> ₹${currentPrice} (-${dropPct}%)`);
            await db.createAlert({
                product_id: productId,
                product_name: productName,
                alert_type: 'price_drop',
                old_value: lastEntry.price,
                new_value: currentPrice,
                message: `Price dropped by ${dropPct}% (₹${dropAmount}) from ₹${lastEntry.price} to ₹${currentPrice}!`
            });
        }

        // 2. Check for Back-in-Stock
        if (lastEntry.stock === 0 && currentStock > 0) {
            console.log(`[Alert] BACK IN STOCK for "${productName}": ${currentStock} units available!`);
            await db.createAlert({
                product_id: productId,
                product_name: productName,
                alert_type: 'back_in_stock',
                old_value: 0,
                new_value: currentStock,
                message: `Product is back in stock! ${currentStock} units currently available.`
            });
        }
    }
};

module.exports = alertService;
