module.exports = {
	init: function(db){
		dbCreateCard(db);
		dbCreateSubmission(db);
	}
}

function dbCreateCard(db){
	var sqlTable = "";
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
}

function dbCreateSubmission(db){
	var sqlTable = "";
	sqlTable += "create table if not exists Submission ( ";
	sqlTable += "cardName varchar(100) not null,  ";
	sqlTable += "type smallint not null,  ";
	sqlTable += "link varchar(200) not null,  ";
	sqlTable += "linkBefore varchar(200),  ";
	sqlTable += "submitter varchar(100),  ";
	sqlTable += "optional_text varchar(200),  ";
	sqlTable += "createTime datetime,";
	sqlTable += "week integer,";
	sqlTable += "FOREIGN KEY(cardName) REFERENCES Card(cardName)";
	sqlTable += "PRIMARY KEY (cardName, type, createTime) ";
	sqlTable += ")";
	db.run(sqlTable);
}