import os

with open('src/components/DieForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('SteelStockItem', 'StockItem')
content = content.replace('getSteelStockItems', 'getStockItems')
content = content.replace('steelItems: SteelStockItem[]', 'steelItems: StockItem[]')
content = content.replace('<SteelStockItem[]>', '<StockItem[]>')
content = content.replace('getStockItems()', "getStockItems({ item_type: 'RAW_MATERIAL' })")
content = content.replace('c.stock_item?.diameter_mm || 0', 'Number(c.stock_item?.attributes?.diameter_mm) || 0')
content = content.replace('stockItem.diameter_mm', 'Number(stockItem.attributes?.diameter_mm || 0)')
content = content.replace('item.alloy', 'item.attributes?.alloy')
content = content.replace('item.diameter_mm', 'item.attributes?.diameter_mm')

with open('src/components/DieForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed DieForm.tsx')
