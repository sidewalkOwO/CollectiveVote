var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database("./epd.db");

/*db.each("SELECT * FROM Card WHERE cardName=? AND submitter=?", ["Fortune Dragon", "379673471862571008"], (err, row) => {
	console.log(JSON.stringify(row));
});*/

/*db.get("SELECT cardName FROM Card WHERE cardName=?", ["Fortune Dragon"], (err, row) => {
	console.log("a " + JSON.stringify(row));
});*/

/*db.each("SELECT * FROM vote", (err, row) => {
	console.log(JSON.stringify(row));
});*/

db.run("drop table IF EXISTS Card");
db.run("drop table IF EXISTS Submission");
db.run("drop table IF EXISTS Vote");

/*var sqlTable = "";
sqlTable += "create table if not exists Card ( ";
sqlTable += "cardName varchar(100) not null,  ";
sqlTable += "link varchar(200) not null,  ";
sqlTable += "creator varchar(100),  ";
sqlTable += "submitter varchar(100),  ";
sqlTable += "createTime datetime,";
sqlTable += "week integer,";
sqlTable += "PRIMARY KEY (cardName) ";
sqlTable += ")";
db.run(sqlTable);

var sqlTable = "";
sqlTable += "create table if not exists Submission ( ";
sqlTable += "cardName varchar(100) not null,  ";
sqlTable += "type smallint not null,  ";
sqlTable += "link varchar(200) not null,  ";
sqlTable += "linkBefore varchar(200),  ";
sqlTable += "submitter varchar(100),  ";
sqlTable += "optionalText varchar(200),  ";
sqlTable += "createTime datetime,";
sqlTable += "week integer,";
sqlTable += "FOREIGN KEY(cardName) REFERENCES Card(cardName)";
sqlTable += "PRIMARY KEY (cardName, type, createTime) ";
sqlTable += ")";
db.run(sqlTable);

/*db.get("SELECT strftime('%w', date('2018-04-04'))", (err, row) => {
	console.log(JSON.stringify(row));
});

db.get("SELECT (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-04')))/7", (err, row) => {
	console.log(JSON.stringify(row));
});*/

/*db.get("SELECT FLOOR( (JULIANDAY(date('2023-06-08')) - JULIANDAY(date('2018-04-05')))/7 )", (err, row) => {
	console.log(JSON.stringify(row));
});*/