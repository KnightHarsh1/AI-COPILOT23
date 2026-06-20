"""Industry benchmarking. Compares a company's KPIs against seed benchmarks
for its industry so an owner sees "your margin 8% vs ~12% typical for retail".
Seed values are indicative ranges, labeled as such.
"""

# Indicative typical values per industry (profit_margin %, receivable_days,
# inventory_turnover x/yr, growth_rate %). Conservative SME ballparks.
_BENCHMARKS = {
    'retail':          {'profit_margin': 8,  'receivable_days': 15, 'inventory_turnover': 8,  'growth_rate': 10},
    'wholesale':       {'profit_margin': 5,  'receivable_days': 45, 'inventory_turnover': 10, 'growth_rate': 8},
    'manufacturing':   {'profit_margin': 10, 'receivable_days': 50, 'inventory_turnover': 6,  'growth_rate': 9},
    'services':        {'profit_margin': 18, 'receivable_days': 30, 'inventory_turnover': 0,  'growth_rate': 12},
    'textile':         {'profit_margin': 9,  'receivable_days': 55, 'inventory_turnover': 5,  'growth_rate': 8},
    'plastics':        {'profit_margin': 11, 'receivable_days': 50, 'inventory_turnover': 6,  'growth_rate': 7},
    'steel':           {'profit_margin': 7,  'receivable_days': 45, 'inventory_turnover': 5,  'growth_rate': 6},
    'food processing': {'profit_margin': 12, 'receivable_days': 25, 'inventory_turnover': 9,  'growth_rate': 11},
    'construction':    {'profit_margin': 10, 'receivable_days': 60, 'inventory_turnover': 4,  'growth_rate': 8},
}
_DEFAULT = {'profit_margin': 10, 'receivable_days': 40, 'inventory_turnover': 6, 'growth_rate': 9}

# For these metrics, lower is better.
_LOWER_BETTER = {'receivable_days'}


class BenchmarkService:
    def compare(self, industry, kpis: dict) -> dict:
        key = (industry or '').strip().lower()
        bench = _BENCHMARKS.get(key, _DEFAULT)
        items = []
        for metric, typical in bench.items():
            actual = kpis.get(metric)
            if actual is None:
                continue
            lower_better = metric in _LOWER_BETTER
            if typical == 0:
                continue
            if lower_better:
                status = 'good' if actual <= typical else ('watch' if actual <= typical * 1.3 else 'poor')
            else:
                status = 'good' if actual >= typical else ('watch' if actual >= typical * 0.7 else 'poor')
            items.append({
                'metric': metric,
                'your_value': round(float(actual), 1),
                'typical': typical,
                'status': status,
                'lower_is_better': lower_better,
            })
        return {
            'available': True,
            'industry': key or None,
            'is_generic': key not in _BENCHMARKS,
            'items': items,
        }
