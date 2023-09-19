const { pool } = require('../connection');
module.exports = {
    auth: async (req, res) => {
        let conn, data;
        try {
            try {
                conn = await pool.getConnection();
                data = await conn.query("select kd_pj,aes_decrypt(usere,'nur') as user,aes_decrypt(passworde,'windi') as pass FROM password_asuransi");

            } finally {
                if (conn) conn.release(); //release to pool
            }
            console.log(data);
            let user = Buffer.from(data[0].user)
            let pass = Buffer.from(data[0].pass)
            let text = user.toString('utf8');
            let text2 = pass.toString('utf8');
            console.log(user);
            console.log(str); // This will print 
            return res.status(200).json({ message: 'success', text, text2 });
        } catch (err) {
            return res.status(500).json({ message: 'server Error' });
        }
    }
};