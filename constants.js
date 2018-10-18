var _ = require('lodash');
var vars = {
  '_password_min': 6,
  '_regex_name_of_modules': '[a-zA-Z0-9_]',
  '_regex_type_of_modules': '(user|general|gps)',
  '_regex_type_of_fields': '(A|S|N|B|D|O|R|L|M|T|PP|PL|TO|AO|AN|ON)',
  '_regex_type_of_indexes': '(UNIQUE|INDEX|2DSPHERE)'
};
_.forEach(vars, (v, i) => {
  global[i] = v;
});
/*
A array
S string
N number
B boolean
D date
O object
R 
L
M Maquina de Estados
T
PP Point
PL Polygon
TO toObject
AO arrayObject
AN arrayNormal
ON objectNormal



*/