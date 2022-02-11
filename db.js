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

      insert_user: function (con, username, callback) {
        con.query('INSERT INTO users(username) VALUES("' + username + '")', 
            function (error, results, fields){

                if (error){
                    console.log("error : ");
                    console.log("   " + error);
                    callback(err, null);
                } else {
                    con.query('SELECT id FROM users WHERE users.username = "' + username + '"', 
                    function (error, id_results, fields){
                        if (error){
                            console.log("error : ");
                            console.log("   " + error);
                            callback(err, null);
                        } else {
                            callback(null, id_results);
                        }
                    });
                }
            });
      },
      
      insert_record: function (con, userId, win) {
        con.query('INSERT INTO records(user_id, win) VALUES(' + userId + ', ' + win + ')', 
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
                    callback(err, null);
                } else {
                    callback(null, results);
                }
            });
      }
    }
  };