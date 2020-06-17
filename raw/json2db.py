# -*- coding: utf-8 -*-
import json

out = {}
out2 = {}
out3 = {}
role_list = []
profession_list = []
string = "skills"
o = 000
f = open("skills.db", "w")
with open('skills.json') as json_file:
    data = json.load(json_file)
    role_data = data["role"]
    profession_data = data["profession"]
    for i in data["role"]:
        role_list.append(i)
    for i in data["profession"]:
        profession_list.append(i)

    for i in role_list:
        role = role_data[i]
        if 'esprit' in role:
            role_esprit = role["esprit"]
            for p in role_esprit:
                temp = role_esprit[p]
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "skills"
                out2["references"] = temp["references"]
                out2["description"] = temp["text"]
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f)
                f.write('\n')
                o = o + 1
        else:
            pass
        if 'jaeger' in role:
            role_jaeger = role["jaeger"]
            for p in role_jaeger:
                temp = role_jaeger[p]
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "skills"
                out2["references"] = temp["references"]
                out2["description"] = temp["text"]
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f)
                f.write('\n')
                o = o + 1
        else:
            pass
        if 'aufbau' in role:
            role_aufbau = role["aufbau"]
            for p in role_aufbau:
                temp = role_aufbau[p]
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "skills"
                out2["references"] = temp["references"]
                out3 = temp["stammeffekt"]
                out2["description"] = "%s%s" % (out3["text"], temp["text"])
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f)
                f.write('\n')
                o = o + 1
                if "gesellen" in temp:
                    g = temp["gesellen"]
                    for u in g:
                        temp2 = g[u]
                        out["_id"] = "%s%s" % (string, o)
                        out["name"] = temp2["name"]
                        out["permission"] = {"default": 0}
                        out["type"] = "skills"
                        out2["references"] = temp["references"]
                        out2["description"] = temp2["text"]
                        out2["summary"] = {}
                        out["data"] = out2
                        out["flags"] = {}
                        out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                        json.dump(out, f)
                        f.write('\n')
                        o = o + 1
                else:
                    pass
                if "expert" in temp:
                    e = temp["expert"]
                    for u in e:
                        temp2 = e[u]
                        out["_id"] = "%s%s" % (string, o)
                        out["name"] = temp2["name"]
                        out["permission"] = {"default": 0}
                        out["type"] = "skills"
                        out2["references"] = temp["references"]
                        out2["description"] = temp2["text"]
                        out2["summary"] = {}
                        out["data"] = out2
                        out["flags"] = {}
                        out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                        print(out)
                        json.dump(out, f)
                        f.write('\n')
                        o = o + 1
                else:
                    pass
                if "meister" in temp:
                    m = temp["meister"]
                    for u in m:
                        temp2 = m[u]
                        out["_id"] = "%s%s" % (string, o)
                        out["name"] = temp2["name"]
                        out["permission"] = {"default": 0}
                        out["type"] = "skills"
                        out2["references"] = temp["references"]
                        out2["description"] = temp2["text"]
                        out2["summary"] = {}
                        out["data"] = out2
                        out["flags"] = {}
                        out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                        json.dump(out, f)
                        f.write('\n')
                        o = o + 1
                else:
                    pass
        else:
            pass

    for i in profession_list:
        profession = profession_data[i]
        if 'esprit' in profession:
            profession_esprit = profession["esprit"]
            for p in profession_esprit:
                temp = profession_esprit[p]
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "skills"
                out2["references"] = temp["references"]
                out2["description"] = temp["text"]
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f)
                f.write('\n')
                o = o + 1
        else:
            pass
        if 'jaeger' in profession:
            profession_jaeger = profession["jaeger"]
            for p in profession_jaeger:
                temp = profession_jaeger[p]
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "skills"
                out2["references"] = temp["references"]
                out2["description"] = temp["text"]
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f)
                f.write('\n')
                o = o + 1
        else:
            pass

        if 'aufbau' in profession:
            profession_aufbau = profession["aufbau"]
            for p in profession_aufbau:
                temp = profession_aufbau[p]
                out["_id"] = "%s%s" % (string, o)
                out["name"] = temp["name"]
                out["permission"] = {"default": 0}
                out["type"] = "skills"
                out2["references"] = temp["references"]
                out3 = temp["stammeffekt"]
                out2["description"] = "%s%s" % (out3["text"], temp["text"])
                out2["summary"] = temp["summary"]
                out["data"] = out2
                out["flags"] = {}
                out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                json.dump(out, f)
                f.write('\n')
                o = o + 1
                if "gesellen" in temp:
                    g = temp["gesellen"]
                    for u in g:
                        temp2 = g[u]
                        out["_id"] = "%s%s" % (string, o)
                        out["name"] = temp2["name"]
                        out["permission"] = {"default": 0}
                        out["type"] = "skills"
                        out2["references"] = temp["references"]
                        out2["description"] = temp2["text"]
                        out2["summary"] = {}
                        out["data"] = out2
                        out["flags"] = {}
                        out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                        json.dump(out, f)
                        f.write('\n')
                        o = o + 1
                else:
                    pass
                if "expert" in temp:
                    e = temp["expert"]
                    for u in e:
                        temp2 = e[u]
                        out["_id"] = "%s%s" % (string, o)
                        out["name"] = temp2["name"]
                        out["permission"] = {"default": 0}
                        out["type"] = "skills"
                        out2["references"] = temp["references"]
                        out2["description"] = temp2["text"]
                        out2["summary"] = {}
                        out["data"] = out2
                        out["flags"] = {}
                        out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                        print(out)
                        json.dump(out, f)
                        f.write('\n')
                        o = o + 1
                else:
                    pass
                if "meister" in temp:
                    m = temp["meister"]
                    for u in m:
                        temp2 = m[u]
                        out["_id"] = "%s%s" % (string, o)
                        out["name"] = temp2["name"]
                        out["permission"] = {"default": 0}
                        out["type"] = "skills"
                        out2["references"] = temp["references"]
                        out2["description"] = temp2["text"]
                        out2["summary"] = {}
                        out["data"] = out2
                        out["flags"] = {}
                        out["img"] = "systems/hexxen-1733/img/Siegel-Rabe-small.png"
                        json.dump(out, f)
                        f.write('\n')
                        o = o + 1
                else:
                    pass

f.close()
