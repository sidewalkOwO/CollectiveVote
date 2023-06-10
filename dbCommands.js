module.exports = {
	init: function(db){
		dbCreateCard(db);
		dbCreateSubmission(db);
		dbCreateVote(db);
	}
	,vote(db, submissionId, voter, upOrDown){
		var sqlVote = "";
		sqlVote += "WITH RESULT AS (SELECT ";
		sqlVote += "cardName, type AS submissionType, createTime AS submissionCreateTime, ";
		sqlVote += "? AS voter, datetime('now') AS voteTime, ";
		sqlVote += "? AS upOrDown, ? AS optionalText, ";
		sqlVote += "FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) AS week ";
		sqlVote += "FROM Submission WHERE Submission.rowid=? ";
		
		sqlVote += "INSERT INTO VOTE ";
		sqlVote += "(cardName,submissionType,submissionCreateTime,voter,voteTime,upOrDown,optionalText,week)";
		sqlVote += "SELECT RESULT.* FROM RESULT ";
		//sqlVote += "LEFT JOIN Submission S ON RESULT. ";
		sqlVote += "createTime datetime,";
		sqlVote += "week integer,";
		sqlVote += "PRIMARY KEY (cardName) ";
		sqlVote += ")";

		sqlTable += "cardName varchar(100) not null,  ";
		sqlTable += "submissionType smallint not null,  ";
		sqlTable += "submissionCreateTime datetime,";
		sqlTable += "voter varchar(100),  ";
		sqlTable += "voteTime datetime,";
		sqlTable += "upOrDown integer,  ";
		sqlTable += "optionalText varchar(200),  ";
		sqlTable += "week integer,";

		db.run(sqlVote);
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
	sqlTable += "approved integer,";
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
	sqlTable += "optionalText varchar(200),  ";
	sqlTable += "createTime datetime,";
	sqlTable += "week integer,";
	sqlTable += "approved integer,";
	sqlTable += "FOREIGN KEY(cardName) REFERENCES Card(cardName),";
	sqlTable += "PRIMARY KEY (cardName, type, createTime) ";
	sqlTable += ")";
	db.run(sqlTable);
}

function dbCreateVote(db){
	var sqlTable = "";
	sqlTable += "create table if not exists Vote ( ";
	sqlTable += "cardName varchar(100) not null,  ";
	sqlTable += "submissionType smallint not null,  ";
	sqlTable += "submissionCreateTime datetime,";
	sqlTable += "voter varchar(100),  ";
	sqlTable += "voteTime datetime,";
	sqlTable += "upOrDown integer,  ";
	sqlTable += "optionalText varchar(200),  ";
	sqlTable += "week integer,";
	sqlTable += "FOREIGN KEY(cardName, submissionType, submissionCreateTime) ";
	sqlTable += "REFERENCES Submission(cardName, type, createTime),";
	sqlTable += "PRIMARY KEY (cardName, submissionType, submissionCreateTime, voter) ";
	sqlTable += ")";
	db.run(sqlTable);
}