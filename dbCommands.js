const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database("./epd.db");

module.exports = {
	init: function(){
		dbCreateCard();
		dbCreateSubmission();
		dbCreateVote();
	}
	,selectLink(cardName){
		var sqlCheck = "SELECT link FROM Card WHERE cardName=?";

		return new Promise((resolve, reject) => {
			db.get(sqlCheck, [cardName], (err, row) => {
				if(row && row["link"]){
					resolve(row["link"]);
				}
				else{
					reject();
				}
			});
		});
	}
	,insertSubmissionCard(cardName, type, link, creator, submitter, optionalText){
		return new Promise((resolve, reject) => {
			// transaction requires independent connection
			var _db = new sqlite3.Database("./epd.db");
	
			_db.serialize(function() {
				_db.run("BEGIN TRANSACTION");
	
				var sqlInsert = "";
				sqlInsert += "INSERT INTO Card (cardName,link,creator,submitter,createTime,week)";
				sqlInsert += " VALUES (?,?,?,?,datetime('now'), FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) ); ";
				_db.run(sqlInsert, [cardName, link, creator, submitter]);
	
				var sqlInsert = "INSERT INTO Submission (cardName,type,link,linkBefore,submitter,optionalText,createTime,week)";
				sqlInsert += " VALUES (?,?,?,?,?,?,datetime('now'), FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) ) ";
				_db.run(sqlInsert, [cardName, type, link, null, submitter, optionalText]);
	
				_db.get("SELECT LAST_INSERT_ROWID() AS insertId", (err, row) => {
					_db.run("COMMIT");
					
					if(row && row["insertId"]){
						resolve(row["insertId"]);
					}
					else{
						reject();
					}
				});
			});
		});
	}
	,insertSubmissionUpdate(cardName, type, link, linkBefore, submitter, optionalText){
		return new Promise((resolve, reject) => {
			// transaction requires independent connection
			var _db = new sqlite3.Database("./epd.db");
	
			_db.serialize(function() {
				_db.run("BEGIN TRANSACTION");
	
				var sqlInsert = "WITH RESULT AS (SELECT ? AS cardName, ? AS type, ? AS link";
				sqlInsert += ",? AS linkBefore,? AS submitter,? AS optionalText";
				sqlInsert += ",datetime('now') AS createTime, FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) AS week )";
				sqlInsert += "INSERT INTO Submission (cardName,type,link,linkBefore,submitter,optionalText,createTime,week)";
				sqlInsert += "SELECT * FROM RESULT ";
				sqlInsert += "WHERE NOT EXISTS (SELECT 1 FROM Submission S WHERE S.type=RESULT.type AND S.link=RESULT.link AND S.week=RESULT.week) ";
				_db.run(sqlInsert, [cardName, type, link, linkBefore, submitter, optionalText]);
	
				_db.get("SELECT LAST_INSERT_ROWID() AS insertId", (err, row) => {
					_db.run("COMMIT");
					
					if(row && row["insertId"]){
						resolve(row["insertId"]);
					}
					else{
						reject();
					}
				});
			});
		});
	}
	,vote(submissionId, voter, upOrDown){
		var sqlVote = "";
		sqlVote += "WITH RESULT AS (SELECT ";
		sqlVote += "cardName, type AS submissionType, createTime AS submissionCreateTime, ";
		sqlVote += "? AS voter, datetime('now') AS voteTime, ";
		sqlVote += "? AS upOrDown, NULL AS comment, ";
		sqlVote += "FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) AS week ";
		sqlVote += "FROM Submission WHERE Submission.rowid=?) ";
		
		sqlVote += "INSERT INTO VOTE ";
		sqlVote += "(cardName,submissionType,submissionCreateTime,voter,voteTime,upOrDown,comment,week)";
		sqlVote += "SELECT RESULT.* FROM RESULT ";
		sqlVote += "INNER JOIN Submission S ON S.rowid=? AND S.week=RESULT.week ";
		
		sqlVote += "ON CONFLICT(cardName,submissionType,submissionCreateTime,voter) DO UPDATE SET ";
		sqlVote += "upOrDown=excluded.upOrDown ";

		db.run(sqlVote, [voter, upOrDown, submissionId, submissionId]);
	}
	,voteComment(submissionId, voter, comment){
		var sqlVote = "";
		sqlVote += "WITH RESULT AS (SELECT ";
		sqlVote += "cardName, type AS submissionType, createTime AS submissionCreateTime, ";
		sqlVote += "? AS voter, datetime('now') AS voteTime, ";
		sqlVote += "? AS upOrDown, NULL AS comment, ";
		sqlVote += "FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) AS week ";
		sqlVote += "FROM Submission WHERE Submission.rowid=?) ";
		
		sqlVote += "INSERT INTO VOTE ";
		sqlVote += "(cardName,submissionType,submissionCreateTime,voter,voteTime,upOrDown,comment,week)";
		sqlVote += "SELECT RESULT.* FROM RESULT ";
		sqlVote += "INNER JOIN Submission S ON S.rowid=? AND S.week=RESULT.week ";
		
		sqlVote += "ON CONFLICT(cardName,submissionType,submissionCreateTime,voter) DO UPDATE SET ";
		sqlVote += "upOrDown=excluded.upOrDown ";

		db.run(sqlVote, [voter, upOrDown, submissionId, submissionId]);
	}
}

function dbCreateCard(){
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

function dbCreateSubmission(){
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

function dbCreateVote(){
	var sqlTable = "";
	sqlTable += "create table if not exists Vote ( ";
	sqlTable += "cardName varchar(100) not null,  ";
	sqlTable += "submissionType smallint not null,  ";
	sqlTable += "submissionCreateTime datetime,";
	sqlTable += "voter varchar(100),  ";
	sqlTable += "voteTime datetime,";
	sqlTable += "upOrDown integer,  ";
	sqlTable += "comment varchar(200),  ";
	sqlTable += "week integer,";
	sqlTable += "FOREIGN KEY(cardName, submissionType, submissionCreateTime) ";
	sqlTable += "REFERENCES Submission(cardName, type, createTime),";
	sqlTable += "PRIMARY KEY (cardName, submissionType, submissionCreateTime, voter) ";
	sqlTable += ")";
	db.run(sqlTable);
}