require("dotenv").config();
const jwt = require('jsonwebtoken');
const { pool } = require('../connection');
const secretKey = process.env.TOKEN_SECRET;

module.exports = {
    auth: async (req, res) => {
        let conn, data;
        try {
            //get header
            let username = req.headers['x-username'];
            let password = req.headers['x-password'];
            console.log(username);
            if (!username || !password) {
                return res.status(400).json({ message: 'username dan password harus diisi' });
            }
            try {
                conn = await pool.getConnection();
                data = await conn.query("select kd_pj,aes_decrypt(usere,'nur') as user,aes_decrypt(passworde,'windi') as pass FROM password_asuransi");
            } finally {
                if (conn) conn.release(); //release to pool
            }
            let user = Buffer.from(data[0].user).toString('utf8');
            let pass = Buffer.from(data[0].pass).toString('utf8');
            if (username !== user || password !== pass) {
                return res.status(400).json({ message: 'username atau password salah' });
            }
            let token = jwt.sign({
                username: username
            }, secretKey, { expiresIn: '1h' });


            return res.status(200).json(
                {
                    "response": {
                        "token": token
                    },
                    "metadata": {
                        "message": "Ok",
                        "code": 200
                    }
                }
            );
        } catch (err) {
            return res.status(500).json({ message: 'server Error' });
        }
    },
    statusantrean: async (req, res) => {
        let conn, data;
        try {
            let { kodepoli, kodedokter, tanggalperiksa, jampraktek } = req.body;
            if (!kodepoli || !kodedokter || !tanggalperiksa || !jampraktek) {
                return res.status(400).json({ message: 'kodepoli, kodedokter, tanggalperiksa, jampraktek harus diisi' });
            }
            //convert tanggalperiksa to hari
            let tgl = new Date(tanggalperiksa);
            let hari = tgl.getDay();
            if (hari === 0) {
                hari = 'Minggu';
            }
            if (hari === 1) {
                hari = 'Senin';
            }
            if (hari === 2) {
                hari = 'Selasa';
            }
            if (hari === 3) {
                hari = 'Rabu';
            }
            if (hari === 4) {
                hari = 'Kamis';
            }
            if (hari === 5) {
                hari = 'Jumat';
            }
            if (hari === 6) {
                hari = 'Sabtu';
            }
            console.log(hari);
            let kdpoli, kddokter, kouta, data;
            let jammulai = jampraktek.substring(0, 5);
            let jamselesai = jampraktek.substring(6, 11);
            try {
                conn = await pool.getConnection();
                kdpoli = await conn.query(`SELECT kd_poli_rs FROM maping_poli_bpjs WHERE kd_poli_bpjs='${kodepoli}'`);
                kddokter = await conn.query(`SELECT kd_dokter FROM maping_dokter_dpjpvclaim WHERE kd_dokter_bpjs='${kodedokter}'`);
                kouta = await conn.query(`SELECT kuota FROM jadwal WHERE kd_dokter='${kddokter[0].kd_dokter}' AND hari_kerja='${hari}' AND jam_mulai='${jammulai}:00' AND jam_selesai='${jamselesai}:00'`);
            } finally {
                if (conn) conn.release(); //release to pool
            }
            console.log(kouta);
            if (kouta.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Pendaftaran ke Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            try {
                conn = await pool.getConnection();
                data = await conn.query(`SELECT poliklinik.nm_poli,COUNT(reg_periksa.kd_poli) as total_antrean,dokter.nm_dokter,
                IFNULL(SUM(CASE WHEN reg_periksa.stts ='Belum' THEN 1 ELSE 0 END),0) as sisa_antrean,
                ('Datanglah Minimal 30 Menit, jika no antrian anda terlewat, silakan konfirmasi ke bagian Pendaftaran atau Perawat Poli, Terima Kasih ..') as keterangan
                FROM reg_periksa INNER JOIN poliklinik ON poliklinik.kd_poli=reg_periksa.kd_poli INNER JOIN dokter ON reg_periksa.kd_dokter=dokter.kd_dokter
                WHERE reg_periksa.tgl_registrasi='${tanggalperiksa}' AND reg_periksa.kd_poli='${kdpoli[0].kd_poli_rs}' and reg_periksa.kd_dokter='${kddokter[0].kd_dokter}' 
                and jam_reg between '${jammulai}:00' and '${jamselesai}:00'`);
            } finally {
                if (conn) conn.release(); //release to pool
            }
            console.log(data);
            if (data.length === 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Pendaftaran ke Poli ini tidak tersedia',
                            'code': 201
                        }
                    }
                );
            }
            if (data[0].sisa_antrean == 0) {
                return res.status(200).json(
                    {
                        "metadata": {
                            'message': 'Maaf belum ada antrian ditanggal ' + tanggalperiksa + ' jam ' + jampraktek,
                            'code': 201
                        }
                    }
                );
            }
            try {
                conn = await pool.getConnection();
                data[0].no_reg = await conn.query(`select reg_periksa.no_reg from reg_periksa where reg_periksa.stts='Belum' and reg_periksa.kd_dokter='${kddokter[0].kd_dokter}' and reg_periksa.kd_poli='${kdpoli[0].kd_poli_rs}' and reg_periksa.tgl_registrasi='${tanggalperiksa}' order by CONVERT(RIGHT(reg_periksa.no_reg,3),signed) limit 1`);
            } finally {
                if (conn) conn.release(); //release to pool
            }
            console.log(data[0].no_reg);
            return res.status(200).json(
                {
                    "response": {
                        "namapoli": data[0].nm_poli,
                        "namadokter": data[0].nm_dokter,
                        "totalantrean": data[0].total_antrean,
                        "sisaantrean": data[0].sisa_antrean,
                        "antreanpanggil": `${kodepoli}-${data[0].no_reg[0].no_reg}`,
                        "sisakuotajkn": parseInt(kouta[0].kuota - data[0].total_antrean),
                        "kuotajkn": parseInt(kouta[0].kuota),
                        "sisakuotanonjkn": parseInt(kouta[0].kuota - data[0].total_antrean),
                        "kuotanonjkn": parseInt(kouta[0].kuota),
                        "keterangan": data[0].keterangan

                    },
                    "metadata": {
                        "message": "Ok",
                        "code": 200
                    }
                }
            );
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'server Error' });
        }
    }
};
// 'metadata' => array(
//     'message' => 'Service tidak terdaftar',
//     'code' => 201
// )