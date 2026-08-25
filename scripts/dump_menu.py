import json

with open('extracted_menu.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

with open('extracted_menu.txt', 'w', encoding='utf-8') as out:
    for p in pages:
        out.write("=== PAGE " + str(p["page"]) + " ===\n")
        out.write(p["text"] or "")
        out.write("\n\n")

print("Saved to extracted_menu.txt")
