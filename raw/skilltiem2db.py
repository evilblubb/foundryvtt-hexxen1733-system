#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json

out = {}
out2 = {}
out3 = {}
role_list = []
profession_list = []
string = "skillitem"
o = 000
f = open("skillitems.db", "w", encoding="utf8")
with open('skillitems.json',"r" , encoding="utf8") as json_file:
    data = json.load(json_file)


    for i in data:
        item = data[i]
        for p in item:
            print (p)
            temp = item[p]
            print(temp)
            if "description" in p:
                pass
            elif "references" in p:
                pass
            else:
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "item"
                out2["references"] = item["references"]
                out2["description"] = temp["description"]
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f, ensure_ascii=False)
                f.write('\n')
                o = o + 1



f.close()
