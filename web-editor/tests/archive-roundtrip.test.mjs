import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const required = [
  "Players.csv",
  "Staff.csv",
  "Teams.csv",
  "Sponsors.csv",
  "Tournaments.csv",
  "roster_order.json",
];

test("packs and discovers a nested decrypted EMDB ZIP", () => {
  const fixture = {
    "Players.csv": "Nick;Name;Surname;Internal ID\nalpha;Alex;Tester;alpha\n",
    "Staff.csv": "Nick;Name;Surname;Internal ID\ncoach;Casey;Tester;coach\n",
    "Teams.csv": "Nick;Name\nALP;Alpha Esports\n",
    "Sponsors.csv": "Id;Name\n1;Example Sponsor\n",
    "Tournaments.csv": "Name;Country;City\nExample Cup;Germany;Berlin\n",
    "roster_order.json": '[{"Team":"ALP","Player":"alpha"}]',
  };
  const entries = Object.fromEntries(
    required.map((fileName) => [`database/${fileName}`, strToU8(fixture[fileName])]),
  );
  entries["database/keep-me.txt"] = strToU8("unrelated archive content");

  const unpacked = unzipSync(zipSync(entries, { level: 6 }));
  for (const fileName of required) {
    const path = Object.keys(unpacked).find((entryPath) => entryPath.split("/").at(-1)?.toLowerCase() === fileName.toLowerCase());
    assert.ok(path, `discovers ${fileName}`);
    assert.ok(unpacked[path].length > 0, `${fileName} is not empty`);
  }
  assert.match(strFromU8(unpacked["database/Players.csv"]).split("\n", 1)[0], /^Nick;Name;Surname;/);
  assert.equal(strFromU8(unpacked["database/keep-me.txt"]), "unrelated archive content");
});

test("preserves unrelated entries while replacing an edited table", () => {
  const entries = {
    "db/Players.csv": strToU8("Nick;Id\nalpha;alpha\n"),
    "db/keep.bin": new Uint8Array([1, 2, 3, 4]),
  };
  const unpacked = unzipSync(zipSync(entries));
  unpacked["db/Players.csv"] = strToU8("Nick;Id\nalpha;alpha\nbeta;beta\n");
  const exported = unzipSync(zipSync(unpacked));
  assert.match(strFromU8(exported["db/Players.csv"]), /beta;beta/);
  assert.deepEqual(Array.from(exported["db/keep.bin"]), [1, 2, 3, 4]);
});
