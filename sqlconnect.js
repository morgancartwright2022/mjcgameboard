class DatabaseConnector {
    constructor(dbClient) {
        this.dbClient = dbClient;
    }

    fetchUsers(callback) {
        this.dbClient.query('SELECT username FROM users', (err, res) => {
          if(err) console.log(err);
          else callback(res.rows);
        });
    }
}

exports.DatabaseConnector = DatabaseConnector;