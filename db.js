const db = require('mysql2'); 

module.exports = function () {
    return {
      init: function () {
        return db.createConnection({
          host: 'localhost',
          user: 'root',
          password: 'password',
          database: 'snakegame'
        })
      },
      
      db_open: function (con) {
        con.connect(function (err) {
          if (err) {
            console.error('mysql connection error :' + err);
          } else {
            console.info('mysql is connected successfully.');
          }
        })
      },

      insert_user: function (con, username) {
        con.query('INSERT INTO users(username) VALUES("' + username + '")', 
            function (error, results, fields){
                if (error){
                    console.log(error);
                }
                console.log(results);
            });
      },
      
      insert_record: function (con, username, win) {
        con.query('INSERT INTO records(username, win) VALUES("' + username + '", ' + win + ')', 
            function (error, results, fields){
                if (error){
                    console.log(error);
                }
                console.log(results);
                res = results;
            });
      },

      select_all_user: function (con) {
        con.query('SELECT * FROM users', 
            function (error, results, fields){
                if (error){
                    console.log(error);
                }
                console.log(results);
            });
      },

      select_user: function (con, username, callback) {
        con.query('SELECT * FROM users WHERE users.username = "' + username + '"', 
            function (error, results, fields){
                if (error){
                    console.log("error : ");
                    console.log("   " + error);
                    callback(err, null);
                } else {
                    console.log("data : ");
                    console.log("   " + results);
                    callback(null, results);
                }
            });
      }
    }
  };