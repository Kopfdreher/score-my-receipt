"""Build a small, attributed reference snapshot from published OFF upstream files.
Inputs: /tmp/categories.txt, /tmp/ciqual2020.csv, /tmp/agribalyse-2.csv.
No censored ('<') or missing nutrient values are converted to exact numbers.
"""
import csv
import json
import re
from pathlib import Path

ROOTS = {'apples', 'bananas', 'tomatoes', 'carrots', 'potatoes', 'onions', 'garlic',
         'cucumbers', 'lettuces', 'broccoli', 'cauliflowers', 'courgettes', 'peppers',
         'spinach', 'pears', 'oranges', 'lemons', 'strawberries', 'grapes', 'kiwifruits',
         'avocados', 'sweet-potatoes', 'mushrooms', 'fresh-fruits', 'fresh-vegetables'}

def tag(value):
    return 'en:' + re.sub(r'[^a-z0-9]+', '-', value.strip().lower()).strip('-')

entries = {}
for block in Path('/tmp/categories.txt').read_text().split('\n\n'):
    english = re.search(r'^en: (.+)$', block, re.M)
    if not english:
        continue
    name = english[1].split(',')[0]
    entries[tag(name)] = {
        'name': name,
        'parents': [tag(p) for p in re.findall(r'^< en: (.+)$', block, re.M)],
        'ciqual': re.search(r'^ciqual_food_code:en:\s*(\S+)', block, re.M),
        'agribalyse': re.search(r'^agribalyse_food_code:en:\s*(\S+)', block, re.M)
    }

def inherited(key, field, seen=None):
    seen = (seen or set()) | {key}
    entry = entries.get(key, {})
    if entry.get(field):
        return entry[field][1]
    for parent in entry.get('parents', []):
        if parent not in seen:
            result = inherited(parent, field, seen)
            if result:
                return result
    return None

ciqual = {r['alim_code']: r for r in csv.DictReader(open('/tmp/ciqual2020.csv'), delimiter='\t')}
agribalyse = {r[0]: r for r in list(csv.reader(open('/tmp/agribalyse-2.csv')))[3:]}
fields = {'sugars_100g': 'Sugars (g/100g)', 'fat_100g': 'Fat (g/100g)',
          'salt_100g': 'Salt (g/100g)', 'saturated-fat_100g': 'FA saturated (g/100g)'}
result = {}
for key, entry in entries.items():
    # Only explicit raw-produce categories and their fresh variants; not canned/juice descendants.
    if key[3:] not in ROOTS and not (key.startswith('en:fresh-') and key[9:] in ROOTS):
        continue
    code = inherited(key, 'ciqual')
    agb = inherited(key, 'agribalyse')
    # Generic bananas in OFF currently use a plantain proxy. Select the published
    # raw banana reference directly instead of treating plantain as dessert banana.
    if key in ['en:bananas', 'en:fresh-bananas']:
        code = '13005'
        agb = '13005'
    row = ciqual.get(code, {})
    nutrients = {}
    for target, source in fields.items():
        value = row.get(source, '').replace(',', '.')
        if re.fullmatch(r'\d+(\.\d+)?', value):
            nutrients[target] = float(value)
    carbon = agribalyse.get(agb)
    if not nutrients and carbon is None:
        continue
    result[key] = {
        'referenceId': f'ciqual:{code}|agribalyse:{agb}',
        'referenceName': row.get('alim_nom_eng') or carbon[5],
        'nutriments': nutrients,
        'co2PerKg': float(carbon[13]) if carbon else None,
        'ciqualCode': code, 'agribalyseCode': agb
    }
Path('src/data/produceReference.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
print(f'Generated {len(result)} raw-produce category references.')
